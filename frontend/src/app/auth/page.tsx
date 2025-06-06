'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import AuthForm from '@/components/auth/AuthForm'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  if (user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            DMARC Analyzer
          </h1>
          <p className="text-lg text-gray-600">
            Secure email authentication made simple
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <AuthForm 
          mode={mode} 
          onToggleMode={() => setMode(mode === 'signin' ? 'signup' : 'signin')} 
        />
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          By using DMARC Analyzer, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
} 