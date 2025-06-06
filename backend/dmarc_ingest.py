import os
import email
import logging
from email.header import decode_header
from datetime import datetime
from typing import Optional, List, Dict, Any
import imapclient
import re
from config import get_supabase_client, IMAP_CONFIG
from dmarc_parser import extract_attachment, parse_dmarc_xml

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# DMARC report detection patterns
DMARC_SUBJECT_PATTERNS = [
    r'dmarc',
    r'report domain',
    r'aggregate report',
    r'xml report',
    r'daily report',
    r'weekly report',
    r'monthly report',
    r'rua',  # Report URI for Aggregate reports
]

DMARC_SENDER_PATTERNS = [
    r'noreply.*dmarc',
    r'dmarc.*report',
    r'dmarcreport@microsoft\.com',  # Microsoft DMARC reports
    r'postmaster',
    r'mailer-daemon',
    r'abuse',
    r'security',
]

DMARC_ATTACHMENT_PATTERNS = [
    r'\.xml$',
    r'\.xml\.zip$', 
    r'\.xml\.gz$',
    r'\.xml\.gzip$',
    r'dmarc.*\.zip$',
    r'aggregate.*\.zip$',
    r'.*\.zip$',  # Any zip file (will be validated by content)
]

def is_dmarc_email(email_message) -> bool:
    """Enhanced DMARC email detection"""
    try:
        # Decode subject
        subject_parts = decode_header(email_message['Subject'] or '')
        subject = ''
        for part, encoding in subject_parts:
            if isinstance(part, bytes):
                subject += part.decode(encoding or 'utf-8')
            else:
                subject += part
        
        # Check subject patterns
        subject_lower = subject.lower()
        for pattern in DMARC_SUBJECT_PATTERNS:
            if re.search(pattern, subject_lower):
                logger.debug(f"Subject matched DMARC pattern '{pattern}': {subject}")
                return True
        
        # Check sender patterns
        sender = (email_message.get('From') or '').lower()
        for pattern in DMARC_SENDER_PATTERNS:
            if re.search(pattern, sender):
                logger.debug(f"Sender matched DMARC pattern '{pattern}': {sender}")
                return True
        
        # Check for DMARC-specific content
        body_content = ""
        for part in email_message.walk():
            if part.get_content_type() == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    body_content += payload.decode('utf-8', errors='ignore').lower()
        
        if 'dmarc' in body_content or 'aggregate report' in body_content:
            logger.debug(f"Body content matched DMARC indicators")
            return True
        
        # Check attachment names
        for part in email_message.walk():
            filename = part.get_filename()
            if filename:
                filename_lower = filename.lower()
                for pattern in DMARC_ATTACHMENT_PATTERNS:
                    if re.search(pattern, filename_lower):
                        logger.debug(f"Attachment matched DMARC pattern '{pattern}': {filename}")
                        return True
        
        return False
        
    except Exception as e:
        logger.warning(f"Error in DMARC detection: {e}")
        return False

def connect_imap(host: str, username: str, password: str, port: int = 993, use_ssl: bool = True):
    """Connect to IMAP server"""
    try:
        client = imapclient.IMAPClient(host, port=port, ssl=use_ssl)
        client.login(username, password)
        logger.info(f"Connected to IMAP server: {host}")
        return client
    except Exception as e:
        logger.error(f"Failed to connect to IMAP: {e}")
        raise

def fetch_dmarc_emails(client, folder: str = 'INBOX', limit: int = 50) -> List[tuple]:
    """Fetch unread DMARC emails from IMAP folder with improved filtering"""
    try:
        client.select_folder(folder)
        
        # Search for recent unread messages to avoid processing too many at once
        messages = client.search(['UNSEEN'])
        
        # Limit processing to avoid overwhelming the system
        if len(messages) > limit:
            logger.warning(f"Found {len(messages)} unread messages, limiting to {limit} most recent")
            messages = messages[-limit:]
        
        logger.info(f"Found {len(messages)} unread messages to check")
        
        dmarc_emails = []
        processed_count = 0
        
        for uid, message_data in client.fetch(messages, ['RFC822']).items():
            processed_count += 1
            email_message = email.message_from_bytes(message_data[b'RFC822'])
            
            # Use enhanced DMARC detection
            if is_dmarc_email(email_message):
                # Decode subject for logging
                subject_parts = decode_header(email_message['Subject'] or '')
                subject = ''
                for part, encoding in subject_parts:
                    if isinstance(part, bytes):
                        subject += part.decode(encoding or 'utf-8')
                    else:
                        subject += part
                
                logger.info(f"Found DMARC email: {subject}")
                
                # Extract relevant DMARC attachments only
                attachments_found = False
                for part in email_message.walk():
                    if part.get_content_disposition() == 'attachment' or part.get_filename():
                        filename = part.get_filename()
                        if filename:
                            # Check if attachment matches DMARC patterns
                            filename_lower = filename.lower()
                            is_dmarc_attachment = False
                            for pattern in DMARC_ATTACHMENT_PATTERNS:
                                if re.search(pattern, filename_lower):
                                    is_dmarc_attachment = True
                                    break
                            
                            if is_dmarc_attachment:
                                payload = part.get_payload(decode=True)
                                if payload:
                                    dmarc_emails.append((subject, filename, payload, uid))
                                    attachments_found = True
                            else:
                                logger.debug(f"Skipping non-DMARC attachment: {filename}")
                        else:
                            # Handle attachments without filenames (rare edge case)
                            payload = part.get_payload(decode=True)
                            if payload and (payload.startswith(b'PK') or payload.startswith(b'<?xml') or payload.startswith(b'\x1f\x8b')):
                                dmarc_emails.append((subject, "unknown_attachment", payload, uid))
                                attachments_found = True
                
                # If no attachments but matches DMARC patterns, log for investigation
                if not attachments_found:
                    logger.warning(f"DMARC email detected but no attachments found: {subject}")
            
            # Log progress for large batches
            if processed_count % 10 == 0:
                logger.debug(f"Processed {processed_count}/{len(messages)} messages")
                            
        logger.info(f"Found {len(dmarc_emails)} DMARC email attachments from {processed_count} checked messages")
        return dmarc_emails
        
    except Exception as e:
        logger.error(f"Failed to fetch emails: {e}")
        return []

def store_dmarc_report(supabase, user_id: str, imap_config_id: str, report_data: Dict[str, Any]) -> str:
    """Store DMARC report and return report ID"""
    try:
        # Check for duplicate reports based on report_id and org_name
        existing = supabase.table('dmarc_reports').select('id').eq('user_id', user_id).eq('report_id', report_data['report_id']).eq('org_name', report_data['org_name']).execute()
        
        if existing.data:
            logger.info(f"Report {report_data['report_id']} from {report_data['org_name']} already exists, skipping")
            return existing.data[0]['id']
        
        # Prepare report data for database
        report_record = {
            'user_id': user_id,
            'imap_config_id': imap_config_id,
            'org_name': report_data['org_name'],
            'email': report_data['email'],
            'report_id': report_data['report_id'],
            'domain': report_data['domain'],
            'date_range_begin': report_data['date_range_begin'].isoformat() if report_data['date_range_begin'] else None,
            'date_range_end': report_data['date_range_end'].isoformat() if report_data['date_range_end'] else None,
            'domain_policy': report_data['domain_policy'],
            'subdomain_policy': report_data['subdomain_policy'],
            'policy_percentage': report_data['policy_percentage'],
            'total_records': report_data['total_records'],
            'pass_count': report_data['pass_count'],
            'fail_count': report_data['fail_count'],
            'status': 'processed'
        }
        
        # Insert report
        result = supabase.table('dmarc_reports').insert(report_record).execute()
        db_report_id = result.data[0]['id']
        logger.info(f"Stored report {report_data['report_id']} with ID {db_report_id}")
        
        # Store individual records in batches for better performance
        records_to_insert = []
        for record in report_data['records']:
            record_data = {
                'report_id': db_report_id,
                'source_ip': record['source_ip'],
                'count': record['count'],
                'disposition': record['disposition'],
                'dkim_result': record['dkim_result'],
                'spf_result': record['spf_result'],
                'dkim_domain': record.get('dkim_domain'),
                'dkim_selector': record.get('dkim_selector'),
                'spf_domain': record.get('spf_domain'),
                'header_from': record.get('header_from'),
                'envelope_from': record.get('envelope_from'),
                'envelope_to': record.get('envelope_to')
            }
            records_to_insert.append(record_data)
        
        # Batch insert records (Supabase handles up to 1000 records per batch)
        batch_size = 1000
        for i in range(0, len(records_to_insert), batch_size):
            batch = records_to_insert[i:i + batch_size]
            supabase.table('dmarc_records').insert(batch).execute()
        
        logger.info(f"Stored {len(report_data['records'])} records for report {db_report_id}")
        return db_report_id
        
    except Exception as e:
        logger.error(f"Failed to store report: {e}")
        # Store error in report
        error_record = {
            'user_id': user_id,
            'imap_config_id': imap_config_id,
            'org_name': report_data.get('org_name', 'Unknown'),
            'report_id': report_data.get('report_id', 'Unknown'),
            'domain': report_data.get('domain', 'Unknown'),
            'status': 'error',
            'error_message': str(e)
        }
        try:
            supabase.table('dmarc_reports').insert(error_record).execute()
        except:
            pass  # Don't fail if we can't log the error
        raise

def mark_email_as_read(client, uid):
    """Mark email as read"""
    try:
        client.add_flags(uid, ['\\Seen'])
    except Exception as e:
        logger.error(f"Failed to mark email as read: {e}")

def log_audit_event(supabase, user_id: str, action: str, resource_type: str = 'dmarc_report', 
                   resource_id: str = None, details: Dict = None):
    """Log audit event"""
    try:
        audit_record = {
            'user_id': user_id,
            'action': action,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'details': details
        }
        supabase.table('audit_logs').insert(audit_record).execute()
    except Exception as e:
        logger.error(f"Failed to log audit event: {e}")

def update_imap_last_polled(supabase, config_id: str):
    """Update last polled timestamp for IMAP config"""
    try:
        supabase.table('imap_configs').update({
            'last_polled_at': datetime.utcnow().isoformat()
        }).eq('id', config_id).execute()
    except Exception as e:
        logger.error(f"Failed to update last polled timestamp: {e}")

def process_dmarc_ingestion(user_id: str, imap_config: Dict[str, Any], max_retries: int = 3, access_token: str = None) -> Dict[str, Any]:
    """Main function to process DMARC ingestion for a user with retry logic"""
    supabase = get_supabase_client(access_token)
    results = {
        'processed': 0,
        'errors': 0,
        'duplicates': 0,
        'reports': [],
        'error_details': []
    }
    
    client = None
    
    try:
        # Connect to IMAP with retry logic
        for attempt in range(max_retries):
            try:
                client = connect_imap(
                    host=imap_config['host'],
                    username=imap_config['username'],
                    password=imap_config['password'],
                    port=imap_config.get('port', 993),
                    use_ssl=imap_config.get('use_ssl', True)
                )
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                logger.warning(f"IMAP connection attempt {attempt + 1} failed: {e}")
                continue
        
        # Fetch DMARC emails
        dmarc_emails = fetch_dmarc_emails(client, imap_config.get('folder', 'INBOX'))
        
        for subject, filename, payload, uid in dmarc_emails:
            try:
                # Extract and parse XML
                xml_data = extract_attachment(payload, filename)
                report_data = parse_dmarc_xml(xml_data)
                
                # Store in database
                report_id = store_dmarc_report(supabase, user_id, imap_config['id'], report_data)
                
                # Mark email as read only after successful processing
                mark_email_as_read(client, uid)
                
                # Log success
                log_audit_event(supabase, user_id, 'dmarc_report_processed', 'dmarc_report', report_id, {
                    'subject': subject,
                    'filename': filename,
                    'org_name': report_data['org_name'],
                    'domain': report_data['domain']
                })
                
                results['processed'] += 1
                results['reports'].append({
                    'id': report_id,
                    'org_name': report_data['org_name'],
                    'domain': report_data['domain'],
                    'total_records': report_data['total_records']
                })
                
            except ValueError as e:
                # XML parsing or DMARC parsing error
                error_msg = f"Failed to parse DMARC report {filename}: {e}"
                logger.error(error_msg)
                results['errors'] += 1
                results['error_details'].append({
                    'subject': subject,
                    'filename': filename,
                    'error': error_msg
                })
                
            except Exception as e:
                # Other processing errors
                error_msg = f"Failed to process email {subject}: {e}"
                logger.error(error_msg)
                results['errors'] += 1
                results['error_details'].append({
                    'subject': subject,
                    'filename': filename,
                    'error': error_msg
                })
        
        # Update last polled timestamp
        update_imap_last_polled(supabase, imap_config['id'])
        
        # Log overall processing stats
        log_audit_event(supabase, user_id, 'dmarc_ingestion_completed', 'imap_config', imap_config['id'], {
            'processed': results['processed'],
            'errors': results['errors'],
            'total_emails': len(dmarc_emails)
        })
        
    except Exception as e:
        logger.error(f"DMARC ingestion failed: {e}")
        log_audit_event(supabase, user_id, 'dmarc_ingestion_failed', 'imap_config', imap_config['id'], {
            'error': str(e)
        })
        raise
    finally:
        # Always close IMAP connection
        if client:
            try:
                client.logout()
            except:
                pass
    
    return results

class DmarcIngest:
    """DMARC ingestion class for API integration"""
    
    def __init__(self, user_id: str, imap_config_id: str, access_token: str = None):
        self.user_id = user_id
        self.imap_config_id = imap_config_id
        self.access_token = access_token
        self.supabase = get_supabase_client(access_token)
    
    def process_emails(self, host: str, port: int, username: str, password: str, 
                      use_ssl: bool = True, folder: str = 'INBOX') -> Dict[str, Any]:
        """Process emails for the configured user and IMAP settings"""
        imap_config = {
            'id': self.imap_config_id,
            'host': host,
            'port': port,
            'username': username,
            'password': password,
            'use_ssl': use_ssl,
            'folder': folder
        }
        
        return process_dmarc_ingestion(self.user_id, imap_config, access_token=self.access_token)

if __name__ == '__main__':
    # For testing purposes - replace with proper user authentication in production
    test_user_id = os.getenv('TEST_USER_ID')
    if not test_user_id:
        logger.error("Set TEST_USER_ID environment variable for testing")
        exit(1)
    
    # Test IMAP config
    test_imap_config = {
        'id': 'test-config',
        'host': os.getenv('IMAP_HOST', 'imap.gmail.com'),
        'username': os.getenv('IMAP_USER'),
        'password': os.getenv('IMAP_PASS'),
        'port': int(os.getenv('IMAP_PORT', '993')),
        'use_ssl': True,
        'folder': 'INBOX'
    }
    
    if not all([test_imap_config['username'], test_imap_config['password']]):
        logger.error("Set IMAP_USER and IMAP_PASS environment variables")
        exit(1)
    
    results = process_dmarc_ingestion(test_user_id, test_imap_config)
    logger.info(f"Ingestion complete: {results}") 