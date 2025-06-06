'use client'

import { useState } from 'react'
import { testAuth, testParseDmarc, handleApiError } from '@/lib/api'

export default function TestPage() {
  const [username, setUsername] = useState('sharan')
  const [password, setPassword] = useState('sharan')
  const [token, setToken] = useState<string>('')
  const [user, setUser] = useState<any>(null)
  const [xmlData, setXmlData] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [authError, setAuthError] = useState<string>('')
  const [uploadError, setUploadError] = useState<string>('')
  const [uploadResult, setUploadResult] = useState<any>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    
    try {
      const result = await testAuth(username, password)
      setToken(result.access_token)
      setUser(result.user)
    } catch (err) {
      setAuthError(handleApiError(err))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setUploadError('Please authenticate first')
      return
    }
    
    setUploadLoading(true)
    setUploadError('')
    setUploadResult(null)
    
    try {
      const result = await testParseDmarc(xmlData, token)
      setUploadResult(result)
    } catch (err) {
      setUploadError(handleApiError(err))
    } finally {
      setUploadLoading(false)
    }
  }

  const sampleXmlData = `<?xml version="1.0" encoding="UTF-8" ?>
<feedback>
  <version>1.0</version>
  <report_metadata>
    <org_name>google.com</org_name>
    <email>noreply-dmarc-support@google.com</email>
    <extra_contact_info>https://support.google.com/a/answer/2466580</extra_contact_info>
    <report_id>15072545285105560026</report_id>
    <date_range>
      <begin>1748822400</begin>
      <end>1748908799</end>
    </date_range>
  </report_metadata>
  <policy_published>
    <domain>looshiglobal.com</domain>
    <adkim>s</adkim>
    <aspf>r</aspf>
    <p>none</p>
    <sp>none</sp>
    <pct>100</pct>
    <np>none</np>
  </policy_published>
  <record>
    <row>
      <source_ip>209.85.220.69</source_ip>
      <count>1</count>
      <policy_evaluated>
        <disposition>none</disposition>
        <dkim>pass</dkim>
        <spf>pass</spf>
      </policy_evaluated>
    </row>
    <identifiers>
      <header_from>looshiglobal.com</header_from>
    </identifiers>
    <auth_results>
      <dkim>
        <domain>looshiglobal.com</domain>
        <result>pass</result>
        <selector>google</selector>
      </dkim>
      <spf>
        <domain>looshiglobal.com</domain>
        <result>pass</result>
      </spf>
    </auth_results>
  </record>
</feedback>`

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">DMARC Analyzer Test Page</h1>
        <p className="mt-2 text-gray-600">Test authentication and DMARC XML parsing</p>
      </div>

      {/* Authentication Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">1. Authentication</h2>
        
        {user ? (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Authenticated Successfully</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>User: {user.email} (ID: {user.id})</p>
                  <p>Token: {token.substring(0, 20)}...</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>
            
            {authError && (
              <div className="text-red-600 text-sm">{authError}</div>
            )}
            
            <button
              type="submit"
              disabled={authLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {authLoading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
        )}
      </div>

      {/* XML Upload Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">2. DMARC XML Upload</h2>
        
        {!token && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <p className="text-yellow-700">Please authenticate first to upload DMARC XML</p>
          </div>
        )}
        
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">DMARC XML Data</label>
              <button
                type="button"
                onClick={() => setXmlData(sampleXmlData)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Load Sample XML
              </button>
            </div>
            <textarea
              value={xmlData}
              onChange={(e) => setXmlData(e.target.value)}
              rows={15}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono text-xs"
              placeholder="Paste your DMARC XML here..."
              required
            />
          </div>
          
          {uploadError && (
            <div className="text-red-600 text-sm">{uploadError}</div>
          )}
          
          <button
            type="submit"
            disabled={uploadLoading || !token}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {uploadLoading ? 'Parsing & Uploading...' : 'Parse & Upload XML'}
          </button>
        </form>
        
        {uploadResult && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-green-800 mb-2">Upload Successful!</h3>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>Report ID:</strong> {uploadResult.report_id}</p>
              <p><strong>Message:</strong> {uploadResult.message}</p>
              <div className="mt-3">
                <p><strong>Summary:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>Organization: {uploadResult.summary.org_name}</li>
                  <li>Domain: {uploadResult.summary.domain}</li>
                  <li>Total Records: {uploadResult.summary.total_records}</li>
                  <li>Passed: {uploadResult.summary.pass_count}</li>
                  <li>Failed: {uploadResult.summary.fail_count}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Instructions</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>1. First authenticate with username: <code>sharan</code> and password: <code>sharan</code></p>
          <p>2. Either paste your DMARC XML or click "Load Sample XML" to use the provided Google report</p>
          <p>3. Click "Parse & Upload XML" to process and store the report</p>
          <p>4. Check the Reports page to see the parsed data</p>
        </div>
      </div>
    </div>
  )
} 