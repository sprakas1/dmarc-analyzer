'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline'

interface AuthFormProps {
  mode: 'signin' | 'signup'
  onToggleMode: () => void
}

export default function AuthForm({ mode, onToggleMode }: AuthFormProps) {
  const { signIn, signUp, resetPassword, loading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isResetMode, setIsResetMode] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.email) {
      setError('Email is required')
      return
    }

    if (isResetMode) {
      const { error } = await resetPassword(formData.email)
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Password reset link sent to your email')
        setIsResetMode(false)
      }
      return
    }

    if (!formData.password) {
      setError('Password is required')
      return
    }

    if (mode === 'signup' && formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    console.log(`Attempting ${mode} for:`, formData.email)
    
    const result = mode === 'signin' 
      ? await signIn(formData.email, formData.password)
      : await signUp(formData.email, formData.password)

    console.log(`${mode} result:`, result)

    if (result.error) {
      console.error(`${mode} error:`, result.error)
      setError(result.error.message)
    } else if (mode === 'signup') {
      setSuccess('🎉 Account created successfully! Please check your email inbox (and spam folder) for a verification link to activate your account.')
      // Clear the form on successful signup
      setFormData({ email: '', password: '' })
    } else {
      // Sign in successful - user will be redirected by AuthContext
      console.log('Sign in successful')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const getTitle = () => {
    if (isResetMode) return 'Reset Password'
    return mode === 'signin' ? 'Sign In' : 'Create Account'
  }

  const getSubmitText = () => {
    if (isResetMode) return 'Send Reset Link'
    return mode === 'signin' ? 'Sign In' : 'Create Account'
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-xl rounded-lg px-8 py-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{getTitle()}</h2>
          <p className="mt-2 text-gray-600">
            {isResetMode 
              ? 'Enter your email to reset your password'
              : mode === 'signin' 
                ? 'Welcome back to DMARC Analyzer' 
                : 'Get started with DMARC Analyzer'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {!isResetMode && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {mode === 'signin' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending reset link...'}
                </>
              ) : (
                getSubmitText()
              )}
            </button>
          </div>
        </form>

        <div className="mt-6">
          {!isResetMode && mode === 'signin' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsResetMode(true)}
                className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {isResetMode && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsResetMode(false)}
                className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              >
                Back to sign in
              </button>
            </div>
          )}

          {!isResetMode && (
            <div className="mt-4 text-center">
              <span className="text-sm text-gray-600">
                {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                type="button"
                onClick={onToggleMode}
                className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline font-medium"
              >
                {mode === 'signin' ? 'Create one' : 'Sign in'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 