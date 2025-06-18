"""
AI-powered DMARC Analysis Engine
Intelligent failure detection, pattern analysis, and root cause identification
"""

import logging
import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict
import ipaddress
import dns.resolver
import dns.exception
from supabase import Client

logger = logging.getLogger(__name__)

@dataclass
class AnalysisResult:
    domain: str
    health_score: int
    failure_rate: float
    anomalies_detected: int
    issues: List[Dict[str, Any]]
    recommendations_count: int
    status: str

@dataclass
class SPFAnalysis:
    record: Optional[str]
    is_valid: bool
    mechanisms: List[str]
    includes: List[str]
    redirects: List[str]
    lookup_count: int
    issues: List[str]
    missing_ips: List[str]

@dataclass
class DKIMAnalysis:
    domains: List[str]
    selectors: List[str]
    valid_signatures: int
    invalid_signatures: int
    missing_signatures: int
    issues: List[str]

class DMARCAnalyzer:
    """
    Core AI analysis engine for DMARC reports
    Detects patterns, identifies root causes, and calculates health scores
    """
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.dns_cache = {}  # Simple DNS caching to avoid repeated lookups
        
        # Known mail service provider IP ranges
        self.known_providers = {
            'google': [
                '209.85.128.0/17',   # Gmail/Google Workspace
                '74.125.0.0/16',
                '173.194.0.0/16',
                '2607:f8b0::/32',    # IPv6
                '2a00:1450::/32'
            ],
            'microsoft': [
                '40.92.0.0/15',      # Office 365
                '40.107.0.0/16',
                '52.100.0.0/14',
                '104.47.0.0/17'
            ],
            'mailgun': [
                '69.72.32.0/24',
                '69.72.33.0/24',
                '69.72.34.0/24'
            ]
        }
    
    def analyze_domain_reports(self, user_id: str, domain: str, days: int = 30) -> AnalysisResult:
        """
        Comprehensive analysis of DMARC reports for a domain
        """
        logger.info(f"Starting AI analysis for domain: {domain}, user: {user_id}")
        
        try:
            # Get recent DMARC reports
            reports = self._get_recent_reports(user_id, domain, days)
            if not reports:
                return AnalysisResult(
                    domain=domain,
                    health_score=0,
                    failure_rate=0.0,
                    anomalies_detected=0,
                    issues=[{"type": "no_data", "message": "No DMARC reports found for analysis"}],
                    recommendations_count=0,
                    status="no_data"
                )
            
            # Get detailed records for analysis
            records = self._get_detailed_records(user_id, domain, days)
            
            # Perform various analyses
            spf_analysis = self._analyze_spf_failures(domain, records)
            dkim_analysis = self._analyze_dkim_failures(domain, records)
            pattern_analysis = self._analyze_failure_patterns(records)
            provider_analysis = self._analyze_mail_providers(records)
            
            # Calculate metrics
            total_records = sum(r['total_records'] for r in reports)
            total_failures = sum(r['fail_count'] for r in reports)
            failure_rate = (total_failures / total_records * 100) if total_records > 0 else 0
            
            # Detect anomalies and issues
            issues = []
            issues.extend(self._detect_spf_issues(spf_analysis, provider_analysis))
            issues.extend(self._detect_dkim_issues(dkim_analysis))
            issues.extend(self._detect_pattern_anomalies(pattern_analysis))
            issues.extend(self._detect_alignment_issues(records))
            
            # Calculate health score
            health_score = self._calculate_health_score(failure_rate, issues, spf_analysis, dkim_analysis)
            
            # Count anomalies
            anomalies_detected = len([issue for issue in issues if issue.get('severity') in ['critical', 'high']])
            recommendations_count = len(issues)
            
            # Determine overall status
            status = self._determine_analysis_status(health_score, failure_rate, anomalies_detected)
            
            result = AnalysisResult(
                domain=domain,
                health_score=health_score,
                failure_rate=round(failure_rate, 2),
                anomalies_detected=anomalies_detected,
                issues=issues,
                recommendations_count=recommendations_count,
                status=status
            )
            
            logger.info(f"Analysis completed for {domain}: Health Score {health_score}, Failure Rate {failure_rate:.2f}%")
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing domain {domain}: {str(e)}")
            return AnalysisResult(
                domain=domain,
                health_score=0,
                failure_rate=0.0,
                anomalies_detected=0,
                issues=[{"type": "analysis_error", "message": f"Analysis failed: {str(e)}"}],
                recommendations_count=0,
                status="error"
            )
    
    def _get_recent_reports(self, user_id: str, domain: str, days: int) -> List[Dict[str, Any]]:
        """Get recent DMARC reports for analysis"""
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        result = self.supabase.table('dmarc_reports').select(
            'id,org_name,domain,total_records,pass_count,fail_count,date_range_begin,date_range_end,created_at'
        ).eq('user_id', user_id).eq('domain', domain).gte('created_at', cutoff_date).execute()
        
        return result.data if result.data else []
    
    def _get_detailed_records(self, user_id: str, domain: str, days: int) -> List[Dict[str, Any]]:
        """Get detailed DMARC records for analysis"""
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        # Get report IDs first
        reports_result = self.supabase.table('dmarc_reports').select('id').eq(
            'user_id', user_id
        ).eq('domain', domain).gte('created_at', cutoff_date).execute()
        
        if not reports_result.data:
            return []
        
        report_ids = [r['id'] for r in reports_result.data]
        
        # Get detailed records
        records_result = self.supabase.table('dmarc_records').select('*').in_(
            'dmarc_report_id', report_ids
        ).execute()
        
        return records_result.data if records_result.data else []
    
    def _analyze_spf_failures(self, domain: str, records: List[Dict[str, Any]]) -> SPFAnalysis:
        """Analyze SPF failures and configuration"""
        logger.debug(f"Analyzing SPF for domain: {domain}")
        
        # Get current SPF record
        spf_record = self._get_spf_record(domain)
        
        # Parse SPF record
        mechanisms = []
        includes = []
        lookup_count = 0
        issues = []
        
        if spf_record:
            mechanisms = re.findall(r'[+-~?]?(a|mx|ip4|ip6|include|exists|redirect)', spf_record)
            includes = re.findall(r'include:([^\s]+)', spf_record)
            lookup_count = len(includes) + spf_record.count(' mx') + spf_record.count(' a')
            
            if lookup_count > 10:
                issues.append("SPF record exceeds 10 DNS lookup limit")
            if not spf_record.startswith('v=spf1'):
                issues.append("SPF record doesn't start with 'v=spf1'")
            if not any(term in spf_record for term in ['~all', '-all', '+all', '?all']):
                issues.append("SPF record missing 'all' mechanism")
        else:
            issues.append("No SPF record found")
        
        # Find IPs failing SPF that should be authorized
        failing_ips = []
        for record in records:
            if record.get('spf_result') == 'fail' and record.get('count', 0) > 0:
                source_ip = record.get('source_ip')
                if source_ip and source_ip not in failing_ips:
                    failing_ips.append(source_ip)
        
        # Check which failing IPs should be authorized
        missing_ips = []
        for ip in failing_ips:
            if not self._ip_authorized_by_spf(ip, spf_record):
                provider = self._identify_mail_provider(ip)
                if provider:
                    missing_ips.append(f"{ip} ({provider})")
                else:
                    missing_ips.append(ip)
        
        return SPFAnalysis(
            record=spf_record,
            is_valid=bool(spf_record and not issues),
            mechanisms=mechanisms,
            includes=includes,
            lookup_count=lookup_count,
            issues=issues,
            missing_ips=missing_ips
        )
    
    def _analyze_dkim_failures(self, domain: str, records: List[Dict[str, Any]]) -> DKIMAnalysis:
        """Analyze DKIM failures and configuration"""
        logger.debug(f"Analyzing DKIM for domain: {domain}")
        
        dkim_domains = set()
        dkim_selectors = set()
        valid_signatures = 0
        invalid_signatures = 0
        missing_signatures = 0
        issues = []
        
        for record in records:
            count = record.get('count', 0)
            dkim_result = record.get('dkim_result')
            dkim_domain = record.get('dkim_domain')
            dkim_selector = record.get('dkim_selector')
            
            if dkim_domain:
                dkim_domains.add(dkim_domain)
            if dkim_selector:
                dkim_selectors.add(dkim_selector)
            
            if dkim_result == 'pass':
                valid_signatures += count
            elif dkim_result == 'fail':
                invalid_signatures += count
            else:
                missing_signatures += count
        
        # Check for common DKIM issues
        total_messages = valid_signatures + invalid_signatures + missing_signatures
        if total_messages > 0:
            fail_rate = invalid_signatures / total_messages * 100
            if fail_rate > 10:
                issues.append(f"High DKIM failure rate: {fail_rate:.1f}%")
            
            missing_rate = missing_signatures / total_messages * 100
            if missing_rate > 20:
                issues.append(f"Many messages without DKIM signatures: {missing_rate:.1f}%")
        
        return DKIMAnalysis(
            domains=list(dkim_domains),
            selectors=list(dkim_selectors),
            valid_signatures=valid_signatures,
            invalid_signatures=invalid_signatures,
            missing_signatures=missing_signatures,
            issues=issues
        )
    
    def _analyze_failure_patterns(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze patterns in DMARC failures"""
        ip_failures = defaultdict(int)
        provider_failures = defaultdict(int)
        
        for record in records:
            count = record.get('count', 0)
            source_ip = record.get('source_ip', '')
            
            if record.get('spf_result') == 'fail' or record.get('dkim_result') == 'fail':
                ip_failures[source_ip] += count
                provider = self._identify_mail_provider(source_ip)
                if provider:
                    provider_failures[provider] += count
        
        return {
            'top_failing_ips': dict(sorted(ip_failures.items(), key=lambda x: x[1], reverse=True)[:10]),
            'provider_failures': dict(provider_failures),
            'total_failing_ips': len(ip_failures)
        }
    
    def _analyze_mail_providers(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze which mail providers are being used"""
        provider_stats = defaultdict(lambda: {'total': 0, 'pass': 0, 'fail': 0})
        
        for record in records:
            count = record.get('count', 0)
            source_ip = record.get('source_ip', '')
            spf_result = record.get('spf_result')
            dkim_result = record.get('dkim_result')
            
            provider = self._identify_mail_provider(source_ip) or 'unknown'
            provider_stats[provider]['total'] += count
            
            if spf_result == 'pass' or dkim_result == 'pass':
                provider_stats[provider]['pass'] += count
            else:
                provider_stats[provider]['fail'] += count
        
        return dict(provider_stats)
    
    def _detect_spf_issues(self, spf_analysis: SPFAnalysis, provider_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect SPF-related issues and generate recommendations"""
        issues = []
        
        # No SPF record
        if not spf_analysis.record:
            issues.append({
                'type': 'spf_missing',
                'severity': 'critical',
                'title': 'SPF Record Missing',
                'message': 'No SPF record found for this domain',
                'impact': 'All emails will fail SPF authentication',
                'category': 'spf',
                'action': 'Create SPF record with authorized mail servers'
            })
        
        # SPF lookup limit exceeded
        elif spf_analysis.lookup_count > 10:
            issues.append({
                'type': 'spf_lookup_limit',
                'severity': 'high',
                'title': 'SPF DNS Lookup Limit Exceeded',
                'message': f'SPF record requires {spf_analysis.lookup_count} DNS lookups (limit is 10)',
                'impact': 'SPF evaluation may fail due to too many DNS lookups',
                'category': 'spf',
                'action': 'Optimize SPF record to reduce DNS lookups'
            })
        
        # Missing mail provider IPs
        if spf_analysis.missing_ips:
            for missing_ip in spf_analysis.missing_ips[:5]:
                if '(' in missing_ip:  # Has provider info
                    ip, provider = missing_ip.split(' (')
                    provider = provider.rstrip(')')
                    issues.append({
                        'type': 'spf_missing_provider',
                        'severity': 'high',
                        'title': f'Missing {provider.title()} Mail Servers in SPF',
                        'message': f'IP {ip} from {provider} is failing SPF but appears to be legitimate',
                        'impact': f'Emails from {provider} services will fail DMARC authentication',
                        'category': 'spf',
                        'provider': provider,
                        'ip': ip.strip(),
                        'action': f'Add {provider} mail servers to SPF record'
                    })
        
        return issues
    
    def _detect_dkim_issues(self, dkim_analysis: DKIMAnalysis) -> List[Dict[str, Any]]:
        """Detect DKIM-related issues"""
        issues = []
        
        for issue in dkim_analysis.issues:
            if 'failure rate' in issue.lower():
                issues.append({
                    'type': 'dkim_high_failure',
                    'severity': 'high',
                    'title': 'High DKIM Failure Rate',
                    'message': issue,
                    'impact': 'Many emails are failing DKIM authentication',
                    'category': 'dkim'
                })
            elif 'without dkim' in issue.lower():
                issues.append({
                    'type': 'dkim_missing_signatures',
                    'severity': 'medium',
                    'title': 'Missing DKIM Signatures',
                    'message': issue,
                    'impact': 'Emails without DKIM signatures rely solely on SPF for DMARC',
                    'category': 'dkim'
                })
        
        return issues
    
    def _detect_pattern_anomalies(self, pattern_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect unusual patterns in failures"""
        issues = []
        
        if pattern_analysis['total_failing_ips'] > 20:
            issues.append({
                'type': 'pattern_many_failing_ips',
                'severity': 'medium',
                'title': 'Many Different IPs Failing Authentication',
                'message': f'{pattern_analysis["total_failing_ips"]} different IPs are failing',
                'impact': 'Could indicate compromised accounts or misconfiguration',
                'category': 'pattern',
                'action': 'Review email sending sources and SPF configuration'
            })
        
        return issues
    
    def _get_spf_record(self, domain: str) -> Optional[str]:
        """Get SPF record for domain with caching"""
        if domain in self.dns_cache:
            return self.dns_cache[domain]
        
        try:
            answers = dns.resolver.resolve(domain, 'TXT')
            for rdata in answers:
                txt_record = str(rdata).strip('"')
                if txt_record.startswith('v=spf1'):
                    self.dns_cache[domain] = txt_record
                    return txt_record
        except (dns.exception.DNSException, Exception) as e:
            logger.debug(f"DNS lookup failed for {domain}: {e}")
        
        self.dns_cache[domain] = None
        return None
    
    def _ip_authorized_by_spf(self, ip: str, spf_record: Optional[str]) -> bool:
        """Check if IP is authorized by SPF record"""
        if not spf_record:
            return False
        
        try:
            # Simple IP4/IP6 mechanism check
            if f'ip4:{ip}' in spf_record or f'ip6:{ip}' in spf_record:
                return True
            
            # Check for network ranges
            for mechanism in re.findall(r'ip[46]:([^\s]+)', spf_record):
                try:
                    if '/' in mechanism:  # CIDR notation
                        network = ipaddress.ip_network(mechanism, strict=False)
                        if ipaddress.ip_address(ip) in network:
                            return True
                except ValueError:
                    continue
            
            return False
        except Exception:
            return False
    
    def _identify_mail_provider(self, ip: str) -> Optional[str]:
        """Identify mail service provider from IP address"""
        if not ip:
            return None
        
        try:
            ip_addr = ipaddress.ip_address(ip)
            
            for provider, ranges in self.known_providers.items():
                for ip_range in ranges:
                    try:
                        network = ipaddress.ip_network(ip_range, strict=False)
                        if ip_addr in network:
                            return provider
                    except ValueError:
                        continue
        except ValueError:
            pass
        
        return None
    
    def _calculate_health_score(self, failure_rate: float, issues: List[Dict[str, Any]], 
                              spf_analysis: SPFAnalysis) -> int:
        """Calculate overall domain health score (0-100)"""
        base_score = 100
        
        # Penalize based on failure rate
        base_score -= min(failure_rate * 2, 60)  # Up to 60 points for failures
        
        # Penalize based on issues
        for issue in issues:
            severity = issue.get('severity', 'low')
            if severity == 'critical':
                base_score -= 20
            elif severity == 'high':
                base_score -= 10
            elif severity == 'medium':
                base_score -= 5
            else:
                base_score -= 2
        
        # SPF record quality
        if not spf_analysis.record:
            base_score -= 25
        elif spf_analysis.lookup_count > 10:
            base_score -= 15
        
        return max(0, min(100, int(base_score)))
    
    def _determine_analysis_status(self, health_score: int, failure_rate: float) -> str:
        """Determine overall analysis status"""
        if health_score >= 90 and failure_rate < 5:
            return 'excellent'
        elif health_score >= 75 and failure_rate < 15:
            return 'good'
        elif health_score >= 50 and failure_rate < 30:
            return 'warning'
        else:
            return 'critical'
    
    def _detect_alignment_issues(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect DMARC alignment issues"""
        issues = []
        
        # Check for domain alignment issues
        misaligned_domains = set()
        for record in records:
            header_from = record.get('header_from', '')
            envelope_from = record.get('envelope_from', '')
            spf_domain = record.get('spf_domain', '')
            dkim_domain = record.get('dkim_domain', '')
            
            if header_from and envelope_from and header_from != envelope_from:
                misaligned_domains.add(f"{header_from} (envelope: {envelope_from})")
        
        if misaligned_domains:
            issues.append({
                'type': 'alignment_domain_mismatch',
                'severity': 'medium',
                'title': 'Domain Alignment Issues',
                'message': f'Found domain misalignment in {len(misaligned_domains)} cases',
                'impact': 'May cause DMARC failures even with valid SPF/DKIM',
                'category': 'alignment',
                'details': list(misaligned_domains)[:5]  # Show first 5
            })
        
        return issues
    
    def _get_spf_record(self, domain: str) -> Optional[str]:
        """Get SPF record for domain with caching"""
        if domain in self.dns_cache:
            return self.dns_cache[domain]
        
        try:
            answers = dns.resolver.resolve(domain, 'TXT')
            for rdata in answers:
                txt_record = str(rdata).strip('"')
                if txt_record.startswith('v=spf1'):
                    self.dns_cache[domain] = txt_record
                    return txt_record
        except (dns.exception.DNSException, Exception) as e:
            logger.debug(f"DNS lookup failed for {domain}: {e}")
        
        self.dns_cache[domain] = None
        return None
    
    def _ip_authorized_by_spf(self, ip: str, spf_record: Optional[str]) -> bool:
        """Check if IP is authorized by SPF record (simplified check)"""
        if not spf_record:
            return False
        
        try:
            # Simple IP4/IP6 mechanism check
            if f'ip4:{ip}' in spf_record or f'ip6:{ip}' in spf_record:
                return True
            
            # Check for network ranges (simplified)
            for mechanism in re.findall(r'ip[46]:([^\s]+)', spf_record):
                try:
                    if '/' in mechanism:  # CIDR notation
                        network = ipaddress.ip_network(mechanism, strict=False)
                        if ipaddress.ip_address(ip) in network:
                            return True
                except ValueError:
                    continue
            
            return False
        except Exception:
            return False
    
    def _identify_mail_provider(self, ip: str) -> Optional[str]:
        """Identify mail service provider from IP address"""
        if not ip:
            return None
        
        try:
            ip_addr = ipaddress.ip_address(ip)
            
            for provider, ranges in self.known_providers.items():
                for ip_range in ranges:
                    try:
                        network = ipaddress.ip_network(ip_range, strict=False)
                        if ip_addr in network:
                            return provider
                    except ValueError:
                        continue
        except ValueError:
            pass
        
        return None
    
    def _calculate_health_score(self, failure_rate: float, issues: List[Dict[str, Any]], 
                              spf_analysis: SPFAnalysis, dkim_analysis: DKIMAnalysis) -> int:
        """Calculate overall domain health score (0-100)"""
        base_score = 100
        
        # Penalize based on failure rate
        base_score -= min(failure_rate * 2, 60)  # Up to 60 points for failures
        
        # Penalize based on issues
        for issue in issues:
            severity = issue.get('severity', 'low')
            if severity == 'critical':
                base_score -= 20
            elif severity == 'high':
                base_score -= 10
            elif severity == 'medium':
                base_score -= 5
            else:
                base_score -= 2
        
        # SPF record quality
        if not spf_analysis.record:
            base_score -= 25
        elif spf_analysis.lookup_count > 10:
            base_score -= 15
        
        # DKIM quality
        total_dkim = dkim_analysis.valid_signatures + dkim_analysis.invalid_signatures + dkim_analysis.missing_signatures
        if total_dkim > 0:
            dkim_fail_rate = dkim_analysis.invalid_signatures / total_dkim * 100
            base_score -= min(dkim_fail_rate / 2, 20)
        
        return max(0, min(100, int(base_score)))
    
    def _determine_analysis_status(self, health_score: int, failure_rate: float, anomalies: int) -> str:
        """Determine overall analysis status"""
        if health_score >= 90 and failure_rate < 5:
            return 'excellent'
        elif health_score >= 75 and failure_rate < 15:
            return 'good'
        elif health_score >= 50 and failure_rate < 30:
            return 'warning'
        else:
            return 'critical' 