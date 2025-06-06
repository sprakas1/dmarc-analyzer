'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@headlessui/react'
import { InboxIcon, KeyIcon, BellIcon, UserIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import { api, handleApiError, type IMAPConfig } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface SettingsProps {
  session: any
  profile?: any
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function Settings({ session, profile }: SettingsProps) {
  const { signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [configsLoading, setConfigsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState(true)
  const [autoFetch, setAutoFetch] = useState(false)
  const [imapConfigs, setImapConfigs] = useState<IMAPConfig[]>([])
  const [showNewConfigForm, setShowNewConfigForm] = useState(false)
  const [editingConfig, setEditingConfig] = useState<IMAPConfig | null>(null)
  const [newConfig, setNewConfig] = useState({
    name: '',
    host: '',
    port: 993,
    username: '',
    password: '',
    use_ssl: true,
    folder: 'INBOX'
  })

  useEffect(() => {
    fetchImapConfigs()
  }, [])

  const fetchImapConfigs = async () => {
    try {
      setConfigsLoading(true)
      setError(null)
      const configs = await api.getImapConfigs()
      setImapConfigs(configs)
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setConfigsLoading(false)
    }
  }

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      
      if (editingConfig) {
        // Update existing config
        const configData: any = { ...newConfig }
        if (!configData.password) {
          delete configData.password // Don't update password if not provided
        }
        const updatedConfig = await api.updateImapConfig(editingConfig.id, configData)
        setImapConfigs(imapConfigs.map(config => 
          config.id === editingConfig.id ? updatedConfig : config
        ))
        setEditingConfig(null)
      } else {
        // Create new config
        const createdConfig = await api.createImapConfig(newConfig)
        setImapConfigs([...imapConfigs, createdConfig])
      }
      
      setShowNewConfigForm(false)
      setNewConfig({
        name: '',
        host: '',
        port: 993,
        username: '',
        password: '',
        use_ssl: true,
        folder: 'INBOX'
      })
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleProcessEmails = async (configId: string) => {
    try {
      setLoading(true)
      const result = await api.processEmails(configId)
      alert(`${result.message}\nStatus: ${result.status}`)
    } catch (err) {
      alert(`Error: ${handleApiError(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this IMAP configuration?')) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      await api.deleteImapConfig(configId)
      setImapConfigs(imapConfigs.filter(config => config.id !== configId))
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleEditConfig = (config: IMAPConfig) => {
    setEditingConfig(config)
    setNewConfig({
      name: config.name,
      host: config.host,
      port: config.port,
      username: config.username,
      password: '', // Don't populate password for security
      use_ssl: config.use_ssl,
      folder: config.folder
    })
    setShowNewConfigForm(true)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      setError('Failed to sign out')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your DMARC analyzer preferences and email settings.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            Profile Information
          </h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={session?.user?.email || ''}
                disabled
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">User ID</label>
              <input
                type="text"
                value={session?.user?.id || ''}
                disabled
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* IMAP Configurations */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <InboxIcon className="h-5 w-5 mr-2" />
              IMAP Configurations
            </h3>
            <button
              onClick={() => setShowNewConfigForm(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Configuration
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Configure your email server settings to fetch DMARC reports automatically.
          </p>

          {configsLoading ? (
            <div className="mt-4 space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {imapConfigs.length === 0 ? (
                <div className="text-center py-8">
                  <InboxIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No IMAP configurations</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by adding your first email server configuration.
                  </p>
                </div>
              ) : (
                imapConfigs.map((config) => (
                  <div key={config.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{config.name}</h4>
                        <p className="text-sm text-gray-500">
                          {config.host}:{config.port} ({config.username})
                        </p>
                        <div className="flex items-center mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            config.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {config.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {config.use_ssl && (
                            <span className="ml-2 inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              SSL
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleProcessEmails(config.id)}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          {loading ? 'Processing...' : 'Process Emails'}
                        </button>
                        <button
                          onClick={() => handleEditConfig(config)}
                          className="inline-flex items-center px-2 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteConfig(config.id)}
                          className="inline-flex items-center px-2 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* New Configuration Form */}
          {showNewConfigForm && (
            <div className="mt-6 border-t pt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                {editingConfig ? 'Edit IMAP Configuration' : 'Add New IMAP Configuration'}
              </h4>
              <form onSubmit={handleCreateConfig} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Configuration Name</label>
                  <input
                    type="text"
                    value={newConfig.name}
                    onChange={(e) => setNewConfig({...newConfig, name: e.target.value})}
                    placeholder="My Email Server"
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IMAP Server</label>
                    <input
                      type="text"
                      value={newConfig.host}
                      onChange={(e) => setNewConfig({...newConfig, host: e.target.value})}
                      placeholder="imap.gmail.com"
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Port</label>
                    <input
                      type="number"
                      value={newConfig.port}
                      onChange={(e) => setNewConfig({...newConfig, port: parseInt(e.target.value)})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Username</label>
                    <input
                      type="text"
                      value={newConfig.username}
                      onChange={(e) => setNewConfig({...newConfig, username: e.target.value})}
                      placeholder="your-email@example.com"
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      value={newConfig.password}
                      onChange={(e) => setNewConfig({...newConfig, password: e.target.value})}
                      placeholder="App password or regular password"
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Folder</label>
                  <input
                    type="text"
                    value={newConfig.folder}
                    onChange={(e) => setNewConfig({...newConfig, folder: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="ssl"
                    type="checkbox"
                    checked={newConfig.use_ssl}
                    onChange={(e) => setNewConfig({...newConfig, use_ssl: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="ssl" className="ml-2 block text-sm text-gray-900">
                    Use SSL/TLS connection
                  </label>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? (editingConfig ? 'Updating...' : 'Creating...') : (editingConfig ? 'Update Configuration' : 'Create Configuration')}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewConfigForm(false)
                      setEditingConfig(null)
                      setNewConfig({
                        name: '',
                        host: '',
                        port: 993,
                        username: '',
                        password: '',
                        use_ssl: true,
                        folder: 'INBOX'
                      })
                    }}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <BellIcon className="h-5 w-5 mr-2" />
            Notification Settings
          </h3>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                <p className="text-sm text-gray-500">Receive email alerts for DMARC failures</p>
              </div>
              <Switch
                checked={notifications}
                onChange={setNotifications}
                className={classNames(
                  notifications ? 'bg-blue-600' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                )}
              >
                <span
                  aria-hidden="true"
                  className={classNames(
                    notifications ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                  )}
                />
              </Switch>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Automatic Email Fetch</h4>
                <p className="text-sm text-gray-500">Automatically fetch new reports every hour</p>
              </div>
              <Switch
                checked={autoFetch}
                onChange={setAutoFetch}
                className={classNames(
                  autoFetch ? 'bg-blue-600' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                )}
              >
                <span
                  aria-hidden="true"
                  className={classNames(
                    autoFetch ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                  )}
                />
              </Switch>
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <KeyIcon className="h-5 w-5 mr-2" />
            Security
          </h3>
          <div className="mt-4">
            <button
              onClick={handleSignOut}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 