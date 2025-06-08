import asyncio
import logging
import schedule
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any
import base64
import threading
import os

from config import get_supabase_client
from dmarc_ingest import process_dmarc_ingestion

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DmarcScheduler:
    """Automated DMARC email processing scheduler"""
    
    def __init__(self):
        self.is_running = False
        self.scheduler_thread = None
        
    def get_active_imap_configs(self) -> List[Dict[str, Any]]:
        """Get all active IMAP configurations for all users"""
        try:
            # Use service role for accessing all configs
            supabase = get_supabase_client(use_service_role=True)
            
            # Get all active IMAP configs with user profiles
            result = supabase.table('imap_configs').select(
                'id, user_id, name, host, port, username, password_encrypted, use_ssl, folder, last_polled_at, profiles(email)'
            ).eq('is_active', True).execute()
            
            logger.info(f"Found {len(result.data)} active IMAP configurations")
            return result.data
            
        except Exception as e:
            logger.error(f"Error fetching active IMAP configs: {e}")
            return []
    
    def process_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Process emails for a single IMAP configuration"""
        user_id = config['user_id']
        config_id = config['id']
        config_name = config['name']
        user_email = config.get('profiles', {}).get('email', 'unknown')
        
        logger.info(f"Processing config '{config_name}' for user {user_email}")
        
        try:
            # Decrypt password
            if config.get('password_encrypted'):
                try:
                    config['password'] = base64.b64decode(config['password_encrypted']).decode()
                except Exception as e:
                    logger.error(f"Failed to decrypt password for config {config_id}: {e}")
                    return {"status": "error", "error": "Failed to decrypt password"}
            else:
                logger.error(f"No password configured for config {config_id}")
                return {"status": "error", "error": "No password configured"}
            
            # Process emails using the existing ingestion function
            result = process_dmarc_ingestion(user_id, config)
            
            logger.info(f"Completed processing for {config_name}: processed={result.get('processed', 0)}, errors={result.get('errors', 0)}")
            
            return {
                "status": "success",
                "config_name": config_name,
                "user_email": user_email,
                "processed": result.get('processed', 0),
                "errors": result.get('errors', 0)
            }
            
        except Exception as e:
            logger.error(f"Error processing config {config_name}: {e}")
            return {
                "status": "error", 
                "config_name": config_name,
                "user_email": user_email,
                "error": str(e)
            }
    
    def run_daily_processing(self):
        """Run daily DMARC email processing for all active configurations"""
        logger.info("Starting daily DMARC email processing")
        start_time = datetime.now()
        
        try:
            configs = self.get_active_imap_configs()
            
            if not configs:
                logger.info("No active IMAP configurations found")
                return
            
            results = []
            total_processed = 0
            total_errors = 0
            
            for config in configs:
                result = self.process_config(config)
                results.append(result)
                
                if result["status"] == "success":
                    total_processed += result.get("processed", 0)
                    total_errors += result.get("errors", 0)
                
                # Add a small delay between processing different configs to avoid overwhelming IMAP servers
                time.sleep(2)
            
            # Log summary
            end_time = datetime.now()
            duration = end_time - start_time
            
            success_count = len([r for r in results if r["status"] == "success"])
            error_count = len([r for r in results if r["status"] == "error"])
            
            logger.info(f"Daily processing completed in {duration}")
            logger.info(f"Configs processed: {success_count} successful, {error_count} failed")
            logger.info(f"Total emails processed: {total_processed}, Total errors: {total_errors}")
            
            # Log any failures
            for result in results:
                if result["status"] == "error":
                    logger.error(f"Failed to process {result['config_name']} for {result['user_email']}: {result['error']}")
            
        except Exception as e:
            logger.error(f"Error in daily processing: {e}")
    
    def start_scheduler(self):
        """Start the daily email processing scheduler"""
        if self.is_running:
            logger.warning("Scheduler is already running")
            return
        
        logger.info("Starting DMARC email processing scheduler")
        
        # Schedule daily processing at 2:00 AM
        schedule.every().day.at("02:00").do(self.run_daily_processing)
        
        # Also allow manual trigger for testing
        # schedule.every(10).minutes.do(self.run_daily_processing)  # Uncomment for testing
        
        self.is_running = True
        
        def run_schedule():
            while self.is_running:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        
        self.scheduler_thread = threading.Thread(target=run_schedule, daemon=True)
        self.scheduler_thread.start()
        
        logger.info("Scheduler started - daily processing scheduled for 2:00 AM")
    
    def stop_scheduler(self):
        """Stop the scheduler"""
        logger.info("Stopping DMARC email processing scheduler")
        self.is_running = False
        
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        
        schedule.clear()
        logger.info("Scheduler stopped")
    
    def run_now(self):
        """Manually trigger email processing (for testing)"""
        logger.info("Manually triggering DMARC email processing")
        self.run_daily_processing()

# Global scheduler instance
scheduler = DmarcScheduler()

def start_background_scheduler():
    """Start the background scheduler - call this from your main app"""
    scheduler.start_scheduler()

def stop_background_scheduler():
    """Stop the background scheduler"""
    scheduler.stop_scheduler()

def trigger_manual_processing():
    """Manually trigger processing (useful for testing)"""
    scheduler.run_now()

if __name__ == "__main__":
    # For testing - run the scheduler directly
    logger.info("Starting DMARC scheduler in standalone mode")
    
    # For testing, run immediately and then start scheduler
    scheduler.run_now()
    scheduler.start_scheduler()
    
    try:
        # Keep the script running
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
        scheduler.stop_scheduler() 