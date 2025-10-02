'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'

interface ConfigField {
  name: string
  type: string
  label: string
  description: string
  default?: any
  min?: number
  max?: number
  required?: boolean
  sensitive?: boolean
  options?: string[]
  accept?: string
  max_size?: string
  message?: string
  readonly?: boolean
  action?: string
  button_type?: string
}

interface ToolConfigFormProps {
  toolId: number
  initialConfig: Record<string, any>
  configSchema: {
    tool_name: string
    tool_description: string
    parameters: Record<string, any>
    capabilities: string[]
    config_fields: ConfigField[]
  }
  onSave: (config: Record<string, any>) => void
  onCancel: () => void
  saving?: boolean
  isConfigured?: boolean
}

export default function ToolConfigForm({
  toolId,
  initialConfig,
  configSchema,
  onSave,
  onCancel,
  saving = false,
  isConfigured = false
}: ToolConfigFormProps) {
  const [config, setConfig] = useState<Record<string, any>>(initialConfig)
  
  // Debug: Log when config changes
  console.log('🔧 ToolConfigForm - Current config state:', config)
  
  // Special logging for Email Sender
  if (configSchema && configSchema.tool_name === 'email_sender') {
    console.log('📧 Email Sender Form - Username in config:', config.username ? 'FOUND' : 'MISSING')
    console.log('📧 Email Sender Form - Password in config:', config.password ? 'FOUND' : 'MISSING')
  }
  
  // Debug: Track when initialConfig prop changes
  useEffect(() => {
    console.log('🔧 ToolConfigForm - initialConfig prop changed:', initialConfig)
    
    // Special logging for Email Sender
    if (configSchema && configSchema.tool_name === 'email_sender') {
      console.log('📧 Email Sender Form - Username in initialConfig:', initialConfig.username ? 'FOUND' : 'MISSING')
      console.log('📧 Email Sender Form - Password in initialConfig:', initialConfig.password ? 'FOUND' : 'MISSING')
    }
  }, [initialConfig, configSchema])

  const handleFieldChange = (fieldName: string, value: any) => {
    console.log(`🔧 ToolConfigForm: Field ${fieldName} changed to:`, value, typeof value)
    setConfig(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const handleSave = async () => {
    console.log('🔍 Frontend Debug - tool_name:', configSchema.tool_name)
    console.log('🔍 Frontend Debug - has auth_code:', !!config.auth_code)
    console.log('🔍 Frontend Debug - auth_code value:', config.auth_code)
    
    // If this is Google Suite tool and we have an auth code, exchange it for tokens
    if ((configSchema.tool_name?.toLowerCase().includes('google') || configSchema.tool_name === 'google_suite_tool') && config.auth_code) {
      console.log('🔍 Frontend Debug - Triggering authentication flow')
      try {
        const result = await apiClient.executeGoogleSuiteTool('authenticate', {
          auth_code: config.auth_code
        })
        
        if (result.success && result.result?.success) {
          // Update auth status to authenticated
          setConfig(prev => ({
            ...prev,
            auth_status: 'authenticated',
            auth_code: '', // Clear the auth code
            access_token: result.result.access_token,
            refresh_token: result.result.refresh_token
          }))
          alert('✅ Google authentication successful!')
        } else {
          alert('❌ Authentication failed: ' + (result.result?.error || result.error))
          return
        }
      } catch (error) {
        console.error('Authentication error:', error)
        alert('❌ Authentication failed: ' + error)
        return
      }
    }
    
    onSave(config)
  }

  const handleCancel = () => {
    onCancel()
  }

  const renderField = (field: ConfigField) => {
    const value = config[field.name] ?? field.default ?? ''

    switch (field.type) {
      case 'text':
        return (
          <input
            type={field.sensitive ? 'password' : 'text'}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              field.readonly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            placeholder={field.description}
            required={field.required}
            disabled={saving || field.readonly}
            readOnly={field.readonly}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, parseInt(e.target.value) || 0)}
            min={field.min}
            max={field.max}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={field.description}
            required={field.required}
            disabled={saving}
          />
        )

      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={saving}
            />
            <span className="ml-2 text-sm text-gray-600">{field.description}</span>
          </div>
        )

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required={field.required}
            disabled={saving}
          >
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            rows={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
            placeholder={field.description}
            required={field.required}
            disabled={saving}
          />
        )

      case 'file':
        console.log('📁 Rendering file field:', field)
        const fileValue = config[field.name]
        const hasExistingFile = fileValue && typeof fileValue === 'string' && fileValue !== 'path/to/credentials.json'
        
        return (
          <div className="space-y-2">
            <input
              type="file"
              accept={field.accept}
              onClick={() => console.log('📁 File input clicked')}
              onChange={(e) => {
                console.log('📁 File input changed:', e.target.files)
                const file = e.target.files?.[0]
                if (file) {
                  console.log('📁 File selected:', file.name, file.size, file.type)
                  // Check file size
                  const maxSize = field.max_size ? parseInt(field.max_size.replace('MB', '')) * 1024 * 1024 : 1024 * 1024
                  if (file.size > maxSize) {
                    alert(`File size must be less than ${field.max_size || '1MB'}`)
                    return
                  }
                  console.log('📁 Calling handleFieldChange with file:', file)
                  handleFieldChange(field.name, file)
                } else {
                  console.log('📁 No file selected')
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required={field.required}
              disabled={saving}
            />
            {value && (
              <div className="text-sm text-green-600">
                ✓ File selected: {value.name || value}
              </div>
            )}
            {hasExistingFile && !value && (
              <div className="text-sm text-blue-600">
                ✓ File already uploaded: {fileValue.split('/').pop()}
              </div>
            )}
          </div>
        )

      case 'info':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">{field.label}</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>{field.description}</p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'page_counter':
        const pageCount = value || 0;
        const hasMessage = field.message;
        
        return (
          <div className={`border rounded-lg p-4 ${pageCount > 0 ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className={`h-5 w-5 ${pageCount > 0 ? 'text-green-400' : 'text-blue-400'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${pageCount > 0 ? 'text-green-800' : 'text-blue-800'}`}>
                    {field.label}
                  </h3>
                  <p className={`text-xs ${pageCount > 0 ? 'text-green-600' : 'text-blue-600'}`}>
                    {hasMessage ? field.message : field.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  pageCount > 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {pageCount} pages
                </span>
              </div>
            </div>
          </div>
        )

      case 'button':
        const handleButtonClick = async () => {
          if (field.action === 'authenticate') {
            // Handle authentication button click
            try {
              const result = await apiClient.executeGoogleSuiteTool('get_auth_url')
              if (result.success && result.result && result.result.auth_url) {
                // Open auth URL in new tab
                const authWindow = window.open(result.result.auth_url, '_blank', 'width=600,height=700')
                // Update the auth_url field
                handleFieldChange('auth_url', result.result.auth_url)
                
                // Listen for messages from the callback page
                const handleMessage = (event: MessageEvent) => {
                  if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
                    console.log('✅ Google authentication successful!')
                    // Close the auth window
                    if (authWindow) {
                      authWindow.close()
                    }
                    // Remove the event listener
                    window.removeEventListener('message', handleMessage)
                    // Refresh the auth status
                    handleButtonClick() // This will trigger check_auth
                  }
                }
                
                window.addEventListener('message', handleMessage)
                
                // Clean up listener after 5 minutes
                setTimeout(() => {
                  window.removeEventListener('message', handleMessage)
                }, 300000)
                
              } else {
                const errorMsg = result.result?.message || result.error || 'Unknown error'
                if (result.result?.setup_required) {
                  alert(`🔧 Setup Required!\n\n${errorMsg}\n\nPlease follow the setup instructions and restart the backend server.`)
                } else {
                  alert('Failed to get authentication URL: ' + errorMsg)
                }
              }
            } catch (error) {
              console.error('Authentication error:', error)
              alert('Failed to initiate authentication')
            }
          } else if (field.action === 'check_auth') {
            // Handle check auth button click
            try {
              const result = await apiClient.executeGoogleSuiteTool('get_auth_status')
              if (result.success && result.result && result.result.status) {
                handleFieldChange('auth_status', result.result.status)
                alert('Authentication status: ' + result.result.status)
              } else {
                alert('Failed to check authentication status: ' + (result.error || result.result?.error || 'Unknown error'))
              }
            } catch (error) {
              console.error('Check auth error:', error)
              alert('Failed to check authentication status')
            }
          }
        }
        
        return (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleButtonClick}
              disabled={saving}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                field.button_type === 'primary'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:bg-gray-100'
              }`}
            >
              {field.label}
            </button>
            <p className="text-sm text-gray-600">{field.description}</p>
          </div>
        )

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={field.description}
            disabled={saving}
          />
        )
    }
  }

  console.log('🔧 ToolConfigForm render - configSchema:', configSchema)
  console.log('🔧 ToolConfigForm render - config_fields:', configSchema.config_fields)
  
  return (
    <div className="space-y-6">
      {/* Tool Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">{configSchema.tool_name}</h4>
        <p className="text-sm text-gray-600 mb-3">{configSchema.tool_description}</p>
        
        {configSchema.capabilities.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Capabilities:</p>
            <div className="flex flex-wrap gap-1">
              {configSchema.capabilities.map((capability, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {capability}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configuration Fields */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Configuration</h4>
        
        {configSchema.config_fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field)}
            <p className="text-xs text-gray-500">{field.description}</p>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3 pt-4">
        <button
          onClick={handleCancel}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : (isConfigured ? 'Update Configuration' : 'Save Configuration')}
        </button>
      </div>
    </div>
  )
} 