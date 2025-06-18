'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Navigation from './Navigation'
import Overview from './Overview'
import Reports from './Reports'
import ReportsEnhanced from './ReportsEnhanced'
import Analytics from './Analytics'
import Settings from './Settings'

export default function Dashboard() {
  const { user, session } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        setProfile(data)
      }
    }

    fetchProfile()
  }, [user])

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview session={session} setActiveTab={setActiveTab} />
      case 'reports':
        return <ReportsEnhanced session={session} />
      case 'analytics':
        return <Analytics session={session} />
      case 'settings':
        return <Settings session={session} profile={profile} />
      default:
        return <Overview session={session} setActiveTab={setActiveTab} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        profile={profile}
      />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {renderContent()}
      </main>
    </div>
  )
} 