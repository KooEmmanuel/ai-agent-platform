"use client"

import React from "react"
import { motion } from "framer-motion"
import { Handle, Position } from "@xyflow/react"
import { Bot, Wrench, Globe } from "lucide-react"

// Custom Input Node for Agent Type
export function ColorInputNode({ data }: { data: any }) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="text-sm font-medium text-gray-700">{data.label}</div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: data.color }} />
        <span className="text-sm text-gray-600">{data.value}</span>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  )
}

// Custom Input Node for Tools
export function RadioInputNode({ data }: { data: any }) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
          <Wrench className="w-4 h-4 text-white" />
        </div>
        <div className="text-sm font-medium text-gray-700">{data.label}</div>
      </div>
      <div className="space-y-1">
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name="tools"
            checked={data.selected === "Web Search"}
            className="w-3 h-3 text-blue-600"
            readOnly
          />
          <span className="text-sm text-gray-600">Web Search</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name="tools"
            checked={data.selected === "Database"}
            className="w-3 h-3 text-blue-600"
            readOnly
          />
          <span className="text-sm text-gray-600">Database</span>
        </label>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  )
}

// Custom Input Node for Platform
export function SliderInputNode({ data }: { data: any }) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Globe className="w-4 h-4 text-white" />
        </div>
        <div className="text-sm font-medium text-gray-700">{data.label}</div>
      </div>
      <div className="relative">
        <input
          type="range"
          min="0"
          max="100"
          value={data.level}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          readOnly
        />
        <div className="text-xs text-gray-500 mt-1">{data.level}%</div>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  )
}

// Custom Output Node with Chat Bubble and Typing Indicator
export function AnimatedOutputNode({ data }: { data: any }) {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      
      {/* Chat Bubble Container */}
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
        {/* Animated Robot */}
        <div className="w-full h-full flex items-center justify-center">
          <iframe
            src="https://lottie.host/embed/e134d2a8-db43-4b1c-8722-e7507a188288/7E4yQdUsfQ.lottie"
            className="w-full h-full border-0"
            title="Animated Robot"
            style={{ minHeight: '200px' }}
          />
        </div>

        {/* Status indicator */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-white font-medium">Online</span>
        </div>

        {/* Label */}
        <div className="absolute bottom-4 left-4 text-sm font-medium text-white bg-black/20 px-3 py-1.5 rounded-lg">
          {data.label}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}
