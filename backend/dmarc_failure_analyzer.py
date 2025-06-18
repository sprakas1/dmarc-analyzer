"""
DMARC Failure Analyzer - Specific analysis for reported failures
Provides instant analysis and actionable recommendations for DMARC issues
"""

import logging
from typing import Dict, List, Any, Optional
import ipaddress
import dns.resolver
import dns.exception

logger = logging.getLogger(__name__)

class DMARCFailureAnalyzer:
    """
    Instant DMARC failure analysis for specific reports
    """
    
    def __init__(self):
        # Known Google/Gmail IP ranges
        self.google_ranges = [
            '209.85.128.0/17',
            '74.125.0.0/16', 
            '173.194.0.0/16',
            '2607:f8b0::/32',
            '2a00:1450::/32'
        ]
    
    def analyze_report_data(self, domain: str, report_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze the specific DMARC report data provided by user
        """
        logger.info(f"Analyzing DMARC report for domain: {domain}")
        
        analysis = {
            'domain': domain,
            'total_records': len(report_data),
            'failures': [],
            'patterns': {},
            'spf_issues': [],
            'dkim_issues': [],
            'recommendations': []
        }
        
        # Analyze each record
        google_spf_failures = []
        google_dkim_failures = []
        authorized_servers = []
        
        for record in report_data:
            source_ip = record.get('source_ip', '')
            count = record.get('count', 0)
            spf_result = record.get('spf_result', '')
            dkim_result = record.get('dkim_result', '')
            disposition = record.get('disposition', '')
            
            # Check if this is a Google IP
            is_google_ip = self._is_google_ip(source_ip)
            
            if spf_result == 'fail':
                failure_info = {
                    'ip': source_ip,
                    'count': count,
                    'provider': 'google' if is_google_ip else 'unknown',
                    'dkim_result': dkim_result,
                    'disposition': disposition
                }
                
                if is_google_ip:
                    google_spf_failures.append(failure_info)
                
                analysis['failures'].append(failure_info)
            
            if dkim_result == 'fail':
                analysis['dkim_issues'].append({
                    'ip': source_ip,
                    'count': count,
                    'provider': 'google' if is_google_ip else 'unknown'
                })
            
            if spf_result == 'pass' and dkim_result == 'pass':
                authorized_servers.append(source_ip)
        
        # Check current SPF record
        current_spf = self._get_spf_record(domain)
        analysis['current_spf'] = current_spf
        
        # Analyze SPF issues
        if google_spf_failures:
            analysis['spf_issues'].append({
                'type': 'google_spf_missing',
                'severity': 'high',
                'message': f'{len(google_spf_failures)} Google mail server IPs are failing SPF',
                'failing_ips': [f['ip'] for f in google_spf_failures],
                'details': 'Google Workspace/Gmail servers are not authorized in your SPF record'
            })
        
        # Generate specific recommendations
        analysis['recommendations'] = self._generate_specific_recommendations(
            domain, current_spf, google_spf_failures, authorized_servers
        )
        
        return analysis
    
    def _is_google_ip(self, ip: str) -> bool:
        """Check if IP belongs to Google/Gmail"""
        if not ip:
            return False
        
        try:
            ip_addr = ipaddress.ip_address(ip)
            for ip_range in self.google_ranges:
                network = ipaddress.ip_network(ip_range, strict=False)
                if ip_addr in network:
                    return True
        except ValueError:
            pass
        
        return False
    
    def _get_spf_record(self, domain: str) -> Optional[str]:
        """Get current SPF record for domain"""
        try:
            answers = dns.resolver.resolve(domain, 'TXT')
            for rdata in answers:
                txt_record = str(rdata).strip('"')
                if txt_record.startswith('v=spf1'):
                    return txt_record
        except (dns.exception.DNSException, Exception) as e:
            logger.debug(f"DNS lookup failed for {domain}: {e}")
        
        return None
    
    def _generate_specific_recommendations(self, domain: str, current_spf: Optional[str], 
                                         google_failures: List[Dict], 
                                         authorized_servers: List[str]) -> List[Dict[str, Any]]:
        """Generate specific actionable recommendations"""
        recommendations = []
        
        if google_failures:
            # Google SPF issue recommendation
            recommendations.append({
                'priority': 'HIGH',
                'title': 'Add Google Workspace to SPF Record',
                'issue': f'{len(google_failures)} emails from Google servers are failing SPF authentication',
                'current_spf': current_spf,
                'recommended_fix': self._create_google_spf_fix(current_spf),
                'implementation_steps': [
                    {
                        'step': 1,
                        'action': 'Check current SPF record',
                        'command': f'dig {domain} TXT | grep spf',
                        'description': 'Verify your current SPF record'
                    },
                    {
                        'step': 2,
                        'action': 'Add Google include to SPF',
                        'new_spf_record': self._create_google_spf_fix(current_spf),
                        'description': 'Update your DNS TXT record with Google\'s SPF include'
                    },
                    {
                        'step': 3,
                        'action': 'Verify SPF syntax',
                        'command': 'Use online SPF checker tools',
                        'description': 'Ensure the new SPF record is valid and under 10 DNS lookups'
                    },
                    {
                        'step': 4,
                        'action': 'Monitor results',
                        'description': 'Wait 24-48 hours and check new DMARC reports'
                    }
                ],
                'impact': 'This will fix SPF authentication for Google Workspace/Gmail sending',
                'risk_level': 'LOW - Adding authorized servers is safe'
            })
        
        # Check if authorized servers suggest specific mail service
        if authorized_servers:
            recommendations.append({
                'priority': 'MEDIUM',
                'title': 'Verify Authorized Mail Servers',
                'issue': 'Some servers are already authorized and working correctly',
                'details': f'IPs {", ".join(authorized_servers[:3])} are passing both SPF and DKIM',
                'action': 'Ensure these are your legitimate mail servers and not compromised systems',
                'implementation_steps': [
                    {
                        'step': 1,
                        'action': 'Identify server owners',
                        'description': f'Verify these IPs belong to your mail infrastructure: {", ".join(authorized_servers)}'
                    }
                ]
            })
        
        return recommendations
    
    def _create_google_spf_fix(self, current_spf: Optional[str]) -> str:
        """Create updated SPF record with Google include"""
        if not current_spf:
            return 'v=spf1 include:_spf.google.com ~all'
        
        # Check if Google is already included
        if 'include:_spf.google.com' in current_spf:
            return current_spf  # Already has Google
        
        # Insert Google include before the 'all' mechanism
        if ' ~all' in current_spf:
            return current_spf.replace(' ~all', ' include:_spf.google.com ~all')
        elif ' -all' in current_spf:
            return current_spf.replace(' -all', ' include:_spf.google.com -all')
        elif ' +all' in current_spf:
            return current_spf.replace(' +all', ' include:_spf.google.com +all')
        else:
            # Add to end if no 'all' mechanism found
            return f'{current_spf} include:_spf.google.com ~all'

def analyze_getlooshi_report():
    """
    Analyze the specific getlooshi.com report provided by the user
    """
    # Recreate the user's report data
    report_data = [
        {'source_ip': '209.85.220.69', 'count': 2, 'spf_result': 'fail', 'dkim_result': 'fail', 'disposition': 'none'},
        {'source_ip': '209.85.220.41', 'count': 1, 'spf_result': 'fail', 'dkim_result': 'pass', 'disposition': 'none'},
        {'source_ip': '2607:f8b0:4864:20::c45', 'count': 1, 'spf_result': 'fail', 'dkim_result': 'pass', 'disposition': 'none'},
        {'source_ip': '209.85.220.69', 'count': 1, 'spf_result': 'fail', 'dkim_result': 'pass', 'disposition': 'none'},
        {'source_ip': '209.85.220.41', 'count': 1, 'spf_result': 'fail', 'dkim_result': 'pass', 'disposition': 'none'},
        {'source_ip': '209.85.220.41', 'count': 1, 'spf_result': 'fail', 'dkim_result': 'pass', 'disposition': 'none'},
        {'source_ip': '2607:f8b0:4864:20::c46', 'count': 1, 'spf_result': 'fail', 'dkim_result': 'pass', 'disposition': 'none'},
        {'source_ip': '2a01:111:f403:2418::72b', 'count': 1, 'spf_result': 'fail', 'dkim_result': 'pass', 'disposition': 'none'},
        {'source_ip': '136.143.188.12', 'count': 6, 'spf_result': 'pass', 'dkim_result': 'pass', 'disposition': 'none'},
        {'source_ip': '209.85.220.41', 'count': 1, 'spf_result': 'fail', 'dkim_result': 'pass', 'disposition': 'none'},
        {'source_ip': '136.143.188.16', 'count': 52, 'spf_result': 'pass', 'dkim_result': 'pass', 'disposition': 'none'},
        {'source_ip': '209.85.220.41', 'count': 1, 'spf_result': 'fail', 'dkim_result': 'pass', 'disposition': 'none'}
    ]
    
    analyzer = DMARCFailureAnalyzer()
    return analyzer.analyze_report_data('getlooshi.com', report_data)

if __name__ == "__main__":
    # Analyze the specific report
    analysis = analyze_getlooshi_report()
    
    print("=== DMARC FAILURE ANALYSIS FOR GETLOOSHI.COM ===")
    print(f"Domain: {analysis['domain']}")
    print(f"Total Records: {analysis['total_records']}")
    print(f"Current SPF: {analysis['current_spf']}")
    print()
    
    print("FAILURES DETECTED:")
    for failure in analysis['failures']:
        print(f"  - IP {failure['ip']}: {failure['count']} messages, Provider: {failure['provider']}")
    print()
    
    print("SPF ISSUES:")
    for issue in analysis['spf_issues']:
        print(f"  - {issue['type']}: {issue['message']}")
        print(f"    Failing IPs: {', '.join(issue['failing_ips'])}")
    print()
    
    print("ACTIONABLE RECOMMENDATIONS:")
    for i, rec in enumerate(analysis['recommendations'], 1):
        print(f"{i}. {rec['title']} [{rec['priority']}]")
        print(f"   Issue: {rec['issue']}")
        if 'recommended_fix' in rec:
            print(f"   Fix: {rec['recommended_fix']}")
        if 'impact' in rec:
            print(f"   Impact: {rec['impact']}")
        if 'risk_level' in rec:
            print(f"   Risk: {rec['risk_level']}")
        print() 