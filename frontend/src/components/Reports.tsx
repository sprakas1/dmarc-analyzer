'use client'

import { useState, useEffect } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { DocumentTextIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { api, handleApiError, type DMARCReport } from '@/lib/api'

interface ReportsProps {
  session: any
}

interface DetailedReport {
  id: string
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
  created_at: string
  records: Array<{
    id: string
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
  }>
}

export default function Reports({ session }: ReportsProps) {
  const [reports, setReports] = useState<DMARCReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'pass' | 'fail'>('all')
  const [selectedReport, setSelectedReport] = useState<DetailedReport | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const itemsPerPage = 10

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true)
        setError(null)
        const fetchedReports = await api.getReports()
        setReports(fetchedReports)
      } catch (err) {
        setError(handleApiError(err))
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  const fetchReportDetails = async (reportId: string) => {
    try {
      setDetailsLoading(true)
      const reportData = await api.getReport(reportId)
      setSelectedReport(reportData)
    } catch (err) {
      console.error('Error fetching report details:', err)
      // Could add error handling here
    } finally {
      setDetailsLoading(false)
    }
  }

  const closeDetails = () => {
    setSelectedReport(null)
  }

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true
    // Consider a report as "pass" if it has more passed records than failed
    const isPass = report.pass_count > report.fail_count
    return filter === 'pass' ? isPass : !isPass
  })

  // Sort reports by date in descending order (newest first)
  const sortedReports = [...filteredReports].sort((a, b) => {
    // Use date_range_begin if available, otherwise fall back to created_at
    const dateA = a.date_range_begin ? new Date(a.date_range_begin) : new Date(a.created_at)
    const dateB = b.date_range_begin ? new Date(b.date_range_begin) : new Date(b.created_at)
    
    return dateB.getTime() - dateA.getTime() // Descending order (newest first)
  })

  const totalPages = Math.ceil(sortedReports.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentReports = sortedReports.slice(startIndex, endIndex)

  const getOverallResult = (report: DMARCReport): 'pass' | 'fail' => {
    return report.pass_count > report.fail_count ? 'pass' : 'fail'
  }

  const getStatusIcon = (result: 'pass' | 'fail') => {
    return result === 'pass' ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" />
    ) : (
      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
    )
  }

  const getStatusBadge = (result: 'pass' | 'fail') => {
    return result === 'pass' ? (
      <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
        Pass
      </span>
    ) : (
      <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
        Fail
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DMARC Reports</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all DMARC reports received for your domains.
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading reports
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">DMARC Reports</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all DMARC reports received for your domains.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as 'all' | 'pass' | 'fail')
              setCurrentPage(1)
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="all">All Reports</option>
            <option value="pass">Mostly Passed</option>
            <option value="fail">Mostly Failed</option>
          </select>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No reports yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure your IMAP connection to start receiving DMARC reports.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <div className="flow-root">
                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Organization
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Domain
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Policy
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Records
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Passed
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Failed
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentReports.map((report) => (
                          <tr key={report.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" title={`Received on ${new Date(report.created_at).toLocaleString()}`}>
                              <div>
                                <div>
                                  {report.date_range_begin 
                                    ? new Date(report.date_range_begin).toLocaleDateString() 
                                    : new Date(report.created_at).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Received {new Date(report.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {report.org_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {report.domain}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {report.domain_policy || 'none'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {report.total_records}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                              {report.pass_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                              {report.fail_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getStatusIcon(getOverallResult(report))}
                                <span className="ml-2">
                                  {getStatusBadge(getOverallResult(report))}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                className="text-blue-600 hover:text-blue-900"
                                onClick={() => {
                                  fetchReportDetails(report.id)
                                }}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6" aria-label="Pagination">
              <div className="hidden sm:block">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, sortedReports.length)}</span> of{' '}
                  <span className="font-medium">{sortedReports.length}</span> results
                </p>
              </div>
              <div className="flex-1 flex justify-between sm:justify-end">
                <button
                  onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-5 w-5 mr-1" aria-hidden="true" />
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRightIcon className="h-5 w-5 ml-1" aria-hidden="true" />
                </button>
              </div>
            </nav>
          )}
        </>
      )}

      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        DMARC Report Details
                      </h3>
                      <button
                        onClick={closeDetails}
                        className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                      >
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>

                    {detailsLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Report Summary */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-md font-medium text-gray-900 mb-3">Report Summary</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-500">Organization:</span>
                              <span className="ml-2 text-gray-900">{selectedReport.org_name}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">Domain:</span>
                              <span className="ml-2 text-gray-900">{selectedReport.domain}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">Report ID:</span>
                              <span className="ml-2 text-gray-900 font-mono text-xs">{selectedReport.report_id}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">Email:</span>
                              <span className="ml-2 text-gray-900">{selectedReport.email || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">Policy:</span>
                              <span className="ml-2 text-gray-900">{selectedReport.domain_policy || 'none'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">Policy %:</span>
                              <span className="ml-2 text-gray-900">{selectedReport.policy_percentage || 100}%</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">Date Range:</span>
                              <span className="ml-2 text-gray-900">
                                {selectedReport.date_range_begin && selectedReport.date_range_end ? 
                                  `${new Date(selectedReport.date_range_begin).toLocaleDateString()} - ${new Date(selectedReport.date_range_end).toLocaleDateString()}` :
                                  'N/A'
                                }
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">Created:</span>
                              <span className="ml-2 text-gray-900">{new Date(selectedReport.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Statistics */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{selectedReport.total_records}</div>
                            <div className="text-sm text-blue-800">Total Records</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{selectedReport.pass_count}</div>
                            <div className="text-sm text-green-800">Passed</div>
                          </div>
                          <div className="bg-red-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-red-600">{selectedReport.fail_count}</div>
                            <div className="text-sm text-red-800">Failed</div>
                          </div>
                        </div>

                        {/* Individual Records */}
                        <div>
                          <h4 className="text-md font-medium text-gray-900 mb-3">Individual Records</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-300">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source IP</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Disposition</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">DKIM</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SPF</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Header From</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {selectedReport.records.map((record, index) => (
                                  <tr key={record.id || index} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-sm text-gray-900 font-mono">{record.source_ip}</td>
                                    <td className="px-3 py-2 text-sm text-gray-900">{record.count}</td>
                                    <td className="px-3 py-2 text-sm">
                                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                        record.disposition === 'quarantine' ? 'bg-yellow-100 text-yellow-800' :
                                        record.disposition === 'reject' ? 'bg-red-100 text-red-800' :
                                        'bg-green-100 text-green-800'
                                      }`}>
                                        {record.disposition || 'none'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-sm">
                                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                        record.dkim_result === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                      }`}>
                                        {record.dkim_result || 'N/A'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-sm">
                                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                        record.spf_result === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                      }`}>
                                        {record.spf_result || 'N/A'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-900 font-mono">{record.header_from || 'N/A'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={closeDetails}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 