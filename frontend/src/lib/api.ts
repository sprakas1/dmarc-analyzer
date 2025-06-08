import { supabase } from './supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (
  process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8000' 
    : 'https://dmarc.sharanprakash.me'
)

// Helper function to get the auth token
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

// Helper function to make authenticated API requests
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken()
  
  if (!token) {
    throw new Error('No authentication token available')
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  }

  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  })
}

export interface DMARCReport {
  id: string
  user_id: string
  imap_config_id?: string
  org_name: string
  email?: string
  report_id: string
  domain: string
  date_range_begin?: string
  date_range_end?: string
  domain_policy?: string
  subdomain_policy?: string
  policy_percentage?: number
  total_records: number
  pass_count: number
  fail_count: number
  status: string
  error_message?: string
  created_at: string
  updated_at: string
}

export interface DMARCRecord {
  id: string
  report_id: string
  source_ip: string
  count: number
  disposition?: string
  dkim_result?: string
  spf_result?: string
  dkim_domain?: string
  dkim_selector?: string
  spf_domain?: string
  header_from?: string
  envelope_from?: string
  envelope_to?: string
}

export interface AnalyticsSummary {
  total_reports: number
  total_records: number
  pass_count: number
  fail_count: number
  pass_rate: number
}

export interface IMAPConfig {
  id: string
  user_id: string
  name: string
  host: string
  port: number
  username: string
  use_ssl: boolean
  folder: string
  is_active: boolean
  last_polled_at?: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  created_at?: string
  updated_at?: string
}

// API functions
export const api = {
  // Authentication
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_BASE_URL}/health`)
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`)
    }
    return response.json()
  },

  // DMARC Parsing
  async parseDmarc(xmlData: string): Promise<{
    message: string;
    report_id: string;
    summary: {
      org_name: string;
      domain: string;
      total_records: number;
      pass_count: number;
      fail_count: number;
    };
  }> {
    const response = await authenticatedFetch('/api/v1/parse-dmarc', {
      method: 'POST',
      body: JSON.stringify({ xml_data: xmlData })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to parse DMARC: ${response.statusText}`)
    }
    
    return response.json()
  },

  // Reports
  async getReports(): Promise<DMARCReport[]> {
    const response = await authenticatedFetch('/api/v1/reports')
    if (!response.ok) {
      throw new Error(`Failed to fetch reports: ${response.statusText}`)
    }
    const data = await response.json()
    return data.reports
  },

  async getReport(reportId: string): Promise<DMARCReport & { records: DMARCRecord[] }> {
    const response = await authenticatedFetch(`/api/v1/reports/${reportId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch report: ${response.statusText}`)
    }
    const data = await response.json()
    return data.report
  },

  // Analytics
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const response = await authenticatedFetch('/api/v1/analytics/summary')
    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.statusText}`)
    }
    const data = await response.json()
    return data.summary
  },

  // User Profile
  async getUserProfile(): Promise<UserProfile> {
    const response = await authenticatedFetch('/api/v1/user/profile')
    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`)
    }
    const data = await response.json()
    return data.profile
  },

  // IMAP Configs
  async getImapConfigs(): Promise<IMAPConfig[]> {
    const response = await authenticatedFetch('/api/v1/imap-configs')
    if (!response.ok) {
      throw new Error(`Failed to fetch IMAP configs: ${response.statusText}`)
    }
    const data = await response.json()
    return data.configs
  },

  async createImapConfig(config: {
    name: string
    host: string
    port?: number
    username: string
    password: string
    use_ssl?: boolean
    folder?: string
  }): Promise<IMAPConfig> {
    const response = await authenticatedFetch('/api/v1/imap-configs', {
      method: 'POST',
      body: JSON.stringify(config),
    })
    if (!response.ok) {
      throw new Error(`Failed to create IMAP config: ${response.statusText}`)
    }
    const data = await response.json()
    return data.config
  },

  async updateImapConfig(configId: string, config: Partial<IMAPConfig>): Promise<IMAPConfig> {
    const response = await authenticatedFetch(`/api/v1/imap-configs/${configId}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    })
    if (!response.ok) {
      throw new Error(`Failed to update IMAP config: ${response.statusText}`)
    }
    const data = await response.json()
    return data.config
  },

  async deleteImapConfig(configId: string): Promise<void> {
    const response = await authenticatedFetch(`/api/v1/imap-configs/${configId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`Failed to delete IMAP config: ${response.statusText}`)
    }
  },

  async processEmails(configId: string): Promise<{ 
    message: string; 
    status: string;
    processed_count?: number;
    error_count?: number;
  }> {
    const response = await authenticatedFetch(`/api/v1/process-emails/${configId}`, {
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error(`Failed to process emails: ${response.statusText}`)
    }
    return response.json()
  },
}

// Legacy functions for backward compatibility during transition
export async function testAuth(username: string, password: string): Promise<{
  access_token: string;
  token_type: string;
  user: { id: string; email: string };
}> {
  throw new Error('Legacy authentication is deprecated. Please use Supabase authentication.')
}

export async function testParseDmarc(xmlData: string, token: string): Promise<{
  message: string;
  report_id: string;
  summary: {
    org_name: string;
    domain: string;
    total_records: number;
    pass_count: number;
    fail_count: number;
  };
}> {
  console.warn('testParseDmarc is deprecated. Please use api.parseDmarc instead.')
  return api.parseDmarc(xmlData)
}

export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
} 