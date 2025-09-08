import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { login } from '../store/authSlice'

const LoginForm: React.FC = () => {
  const dispatch = useDispatch()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    dispatch(login('user'))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Sign in to Xero</h2>
          <p className="mt-2 text-sm text-gray-600">Connect your Xero account</p>
        </div>
        
        <div className="bg-white py-8 px-6 shadow-sm rounded-lg border">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <button 
              type="submit" 
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Sign in to Xero
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginForm