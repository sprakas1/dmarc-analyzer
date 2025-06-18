'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Filter, Download, Eye, Calendar, Building2, Shield, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { api, handleApiError, type DMARCReport } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

interface ReportsEnhancedProps {
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

export default function ReportsEnhanced({ session }: ReportsEnhancedProps) {
  const [reports, setReports] = useState<DMARCReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'fail'>('all')
  const [domainFilter, setDomainFilter] = useState<string>('all')
  const [selectedReport, setSelectedReport] = useState<DetailedReport | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
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
    } finally {
      setDetailsLoading(false)
    }
  }

  // Get unique domains for filter
  const uniqueDomains = useMemo(() => {
    const domains = [...new Set(reports.map(report => report.domain))]
    return domains.sort()
  }, [reports])

  // Filter and search reports
  const filteredReports = useMemo(() => {
    let filtered = reports

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.org_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.report_id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => {
        const isPass = report.pass_count > report.fail_count
        return statusFilter === 'pass' ? isPass : !isPass
      })
    }

    // Domain filter
    if (domainFilter !== 'all') {
      filtered = filtered.filter(report => report.domain === domainFilter)
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.date_range_begin ? new Date(a.date_range_begin) : new Date(a.created_at)
      const dateB = b.date_range_begin ? new Date(b.date_range_begin) : new Date(b.created_at)
      return dateB.getTime() - dateA.getTime()
    })
  }, [reports, searchTerm, statusFilter, domainFilter])

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentReports = filteredReports.slice(startIndex, startIndex + itemsPerPage)

  const getOverallResult = (report: DMARCReport): 'pass' | 'fail' => {
    return report.pass_count > report.fail_count ? 'pass' : 'fail'
  }

  const getStatusBadge = (result: 'pass' | 'fail') => {
    return result === 'pass' ? (
      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Pass
      </Badge>
    ) : (
      <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">
        <XCircle className="w-3 h-3 mr-1" />
        Fail
      </Badge>
    )
  }

  const getPassRate = (report: DMARCReport) => {
    if (report.total_records === 0) return 0
    return Math.round((report.pass_count / report.total_records) * 100)
  }

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Organization', 'Domain', 'Policy', 'Total Records', 'Passed', 'Failed', 'Pass Rate'],
      ...filteredReports.map(report => [
        report.date_range_begin ? new Date(report.date_range_begin).toLocaleDateString() : new Date(report.created_at).toLocaleDateString(),
        report.org_name,
        report.domain,
        report.domain_policy || 'none',
        report.total_records.toString(),
        report.pass_count.toString(),
        report.fail_count.toString(),
        `${getPassRate(report)}%`
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dmarc-reports-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-muted rounded w-48 animate-pulse" />
            <div className="h-4 bg-muted rounded w-96 mt-2 animate-pulse" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DMARC Reports</h1>
          <p className="text-muted-foreground">
            Monitor and analyze your DMARC authentication reports
          </p>
        </div>
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <h3 className="font-medium text-destructive">Error loading reports</h3>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DMARC Reports</h1>
          <p className="text-muted-foreground">
            Monitor and analyze your DMARC authentication reports
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredReports.length} filtered
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.reduce((sum, report) => sum + report.total_records, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all reports
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reports.reduce((sum, report) => sum + report.pass_count, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Authentication passed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {reports.reduce((sum, report) => sum + report.fail_count, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Authentication failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: 'all' | 'pass' | 'fail') => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reports</SelectItem>
                <SelectItem value="pass">Mostly Passed</SelectItem>
                <SelectItem value="fail">Mostly Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {uniqueDomains.map(domain => (
                  <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No reports found</h3>
            <p className="mt-2 text-muted-foreground">
              {reports.length === 0 
                ? "Configure your IMAP connection to start receiving DMARC reports."
                : "Try adjusting your search or filter criteria."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Pass Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentReports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>
                            {report.date_range_begin
                              ? new Date(report.date_range_begin).toLocaleDateString()
                              : new Date(report.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Received {new Date(report.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{report.org_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.domain}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{report.domain_policy || 'none'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm">
                        <div className="font-medium">{report.total_records.toLocaleString()}</div>
                        <div className="text-muted-foreground">
                          {report.pass_count}P / {report.fail_count}F
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-medium">
                        {getPassRate(report)}%
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(getOverallResult(report))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => fetchReportDetails(report.id)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>DMARC Report Details</DialogTitle>
                            <DialogDescription>
                              Detailed analysis of DMARC report from {report.org_name}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {detailsLoading ? (
                            <div className="flex justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                          ) : selectedReport && (
                            <div className="space-y-6">
                              {/* Report Summary */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Report Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-2">
                                      <div><span className="font-medium">Organization:</span> {selectedReport.org_name}</div>
                                      <div><span className="font-medium">Domain:</span> {selectedReport.domain}</div>
                                      <div><span className="font-medium">Report ID:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded">{selectedReport.report_id}</code></div>
                                      <div><span className="font-medium">Email:</span> {selectedReport.email || 'N/A'}</div>
                                    </div>
                                    <div className="space-y-2">
                                      <div><span className="font-medium">Policy:</span> <Badge variant="secondary">{selectedReport.domain_policy || 'none'}</Badge></div>
                                      <div><span className="font-medium">Policy %:</span> {selectedReport.policy_percentage || 100}%</div>
                                      <div><span className="font-medium">Report for:</span> {
                                        selectedReport.date_range_begin && selectedReport.date_range_end ? 
                                          `${new Date(selectedReport.date_range_begin).toLocaleDateString()} - ${new Date(selectedReport.date_range_end).toLocaleDateString()}` :
                                          'N/A'
                                      }</div>
                                      <div><span className="font-medium">Received on:</span> {new Date(selectedReport.created_at).toLocaleString()}</div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Statistics */}
                              <div className="grid grid-cols-3 gap-4">
                                <Card>
                                  <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold text-primary">{selectedReport.total_records}</div>
                                    <div className="text-sm text-muted-foreground">Total Records</div>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold text-green-600">{selectedReport.pass_count}</div>
                                    <div className="text-sm text-muted-foreground">Passed</div>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold text-red-600">{selectedReport.fail_count}</div>
                                    <div className="text-sm text-muted-foreground">Failed</div>
                                  </CardContent>
                                </Card>
                              </div>

                              {/* Individual Records */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Individual Records</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Source IP</TableHead>
                                        <TableHead>Count</TableHead>
                                        <TableHead>Disposition</TableHead>
                                        <TableHead>DKIM</TableHead>
                                        <TableHead>SPF</TableHead>
                                        <TableHead>Header From</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedReport.records.map((record, index) => (
                                        <TableRow key={record.id || index}>
                                          <TableCell className="font-mono text-sm">{record.source_ip}</TableCell>
                                          <TableCell>{record.count}</TableCell>
                                          <TableCell>
                                            <Badge variant={
                                              record.disposition === 'quarantine' ? 'default' :
                                              record.disposition === 'reject' ? 'destructive' :
                                              'secondary'
                                            }>
                                              {record.disposition || 'none'}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant={record.dkim_result === 'pass' ? 'default' : 'destructive'}>
                                              {record.dkim_result || 'N/A'}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant={record.spf_result === 'pass' ? 'default' : 'destructive'}>
                                              {record.spf_result || 'N/A'}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="font-mono text-sm">{record.header_from || 'N/A'}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredReports.length)} of {filteredReports.length} results
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 