"""
AI-powered DMARC Recommendation Engine
Generates specific, actionable solutions for DMARC authentication issues
"""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from supabase import Client

logger = logging.getLogger(__name__)

@dataclass
class Recommendation:
    id: str
    recommendation_type: str
    priority: str
    title: str
    description: str
    implementation_steps: List[Dict[str, Any]]
    status: str
    user_action: str

class RecommendationEngine:
    """
    Generates actionable recommendations based on DMARC analysis results
    """
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
        
        # SPF include patterns for common mail providers
        self.provider_spf_includes = {
            'google': 'include:_spf.google.com',
            'microsoft': 'include:spf.protection.outlook.com',
            'mailgun': 'include:mailgun.org',
            'sendgrid': 'include:sendgrid.net',
            'mailchimp': 'include:servers.mcsv.net',
            'amazonses': 'include:amazonses.com'
        }
    
    def generate_recommendations(self, analysis_result, user_id: str) -> List[Dict[str, Any]]:
        """
        Generate actionable recommendations based on analysis results
        """
        recommendations = []
        
        for issue in analysis_result.issues:
            rec = self._create_recommendation_from_issue(issue, analysis_result.domain)
            if rec:
                recommendations.append(rec)
        
        # Store recommendations in database
        stored_recommendations = []
        for rec in recommendations:
            stored_rec = self._store_recommendation(user_id, analysis_result.domain, rec)
            if stored_rec:
                stored_recommendations.append(stored_rec)
        
        return stored_recommendations
    
    def _create_recommendation_from_issue(self, issue: Dict[str, Any], domain: str) -> Optional[Dict[str, Any]]:
        """
        Create specific recommendation based on issue type
        """
        issue_type = issue.get('type')
        
        if issue_type == 'spf_missing':
            return self._create_spf_missing_recommendation(domain)
        
        elif issue_type == 'spf_missing_provider':
            return self._create_spf_provider_recommendation(issue, domain)
        
        elif issue_type == 'spf_lookup_limit':
            return self._create_spf_optimization_recommendation(domain)
        
        elif issue_type == 'dkim_high_failure':
            return self._create_dkim_fix_recommendation(domain)
        
        elif issue_type == 'pattern_many_failing_ips':
            return self._create_security_review_recommendation(domain)
        
        return None
    
    def _create_spf_missing_recommendation(self, domain: str) -> Dict[str, Any]:
        """
        Create recommendation for missing SPF record
        """
        return {
            'recommendation_type': 'spf_creation',
            'priority': 'critical',
            'title': 'Create SPF Record',
            'description': f'Domain {domain} is missing an SPF record, causing all emails to fail SPF authentication.',
            'implementation_steps': [
                {
                    'step': 1,
                    'title': 'Identify Your Mail Servers',
                    'description': 'List all servers/services that send email for your domain',
                    'action': 'audit_mail_sources',
                    'details': 'Check with your email provider, marketing tools, and any custom applications'
                },
                {
                    'step': 2,
                    'title': 'Create Basic SPF Record',
                    'description': 'Add a TXT record to your DNS',
                    'action': 'dns_update',
                    'details': 'Add TXT record: "v=spf1 ~all" (start restrictive, then add authorized servers)',
                    'dns_record': {
                        'type': 'TXT',
                        'name': domain,
                        'value': 'v=spf1 ~all'
                    }
                },
                {
                    'step': 3,
                    'title': 'Add Authorized Mail Servers',
                    'description': 'Update SPF record with your actual mail servers',
                    'action': 'spf_update',
                    'details': 'Add include: statements or ip4:/ip6: mechanisms for your mail providers'
                },
                {
                    'step': 4,
                    'title': 'Test and Monitor',
                    'description': 'Verify SPF record and monitor DMARC reports',
                    'action': 'verification',
                    'details': 'Use SPF record checker tools and wait 24-48 hours for DMARC reports'
                }
            ],
            'status': 'pending',
            'user_action': 'none'
        }
    
    def _create_spf_provider_recommendation(self, issue: Dict[str, Any], domain: str) -> Dict[str, Any]:
        """
        Create recommendation for missing mail provider in SPF
        """
        provider = issue.get('provider', 'unknown')
        failing_ip = issue.get('ip', '')
        
        spf_include = self.provider_spf_includes.get(provider, f'ip4:{failing_ip}')
        
        return {
            'recommendation_type': 'spf_provider_fix',
            'priority': 'high',
            'title': f'Add {provider.title()} to SPF Record',
            'description': f'Emails from {provider} servers are failing SPF authentication. Add {provider} to your SPF record.',
            'implementation_steps': [
                {
                    'step': 1,
                    'title': 'Get Current SPF Record',
                    'description': f'Check your current SPF record for {domain}',
                    'action': 'dns_lookup',
                    'details': f'Use: dig {domain} TXT | grep spf'
                },
                {
                    'step': 2,
                    'title': f'Add {provider.title()} Include',
                    'description': f'Add {provider} mail servers to your SPF record',
                    'action': 'spf_update',
                    'details': f'Add "{spf_include}" to your SPF record before the "all" mechanism',
                    'spf_addition': spf_include
                },
                {
                    'step': 3,
                    'title': 'Verify SPF Record',
                    'description': 'Ensure SPF record is valid and doesn\'t exceed 10 DNS lookups',
                    'action': 'spf_validation',
                    'details': 'Use online SPF checker tools to validate syntax and lookup count'
                },
                {
                    'step': 4,
                    'title': 'Monitor Results',
                    'description': 'Wait for next DMARC reports to confirm fix',
                    'action': 'monitoring',
                    'details': 'Check DMARC reports in 24-48 hours to verify improvement'
                }
            ],
            'status': 'pending',
            'user_action': 'none'
        }
    
    def _create_spf_optimization_recommendation(self, domain: str) -> Dict[str, Any]:
        """
        Create recommendation for SPF record optimization
        """
        return {
            'recommendation_type': 'spf_optimization',
            'priority': 'high',
            'title': 'Optimize SPF Record - Too Many DNS Lookups',
            'description': 'Your SPF record exceeds the 10 DNS lookup limit, which can cause SPF failures.',
            'implementation_steps': [
                {
                    'step': 1,
                    'title': 'Audit SPF Record',
                    'description': 'Count DNS lookups in your current SPF record',
                    'action': 'spf_audit',
                    'details': 'Each "include:", "a", "mx", and "exists" counts as one lookup'
                },
                {
                    'step': 2,
                    'title': 'Flatten SPF Includes',
                    'description': 'Replace some include: statements with direct IP addresses',
                    'action': 'spf_flattening',
                    'details': 'Look up IP ranges for mail providers and use ip4:/ip6: mechanisms instead'
                },
                {
                    'step': 3,
                    'title': 'Remove Unused Includes',
                    'description': 'Remove SPF includes for services you no longer use',
                    'action': 'cleanup',
                    'details': 'Verify each include: is still needed for current mail services'
                },
                {
                    'step': 4,
                    'title': 'Test Optimized Record',
                    'description': 'Verify the optimized SPF record works correctly',
                    'action': 'testing',
                    'details': 'Use SPF testing tools and monitor DMARC reports after changes'
                }
            ],
            'status': 'pending',
            'user_action': 'none'
        }
    
    def _create_dkim_fix_recommendation(self, domain: str) -> Dict[str, Any]:
        """
        Create recommendation for DKIM issues
        """
        return {
            'recommendation_type': 'dkim_configuration',
            'priority': 'high',
            'title': 'Fix DKIM Signature Issues',
            'description': 'High DKIM failure rate detected. DKIM signatures are failing validation.',
            'implementation_steps': [
                {
                    'step': 1,
                    'title': 'Check DKIM DNS Records',
                    'description': 'Verify DKIM public keys are properly published in DNS',
                    'action': 'dkim_dns_check',
                    'details': 'Check if DKIM DNS records exist and are correctly formatted'
                },
                {
                    'step': 2,
                    'title': 'Verify DKIM Configuration',
                    'description': 'Ensure mail servers are properly signing emails',
                    'action': 'dkim_config_check',
                    'details': 'Check mail server DKIM configuration and private key'
                },
                {
                    'step': 3,
                    'title': 'Check Key Rotation',
                    'description': 'Verify DKIM keys haven\'t expired or been rotated without DNS updates',
                    'action': 'key_verification',
                    'details': 'Ensure private key on mail server matches public key in DNS'
                },
                {
                    'step': 4,
                    'title': 'Test DKIM Signatures',
                    'description': 'Send test emails and verify DKIM signatures',
                    'action': 'dkim_testing',
                    'details': 'Use email testing tools to verify DKIM signatures are valid'
                }
            ],
            'status': 'pending',
            'user_action': 'none'
        }
    
    def _create_security_review_recommendation(self, domain: str) -> Dict[str, Any]:
        """
        Create recommendation for security review when many IPs are failing
        """
        return {
            'recommendation_type': 'security_review',
            'priority': 'medium',
            'title': 'Security Review - Multiple Unauthorized Sources',
            'description': 'Many different IP addresses are sending mail for your domain. This could indicate security issues.',
            'implementation_steps': [
                {
                    'step': 1,
                    'title': 'Audit Email Sources',
                    'description': 'Review all systems and services sending email for your domain',
                    'action': 'email_audit',
                    'details': 'Check marketing platforms, applications, and any automated systems'
                },
                {
                    'step': 2,
                    'title': 'Check for Compromised Accounts',
                    'description': 'Look for signs of compromised email accounts or systems',
                    'action': 'security_check',
                    'details': 'Review login logs, unusual sending patterns, and user reports'
                },
                {
                    'step': 3,
                    'title': 'Implement Email Security',
                    'description': 'Strengthen email security measures',
                    'action': 'security_hardening',
                    'details': 'Enable MFA, review user permissions, and implement monitoring'
                },
                {
                    'step': 4,
                    'title': 'Tighten SPF Policy',
                    'description': 'Update SPF record to be more restrictive once sources are verified',
                    'action': 'spf_tightening',
                    'details': 'Consider changing from ~all to -all after confirming all legitimate sources'
                }
            ],
            'status': 'pending',
            'user_action': 'none'
        }
    
    def _store_recommendation(self, user_id: str, domain: str, recommendation: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Store recommendation in database
        """
        try:
            # First, get or create analysis result
            analysis_result = self._get_latest_analysis_result(user_id, domain)
            if not analysis_result:
                logger.warning(f"No analysis result found for {domain}")
                return None
            
            # Store recommendation
            result = self.supabase.table('recommendations').insert({
                'analysis_result_id': analysis_result['id'],
                'recommendation_type': recommendation['recommendation_type'],
                'priority': recommendation['priority'],
                'title': recommendation['title'],
                'description': recommendation['description'],
                'implementation_steps': recommendation['implementation_steps'],
                'status': recommendation['status'],
                'user_action': recommendation['user_action']
            }).execute()
            
            if result.data:
                return result.data[0]
            
        except Exception as e:
            logger.error(f"Error storing recommendation: {str(e)}")
        
        return None
    
    def _get_latest_analysis_result(self, user_id: str, domain: str) -> Optional[Dict[str, Any]]:
        """
        Get the latest analysis result for a domain
        """
        try:
            result = self.supabase.table('analysis_results').select('id').eq(
                'user_id', user_id
            ).eq('domain', domain).order('created_at', desc=True).limit(1).execute()
            
            if result.data:
                return result.data[0]
        except Exception as e:
            logger.error(f"Error getting analysis result: {str(e)}")
        
        return None
    
    def get_user_recommendations(self, user_id: str, domain: Optional[str] = None, 
                               status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get recommendations for a user, optionally filtered by domain and status
        """
        try:
            query = self.supabase.table('recommendations').select(
                '*, analysis_results!inner(user_id, domain)'
            ).eq('analysis_results.user_id', user_id)
            
            if domain:
                query = query.eq('analysis_results.domain', domain)
            
            if status:
                query = query.eq('status', status)
            
            result = query.order('created_at', desc=True).execute()
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {str(e)}")
            return []
    
    def update_recommendation_status(self, recommendation_id: str, status: str, 
                                   user_action: str) -> bool:
        """
        Update recommendation status and user action
        """
        try:
            result = self.supabase.table('recommendations').update({
                'status': status,
                'user_action': user_action,
                'updated_at': 'now()'
            }).eq('id', recommendation_id).execute()
            
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Error updating recommendation: {str(e)}")
            return False 