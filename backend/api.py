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
from dmarc_ingest import store_dmarc_report, connect_imap
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
        "http://127.0.0.1:3000",
        "https://dmarc.sharanprakash.me",  # Production frontend domain
        "https://sharanprakash.me"  # Main domain (if needed)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/parse-dmarc")
async def parse_dmarc(xml_content: dict, user = Depends(get_current_user)):
    """Parse DMARC XML and store in database"""
    try:
        xml_data = xml_content.get("xml_data", "").encode('utf-8')
        if not xml_data:
            raise HTTPException(status_code=400, detail="No XML data provided")
        
        # Parse the XML
        report_data = parse_dmarc_xml(xml_data)
        
        # Store in database with authenticated client
        supabase = get_supabase_client(user.get('access_token'))
        
        logger.info(f"Storing DMARC report for user: {user['id']}")
        
        # Store the parsed report
        report_id = store_dmarc_report(supabase, user['id'], None, report_data)
        
        return {
            "message": "DMARC report parsed and stored successfully",
            "report_id": report_id,
            "summary": {
                "org_name": report_data['org_name'],
                "domain": report_data['domain'],
                "total_records": report_data['total_records'],
                "pass_count": report_data['pass_count'],
                "fail_count": report_data['fail_count']
            }
        }
    except Exception as e:
        logger.error(f"Error parsing DMARC report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reports")
async def get_reports(user = Depends(get_current_user)):
    """Get DMARC reports for the authenticated user"""
    try:
        supabase = get_supabase_client(user.get('access_token'))
        result = supabase.table('dmarc_reports').select('*').eq('user_id', user['id']).order('created_at', desc=True).execute()
        return {"reports": result.data}
    except Exception as e:
        logger.error(f"Error fetching reports: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reports/{report_id}")
async def get_report(report_id: str, user = Depends(get_current_user)):
    """Get a specific DMARC report with its records"""
    try:
        supabase = get_supabase_client(user.get('access_token'))
        
        # Get report
        report_result = supabase.table('dmarc_reports').select('*').eq('id', report_id).eq('user_id', user['id']).execute()
        if not report_result.data:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Get records
        records_result = supabase.table('dmarc_records').select('*').eq('report_id', report_id).execute()
        
        report = report_result.data[0]
        report['records'] = records_result.data
        
        return {"report": report}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/summary")
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

@app.get("/api/imap-configs")
async def get_imap_configs(user = Depends(get_current_user)):
    """Get IMAP configurations for the user"""
    try:
        supabase = get_supabase_client(user.get('access_token'))
        result = supabase.table('imap_configs').select('id,name,host,port,username,use_ssl,folder,is_active,last_polled_at,created_at').eq('user_id', user['id']).execute()
        return {"configs": result.data}
    except Exception as e:
        logger.error(f"Error fetching IMAP configs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/imap-configs")
async def create_imap_config(config_data: dict, user = Depends(get_current_user)):
    """Create a new IMAP configuration"""
    try:
        supabase = get_supabase_client(user.get('access_token'))
        
        # Validate required fields
        required_fields = ['name', 'host', 'username', 'password']
        for field in required_fields:
            if not config_data.get(field):
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Test IMAP connection before saving
        try:
            test_client = connect_imap(
                host=config_data['host'],
                username=config_data['username'],
                password=config_data['password'],
                port=config_data.get('port', 993),
                use_ssl=config_data.get('use_ssl', True)
            )
            # Test folder access
            test_client.select_folder(config_data.get('folder', 'INBOX'))
            test_client.logout()
            logger.info(f"IMAP connection test successful for {config_data['host']}")
        except Exception as e:
            logger.error(f"IMAP connection test failed: {str(e)}")
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to connect to IMAP server: {str(e)}"
            )
        
        # Extract password and encode it (basic encoding for now - consider stronger encryption for production)
        password = config_data.pop('password')
        password_encrypted = base64.b64encode(password.encode()).decode()
        
        # Set defaults and add encrypted password
        config_data.update({
            'user_id': user['id'],
            'password_encrypted': password_encrypted,
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

@app.put("/api/imap-configs/{config_id}")
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
            config_data['password_encrypted'] = base64.b64encode(password.encode()).decode()
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

@app.delete("/api/imap-configs/{config_id}")
async def delete_imap_config(config_id: str, user = Depends(get_current_user)):
    """Delete an IMAP configuration"""
    try:
        supabase = get_supabase_client(user.get('access_token'))
        
        # Verify ownership and delete
        result = supabase.table('imap_configs').delete().eq('id', config_id).eq('user_id', user['id']).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="IMAP configuration not found")
        
        return {"message": "IMAP configuration deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting IMAP config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process-emails/{config_id}")
async def process_emails(config_id: str, user = Depends(get_current_user)):
    """Process emails for a specific IMAP configuration"""
    try:
        supabase = get_supabase_client(user.get('access_token'))
        
        # Verify ownership
        config_result = supabase.table('imap_configs').select('*').eq('id', config_id).eq('user_id', user['id']).execute()
        if not config_result.data:
            raise HTTPException(status_code=404, detail="IMAP configuration not found")
        
        config = config_result.data[0]
        
        # Decrypt password
        if config.get('password_encrypted'):
            try:
                config['password'] = base64.b64decode(config['password_encrypted']).decode()
            except Exception as e:
                logger.error(f"Failed to decrypt password: {str(e)}")
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

@app.get("/api/user/profile")
async def get_user_profile(user = Depends(get_current_user)):
    """Get user profile information"""
    try:
        supabase = get_supabase_client(user.get('access_token'))
        result = supabase.table('profiles').select('*').eq('id', user['id']).execute()
        
        if result.data:
            return {"profile": result.data[0]}
        else:
            # Return basic profile from token
            return {
                "profile": {
                    "id": user['id'],
                    "email": user['email']
                }
            }
    except Exception as e:
        logger.error(f"Error fetching user profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Legacy test endpoints (for backward compatibility during transition)
@app.post("/api/test/auth")
async def test_auth_legacy(credentials: dict):
    """Legacy test authentication endpoint - deprecated"""
    logger.warning("Legacy test auth endpoint used - please migrate to Supabase auth")
    raise HTTPException(
        status_code=410, 
        detail="Legacy authentication deprecated. Please use Supabase authentication."
    )

@app.post("/api/test/parse-dmarc")
async def test_parse_dmarc_legacy(xml_content: dict, user = Depends(get_current_user)):
    """Legacy test endpoint - redirect to main parse endpoint"""
    logger.warning("Legacy test parse endpoint used - redirecting to main endpoint")
    return await parse_dmarc(xml_content, user)

@app.post("/api/admin/trigger-daily-processing")
async def trigger_daily_processing(user = Depends(require_admin)):
    """Manually trigger daily email processing for all active IMAP configurations (Admin only)"""
    try:
        logger.info(f"Admin user {user['email']} triggered manual daily processing")
        
        # Run the processing in a background task to avoid timeout
        import threading
        processing_thread = threading.Thread(target=trigger_manual_processing, daemon=True)
        processing_thread.start()
        
        return {
            "message": "Daily email processing has been triggered",
            "status": "started",
            "note": "Processing is running in the background. Check logs for progress."
        }
        
    except Exception as e:
        logger.error(f"Error triggering daily processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/scheduler-status")
async def get_scheduler_status(user = Depends(require_admin)):
    """Get the current status of the automated scheduler (Admin only)"""
    try:
        return {
            "scheduler_running": scheduler.is_running,
            "next_scheduled_run": "Daily at 2:00 AM",
            "last_manual_trigger": "Check application logs"
        }
        
    except Exception as e:
        logger.error(f"Error getting scheduler status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/trigger-my-processing")
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
                if config.get('password_encrypted'):
                    config['password'] = base64.b64decode(config['password_encrypted']).decode()
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
        success_count = len([r for r in results if r['status'] == 'success'])
        
        return {
            "message": f"Processing completed for {len(configs_result.data)} configurations",
            "processed_configs": success_count,
            "total_emails_processed": total_processed,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error in user processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 