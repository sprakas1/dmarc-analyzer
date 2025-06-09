from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import uvicorn
from datetime import datetime
import json
import uuid
import os
import logging
import asyncio
from pydantic import BaseModel
import jwt
import base64

from config import get_supabase_client
from dmarc_parser import parse_dmarc_xml
from dmarc_ingest import store_dmarc_report, connect_imap, log_audit_event
from auth import get_current_user, get_optional_user, require_admin
from scheduler import trigger_manual_processing, scheduler, start_background_scheduler

app = FastAPI(
    title="DMARC Analyzer API",
    description="API for DMARC report analysis and management",
    version="1.0.0"
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Start the background scheduler when the application starts"""
    logger.info("Starting DMARC automated scheduler on application startup")
    start_background_scheduler()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "http://127.0.0.1:3000",  # Alternative local address
        "https://dmarc.sharanprakash.me",  # Production frontend domain
        "https://sharanprakash.me",  # Main domain (if needed)
        "http://localhost:5173",  # Vite dev server (if used)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint (no /v1 prefix for health checks)
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# API v1 routes
@app.get("/api/v1/analytics/summary")
async def get_analytics_summary(user = Depends(get_current_user)):
    """Get analytics summary for the user"""
    try:
        supabase = get_supabase_client(user.get('access_token'))
        
        # Get reports for this user
        reports_result = supabase.table('dmarc_reports').select('id,total_records,pass_count,fail_count').eq('user_id', user['id']).execute()
        
        if not reports_result.data:
            return {
                "summary": {
                    "total_reports": 0,
                    "total_records": 0,
                    "pass_count": 0,
                    "fail_count": 0,
                    "pass_rate": 0
                }
            }
        
        total_reports = len(reports_result.data)
        total_records = sum(report['total_records'] or 0 for report in reports_result.data)
        pass_count = sum(report['pass_count'] or 0 for report in reports_result.data)
        fail_count = sum(report['fail_count'] or 0 for report in reports_result.data)
        
        pass_rate = (pass_count / total_records * 100) if total_records > 0 else 0
        
        return {
            "summary": {
                "total_reports": total_reports,
                "total_records": total_records,
                "pass_count": pass_count,
                "fail_count": fail_count,
                "pass_rate": round(pass_rate, 2)
            }
        }
    except Exception as e:
        logger.error(f"Error fetching analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/reports")
async def get_reports(user = Depends(get_current_user)):
    """Get DMARC reports for the user"""
    try:
        supabase = get_supabase_client(user.get('access_token'))
        result = supabase.table('dmarc_reports').select('*').eq('user_id', user['id']).order('created_at', desc=True).execute()
        return {"reports": result.data}
    except Exception as e:
        logger.error(f"Error fetching reports: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/reports/{report_id}")
async def get_report(report_id: str, user = Depends(get_current_user)):
    """Get a specific DMARC report with its records"""
    try:
        supabase = get_supabase_client(user.get('access_token'))
        
        # Get report
        report_result = supabase.table('dmarc_reports').select('*').eq('id', report_id).eq('user_id', user['id']).single().execute()
        
        if not report_result.data:
            raise HTTPException(status_code=404, detail="Report not found")
            
        report = report_result.data
        
        # Get records for this report
        records_result = supabase.table('dmarc_records').select('*').eq('report_id', report_id).execute()
        report['records'] = records_result.data
        
        return {"report": report}
    except Exception as e:
        logger.error(f"Error fetching report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/imap-configs")
async def get_imap_configs(user = Depends(get_current_user)):
    """Get IMAP configurations for the user"""
    try:
        supabase = get_supabase_client(user.get('access_token'))
        result = supabase.table('imap_configs').select('id,name,host,port,username,use_ssl,folder,is_active,last_polled_at,created_at').eq('user_id', user['id']).execute()
        return {"configs": result.data}
    except Exception as e:
        logger.error(f"Error fetching IMAP configs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/imap-configs")
async def create_imap_config(config_data: dict, user = Depends(get_current_user)):
    """Create a new IMAP configuration"""
    try:
        # Check rate limits before attempting IMAP connection
        from rate_limiter import get_imap_rate_limiter
        rate_limiter = get_imap_rate_limiter()
        
        is_limited, reason, retry_after = rate_limiter.is_rate_limited(user['id'])
        if is_limited:
            logger.warning(f"Rate limited IMAP config creation for user {user['id']}: {reason}")
            raise HTTPException(
                status_code=429,
                detail=f"Rate limited: {reason}. Retry after {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)}
            )
        
        supabase = get_supabase_client(user.get('access_token'))
        
        # Validate required fields
        required_fields = ['name', 'host', 'username', 'password']
        for field in required_fields:
            if not config_data.get(field):
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Test IMAP connection before saving
        success = False
        config_name = config_data.get('name', f"{config_data['username']}@{config_data['host']}")
        try:
            test_client = connect_imap(
                host=config_data['host'],
                username=config_data['username'],
                password=config_data['password'],
                port=config_data.get('port', 993),
                use_ssl=config_data.get('use_ssl', True),
                user_id=user['id'],
                config_name=config_name
            )
            # Test folder access
            test_client.select_folder(config_data.get('folder', 'INBOX'))
            test_client.logout()
            logger.info(f"IMAP connection test successful for {config_data['host']}")
            success = True
        except Exception as e:
            logger.error(f"IMAP connection test failed: {str(e)}")
            success = False
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to connect to IMAP server: {str(e)}"
            )
        finally:
            # Record the attempt in rate limiter
            rate_limiter.record_attempt(user['id'], success, config_name)
        
        # Extract password and encrypt it securely with AES-256-GCM
        password = config_data.pop('password')
        
        # Import encryption module
        from crypto import get_credential_encryption
        encryption = get_credential_encryption()
        
        # Encrypt password securely
        password_encrypted, encryption_key_id = encryption.encrypt_credential(password)
        
        # Set defaults and add encrypted password
        config_data.update({
            'user_id': user['id'],
            'password_encrypted': password_encrypted,
            'encryption_key_id': encryption_key_id,
            'port': config_data.get('port', 993),
            'use_ssl': config_data.get('use_ssl', True),
            'folder': config_data.get('folder', 'INBOX'),
            'is_active': True
        })
        
        result = supabase.table('imap_configs').insert(config_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create IMAP configuration")
        
        return {"config": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating IMAP config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/imap-configs/{config_id}")
async def update_imap_config(config_id: str, config_data: dict, user = Depends(get_current_user)):
    """Update an existing IMAP configuration"""
    try:
        supabase = get_supabase_client(user.get('access_token'))
        
        # Verify ownership
        existing = supabase.table('imap_configs').select('id').eq('id', config_id).eq('user_id', user['id']).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="IMAP configuration not found")
        
        # Handle password update if provided
        if 'password' in config_data and config_data['password']:
            password = config_data.pop('password')
            
            # Import encryption module
            from crypto import get_credential_encryption
            encryption = get_credential_encryption()
            
            # Encrypt password securely
            password_encrypted, encryption_key_id = encryption.encrypt_credential(password)
            config_data['password_encrypted'] = password_encrypted
            config_data['encryption_key_id'] = encryption_key_id
        elif 'password' in config_data:
            # Remove empty password field to avoid updating with empty value
            config_data.pop('password')
        
        # Remove user_id from update data to prevent tampering
        config_data.pop('user_id', None)
        config_data.pop('id', None)
        
        result = supabase.table('imap_configs').update(config_data).eq('id', config_id).eq('user_id', user['id']).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update IMAP configuration")
        
        return {"config": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating IMAP config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/imap-configs/{config_id}")
async def delete_imap_config(config_id: str, user = Depends(get_current_user)):
    """Delete an IMAP configuration"""
    try:
        supabase = get_supabase_client(user.get('access_token'))
        
        # Verify ownership
        existing = supabase.table('imap_configs').select('id').eq('id', config_id).eq('user_id', user['id']).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="IMAP configuration not found")
        
        result = supabase.table('imap_configs').delete().eq('id', config_id).eq('user_id', user['id']).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to delete IMAP configuration")
        
        return {"message": "IMAP configuration deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting IMAP config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/process-emails/{config_id}")
async def process_emails(config_id: str, user = Depends(get_current_user)):
    """Process emails for a specific IMAP configuration"""
    try:
        # Check rate limits before processing
        from rate_limiter import get_imap_rate_limiter
        rate_limiter = get_imap_rate_limiter()
        
        is_limited, reason, retry_after = rate_limiter.is_rate_limited(user['id'])
        if is_limited:
            logger.warning(f"Rate limited email processing for user {user['id']}: {reason}")
            raise HTTPException(
                status_code=429,
                detail=f"Rate limited: {reason}. Retry after {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)}
            )
        
        supabase = get_supabase_client(user.get('access_token'))
        
        # Verify ownership
        config_result = supabase.table('imap_configs').select('*').eq('id', config_id).eq('user_id', user['id']).execute()
        if not config_result.data:
            raise HTTPException(status_code=404, detail="IMAP configuration not found")
        
        config = config_result.data[0]
        
        # Decrypt password
        if config.get('password_encrypted') and config.get('encryption_key_id'):
            try:
                from crypto import get_credential_encryption
                encryption = get_credential_encryption()
                config['password'] = encryption.decrypt_credential(
                    config['password_encrypted'], 
                    config['encryption_key_id']
                )
            except Exception as e:
                logger.error(f"Failed to decrypt password: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to decrypt password")
        elif config.get('password_encrypted'):
            # Legacy base64 decryption for backward compatibility
            try:
                config['password'] = base64.b64decode(config['password_encrypted']).decode()
                logger.warning(f"Using legacy base64 decryption for config {config['id']}")
            except Exception as e:
                logger.error(f"Failed to decrypt legacy password: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to decrypt password")
        else:
            raise HTTPException(status_code=400, detail="No password configured for this IMAP configuration")
        
        # Import here to avoid circular imports
        from dmarc_ingest import process_dmarc_ingestion
        
        # Process emails with authenticated context
        result = process_dmarc_ingestion(user['id'], config, access_token=user.get('access_token'))
        
        return {
            "message": f"Email processing completed for {config['name']}",
            "status": "success",
            "processed_count": result.get('processed', 0),
            "error_count": result.get('errors', 0)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing emails: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/user/trigger-my-processing")
async def trigger_user_processing(user = Depends(get_current_user)):
    """Manually trigger email processing for the current user's active IMAP configurations"""
    try:
        logger.info(f"User {user['email']} triggered manual processing for their configs")
        
        supabase = get_supabase_client(user.get('access_token'))
        
        # Get active IMAP configs for this user
        configs_result = supabase.table('imap_configs').select('*').eq('user_id', user['id']).eq('is_active', True).execute()
        
        if not configs_result.data:
            return {
                "message": "No active IMAP configurations found",
                "processed_configs": 0
            }
        
        # Process each config
        results = []
        for config in configs_result.data:
            try:
                # Decrypt password
                if config.get('password_encrypted') and config.get('encryption_key_id'):
                    from crypto import get_credential_encryption
                    encryption = get_credential_encryption()
                    config['password'] = encryption.decrypt_credential(
                        config['password_encrypted'], 
                        config['encryption_key_id']
                    )
                elif config.get('password_encrypted'):
                    # Legacy base64 decryption for backward compatibility
                    config['password'] = base64.b64decode(config['password_encrypted']).decode()
                    logger.warning(f"Using legacy base64 decryption for config {config['id']}")
                else:
                    continue
                
                from dmarc_ingest import process_dmarc_ingestion
                result = process_dmarc_ingestion(user['id'], config, access_token=user.get('access_token'))
                
                results.append({
                    "config_name": config['name'],
                    "status": "success",
                    "processed": result.get('processed', 0),
                    "errors": result.get('errors', 0)
                })
                
            except Exception as e:
                logger.error(f"Error processing config {config['name']}: {str(e)}")
                results.append({
                    "config_name": config['name'],
                    "status": "error",
                    "error": str(e)
                })
        
        total_processed = sum(r.get('processed', 0) for r in results if r['status'] == 'success')
        
        return {
            "message": "Processing completed",
            "processed_configs": len(results),
            "total_processed": total_processed,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error triggering user processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Rate limiting endpoints
@app.get("/api/v1/rate-limits/status")
async def get_rate_limit_status(user = Depends(get_current_user)):
    """Get rate limiting status for the current user"""
    try:
        from rate_limiter import get_imap_rate_limiter
        rate_limiter = get_imap_rate_limiter()
        
        user_stats = rate_limiter.get_user_stats(user['id'])
        
        return {
            "user_id": user['id'],
            "rate_limits": user_stats,
            "message": "Current rate limiting status"
        }
    except Exception as e:
        logger.error(f"Error fetching rate limit status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/admin/rate-limits/global")
async def get_global_rate_limits(user = Depends(require_admin)):
    """Get global rate limiting statistics (admin only)"""
    try:
        from rate_limiter import get_imap_rate_limiter
        rate_limiter = get_imap_rate_limiter()
        
        global_stats = rate_limiter.get_global_stats()
        
        return {
            "global_statistics": global_stats,
            "message": "Global rate limiting statistics"
        }
    except Exception as e:
        logger.error(f"Error fetching global rate limits: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/admin/rate-limits/reset/{user_id}")
async def reset_user_rate_limits(user_id: str, admin_user = Depends(require_admin)):
    """Reset rate limits for a specific user (admin only)"""
    try:
        from rate_limiter import get_imap_rate_limiter
        rate_limiter = get_imap_rate_limiter()
        
        had_limits = rate_limiter.reset_user_limits(user_id)
        
        # Log admin action
        log_audit_event(
            get_supabase_client(admin_user.get('access_token')),
            admin_user['id'],
            'rate_limits_reset',
            'user',
            user_id,
            {'admin_user': admin_user['id'], 'target_user': user_id}
        )
        
        return {
            "message": f"Rate limits {'reset' if had_limits else 'were already clear'} for user {user_id}",
            "had_limits": had_limits
        }
    except Exception as e:
        logger.error(f"Error resetting user rate limits: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 