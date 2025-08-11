'use client'

import { useState } from 'react'

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
}

export default function ToolConfigForm({
  toolId,
  initialConfig,
  configSchema,
  onSave,
  onCancel,
  saving = false
}: ToolConfigFormProps) {
  const [config, setConfig] = useState<Record<string, any>>(initialConfig)

  const handleFieldChange = (fieldName: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const handleSave = () => {
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={field.description}
            required={field.required}
            disabled={saving}
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
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  )
} 