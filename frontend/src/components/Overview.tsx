'use client'

import { useState, useEffect } from 'react'
import { ChartBarIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { api, handleApiError, type AnalyticsSummary } from '@/lib/api'

interface OverviewProps {
  session: any
  setActiveTab: (tab: string) => void
}

export default function Overview({ session, setActiveTab }: OverviewProps) {
  const [stats, setStats] = useState<AnalyticsSummary>({
    total_reports: 0,
    total_records: 0,
    pass_count: 0,
    fail_count: 0,
    pass_rate: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastReportDate, setLastReportDate] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch analytics summary
        const summary = await api.getAnalyticsSummary()
        setStats(summary)
        
        // Fetch reports to get the latest report date
        const reports = await api.getReports()
        if (reports.length > 0) {
          const latestReport = reports.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
          setLastReportDate(latestReport.created_at)
        }
        
      } catch (err) {
        setError(handleApiError(err))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const stats_data = [
    {
      name: 'Total Reports',
      value: stats.total_reports,
      icon: ChartBarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Passed DMARC',
      value: stats.pass_count,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Failed DMARC',
      value: stats.fail_count,
      icon: ExclamationTriangleIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      name: 'Last Report',
      value: lastReportDate ? new Date(lastReportDate).toLocaleDateString() : 'Never',
      icon: ClockIcon,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back! Here's what's happening with your DMARC reports.
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading data
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here's what's happening with your DMARC reports.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats_data.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-md ${item.bgColor}`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {item.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button 
              onClick={() => setActiveTab('reports')}
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-200"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-600 ring-4 ring-white">
                  <ChartBarIcon className="h-6 w-6" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  View Reports
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Browse and analyze your DMARC reports
                </p>
              </div>
            </button>

            <button 
              onClick={() => setActiveTab('settings')}
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-200"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-600 ring-4 ring-white">
                  <CheckCircleIcon className="h-6 w-6" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Configure IMAP
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Set up email server connection
                </p>
              </div>
            </button>

            <button 
              onClick={() => setActiveTab('analytics')}
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-200"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-600 ring-4 ring-white">
                  <ExclamationTriangleIcon className="h-6 w-6" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  View Analytics
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Analyze DMARC trends and patterns
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {stats.fail_count > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Attention needed
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You have {stats.fail_count} failed DMARC records that may need investigation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {stats.total_reports === 0 && (
        <div className="text-center">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No reports yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by configuring your IMAP connection to fetch DMARC reports.
          </p>
        </div>
      )}
    </div>
  )
} 