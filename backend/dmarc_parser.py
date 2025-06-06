import zipfile
import gzip
import xml.etree.ElementTree as ET
from io import BytesIO
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

def extract_attachment(payload: bytes, filename: str = None) -> bytes:
    """Extract XML from zip/gzip attachments"""
    try:
        # Try zip first
        if filename and filename.endswith('.zip') or payload.startswith(b'PK'):
            with zipfile.ZipFile(BytesIO(payload)) as zf:
                for name in zf.namelist():
                    if name.endswith('.xml'):
                        return zf.read(name)
        
        # Try gzip
        elif filename and filename.endswith('.gz') or payload.startswith(b'\x1f\x8b'):
            return gzip.decompress(payload)
        
        # Assume raw XML
        else:
            return payload
            
    except Exception as e:
        logger.error(f"Failed to extract attachment: {e}")
        return payload

def parse_dmarc_xml(xml_data: bytes) -> Dict[str, Any]:
    """Parse DMARC XML report into structured data"""
    try:
        root = ET.fromstring(xml_data)
        
        # Extract report metadata
        report_metadata = root.find('report_metadata')
        policy_published = root.find('policy_published')
        
        # Parse basic report info
        report_data = {
            'org_name': safe_find_text(report_metadata, 'org_name'),
            'email': safe_find_text(report_metadata, 'email'),
            'report_id': safe_find_text(report_metadata, 'report_id'),
            'date_range_begin': parse_timestamp(safe_find_text(report_metadata, 'date_range/begin')),
            'date_range_end': parse_timestamp(safe_find_text(report_metadata, 'date_range/end')),
            
            # Policy info
            'domain': safe_find_text(policy_published, 'domain'),
            'domain_policy': safe_find_text(policy_published, 'p'),
            'subdomain_policy': safe_find_text(policy_published, 'sp'),
            'policy_percentage': safe_find_int(policy_published, 'pct', 100),
            
            'records': []
        }
        
        # Parse individual records
        total_records = 0
        pass_count = 0
        fail_count = 0
        
        for record in root.findall('record'):
            record_data = parse_record(record)
            report_data['records'].append(record_data)
            
            count = record_data.get('count', 1)
            total_records += count
            
            # Check if record passed DMARC
            dkim_pass = record_data.get('dkim_result') == 'pass'
            spf_pass = record_data.get('spf_result') == 'pass'
            
            if dkim_pass or spf_pass:  # DMARC passes if either DKIM or SPF passes
                pass_count += count
            else:
                fail_count += count
        
        # Add summary stats
        report_data.update({
            'total_records': total_records,
            'pass_count': pass_count,
            'fail_count': fail_count
        })
        
        return report_data
        
    except ET.ParseError as e:
        logger.error(f"XML parsing error: {e}")
        raise ValueError(f"Invalid XML format: {e}")
    except Exception as e:
        logger.error(f"DMARC parsing error: {e}")
        raise ValueError(f"Failed to parse DMARC report: {e}")

def parse_record(record_element) -> Dict[str, Any]:
    """Parse individual DMARC record"""
    row = record_element.find('row')
    policy_evaluated = row.find('policy_evaluated')
    identifiers = record_element.find('identifiers')
    auth_results = record_element.find('auth_results')
    
    record_data = {
        # Source info
        'source_ip': safe_find_text(row, 'source_ip'),
        'count': safe_find_int(row, 'count', 1),
        
        # Policy evaluation
        'disposition': safe_find_text(policy_evaluated, 'disposition'),
        'dkim_result': safe_find_text(policy_evaluated, 'dkim'),
        'spf_result': safe_find_text(policy_evaluated, 'spf'),
        
        # Identifiers
        'header_from': safe_find_text(identifiers, 'header_from'),
        'envelope_from': safe_find_text(identifiers, 'envelope_from'),
        'envelope_to': safe_find_text(identifiers, 'envelope_to')
    }
    
    # Parse authentication results
    if auth_results:
        # DKIM results
        dkim = auth_results.find('dkim')
        if dkim is not None:
            record_data.update({
                'dkim_domain': safe_find_text(dkim, 'domain'),
                'dkim_selector': safe_find_text(dkim, 'selector')
            })
        
        # SPF results
        spf = auth_results.find('spf')
        if spf is not None:
            record_data['spf_domain'] = safe_find_text(spf, 'domain')
    
    return record_data

def safe_find_text(parent, path: str) -> Optional[str]:
    """Safely extract text from XML element"""
    if parent is None:
        return None
    
    element = parent.find(path)
    return element.text if element is not None else None

def safe_find_int(parent, path: str, default: int = 0) -> int:
    """Safely extract integer from XML element"""
    text = safe_find_text(parent, path)
    try:
        return int(text) if text else default
    except (ValueError, TypeError):
        return default

def parse_timestamp(timestamp_str: str) -> Optional[datetime]:
    """Convert Unix timestamp to datetime"""
    if not timestamp_str:
        return None
    try:
        return datetime.fromtimestamp(int(timestamp_str))
    except (ValueError, TypeError):
        return None 