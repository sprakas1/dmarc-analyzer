'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon, CogIcon } from '@heroicons/react/24/outline'

interface AIAnalysisProps {
  domain: string
  session: any
}

interface AnalysisResult {
  domain: string
  total_records: number
  current_spf: string | null
  failures: Array<{
    ip: string
    count: number
    provider: string
    dkim_result: string
    disposition: string
  }>
  spf_issues: Array<{
    type: string
    severity: string
    message: string
    failing_ips: string[]
    details: string
  }>
  recommendations: Array<{
    priority: string
    title: string
    issue: string
    recommended_fix?: string
    implementation_steps: Array<{
      step: number
      action: string
      description: string
      command?: string
      new_spf_record?: string
    }>
    impact: string
    risk_level: string
  }>
}

export default function AIAnalysis({ domain, session }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/v1/analysis/analyze-from-records/${domain}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.message) {
        setError(data.message)
      } else {
        setAnalysis(data)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
      case 'critical':
        return <XCircleIcon className="w-5 h-5 text-red-500" />
      case 'medium':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
      default:
        return <CheckCircleIcon className="w-5 h-5 text-blue-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'HIGH':
      case 'CRITICAL':
        return 'bg-red-100 text-red-800'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Analysis Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI DMARC Analysis</h2>
          <p className="text-gray-600">Intelligent failure detection and actionable recommendations</p>
        </div>
        <Button 
          onClick={runAnalysis} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          <CogIcon className="w-4 h-4" />
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert>
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Analysis Overview</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analysis.total_records}</div>
                  <div className="text-sm text-gray-600">Total Records</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{analysis.failures.length}</div>
                  <div className="text-sm text-gray-600">Failures Detected</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{analysis.spf_issues.length}</div>
                  <div className="text-sm text-gray-600">SPF Issues</div>
                </div>
              </div>
              
              {analysis.current_spf && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Current SPF Record:</h4>
                  <code className="text-sm bg-white p-2 rounded border block">
                    {analysis.current_spf}
                  </code>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SPF Issues */}
          {analysis.spf_issues.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                  SPF Configuration Issues
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.spf_issues.map((issue, index) => (
                    <div key={index} className="border-l-4 border-red-400 bg-red-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getSeverityIcon(issue.severity)}
                        <Badge className={getPriorityColor(issue.severity)}>
                          {issue.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-red-800">{issue.message}</h4>
                      <p className="text-red-700 text-sm mt-1">{issue.details}</p>
                      
                      {issue.failing_ips.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-red-800">Failing IP Addresses:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {issue.failing_ips.slice(0, 5).map((ip, ipIndex) => (
                              <Badge key={ipIndex} variant="outline" className="text-xs">
                                {ip}
                              </Badge>
                            ))}
                            {issue.failing_ips.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{issue.failing_ips.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actionable Recommendations */}
          {analysis.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  Actionable Recommendations
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {analysis.recommendations.map((rec, index) => (
                    <div key={index} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority}
                            </Badge>
                          </div>
                          <h4 className="text-lg font-semibold">{rec.title}</h4>
                          <p className="text-gray-600">{rec.issue}</p>
                        </div>
                      </div>

                      {rec.recommended_fix && (
                        <div className="mb-4 p-4 bg-green-50 rounded-lg">
                          <h5 className="font-medium text-green-800 mb-2">Recommended Fix:</h5>
                          <code className="text-sm bg-white p-2 rounded border block text-green-700">
                            {rec.recommended_fix}
                          </code>
                        </div>
                      )}

                      {/* Implementation Steps */}
                      <div className="mb-4">
                        <h5 className="font-medium mb-3">Implementation Steps:</h5>
                        <div className="space-y-3">
                          {rec.implementation_steps.map((step, stepIndex) => (
                            <div key={stepIndex} className="flex gap-3">
                              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                                {step.step}
                              </div>
                              <div className="flex-1">
                                <h6 className="font-medium">{step.action}</h6>
                                <p className="text-sm text-gray-600">{step.description}</p>
                                {step.command && (
                                  <code className="text-xs bg-gray-100 p-1 rounded mt-1 block">
                                    {step.command}
                                  </code>
                                )}
                                {step.new_spf_record && (
                                  <code className="text-xs bg-green-100 p-2 rounded mt-1 block">
                                    {step.new_spf_record}
                                  </code>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-blue-50 rounded">
                          <span className="font-medium text-blue-800">Impact: </span>
                          <span className="text-blue-700">{rec.impact}</span>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                          <span className="font-medium text-green-800">Risk Level: </span>
                          <span className="text-green-700">{rec.risk_level}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failure Details */}
          {analysis.failures.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Failure Details</h3>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source IP
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Provider
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          DKIM Result
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analysis.failures.map((failure, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                            {failure.ip}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {failure.count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={failure.provider === 'google' ? 'default' : 'secondary'}>
                              {failure.provider}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={failure.dkim_result === 'pass' ? 'default' : 'destructive'}>
                              {failure.dkim_result}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
} 