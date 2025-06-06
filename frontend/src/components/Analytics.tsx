'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer } from 'recharts'
import { CalendarIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface AnalyticsProps {
  session: any
}

const COLORS = ['#10B981', '#EF4444', '#F59E0B']

export default function Analytics({ session }: AnalyticsProps) {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  
  // Mock data for charts
  const [trendData] = useState([
    { date: '2024-01-09', pass: 142, fail: 8 },
    { date: '2024-01-10', pass: 156, fail: 12 },
    { date: '2024-01-11', pass: 168, fail: 15 },
    { date: '2024-01-12', pass: 145, fail: 18 },
    { date: '2024-01-13', pass: 172, fail: 22 },
    { date: '2024-01-14', pass: 189, fail: 14 },
    { date: '2024-01-15', pass: 203, fail: 16 }
  ])

  const [pieData] = useState([
    { name: 'DMARC Pass', value: 85, color: '#10B981' },
    { name: 'DMARC Fail', value: 12, color: '#EF4444' },
    { name: 'No Policy', value: 3, color: '#F59E0B' }
  ])

  const [domainData] = useState([
    { domain: 'example.com', messages: 1250, pass: 1180, fail: 70 },
    { domain: 'test.com', messages: 850, pass: 790, fail: 60 },
    { domain: 'mydomain.com', messages: 620, pass: 580, fail: 40 },
    { domain: 'company.com', messages: 340, pass: 320, fail: 20 },
    { domain: 'other.com', messages: 180, pass: 160, fail: 20 }
  ])

  useEffect(() => {
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow h-80">
                <div className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-48 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Analyze DMARC trends and patterns across your domains.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Average Pass Rate
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    91.2%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Daily Average
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    168 messages
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Failed Messages
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    105 total
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Trend Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">DMARC Results Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value, name) => [value, name === 'pass' ? 'Passed' : 'Failed']}
              />
              <Legend />
              <Line type="monotone" dataKey="pass" stroke="#10B981" strokeWidth={2} name="Passed" />
              <Line type="monotone" dataKey="fail" stroke="#EF4444" strokeWidth={2} name="Failed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">DMARC Compliance Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Domain Breakdown */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Messages by Domain</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={domainData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="domain" tick={{ fontSize: 12 }} width={100} />
              <Tooltip />
              <Bar dataKey="messages" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pass/Fail Comparison */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pass vs Fail by Domain</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={domainData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="domain" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="pass" stackId="a" fill="#10B981" name="Passed" />
              <Bar dataKey="fail" stackId="a" fill="#EF4444" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-green-400 bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ArrowTrendingUpIcon className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  <strong>Good news!</strong> Your DMARC pass rate has improved by 3.2% over the last week.
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Attention needed:</strong> test.com has a higher than average failure rate. Consider reviewing SPF/DKIM configuration.
                </p>
              </div>
            </div>
          </div>

          <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Peak activity:</strong> Most email traffic occurs between 9 AM - 5 PM on weekdays.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 