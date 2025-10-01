'use client'

import React, { useState } from 'react'
import { 
  FolderIcon, 
  FolderOpenIcon, 
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { Workspace } from '../lib/api'

interface Conversation {
  id: string
  messages?: Array<{
    content: string
    role: string
  }>
  created_at: string
  workspace_id?: number
}

interface WorkspaceTreeViewProps {
  workspaces: Workspace[]
  conversations: Conversation[]
  selectedWorkspaceId?: number
  currentConversationId?: number | null
  onWorkspaceSelect: (workspaceId: number | undefined) => void
  onConversationSelect: (conversationId: string) => void
  onNewChat: (workspaceId: number) => void
  loadingConversations?: boolean
  loadingConversation?: boolean
}

export default function WorkspaceTreeView({
  workspaces,
  conversations,
  selectedWorkspaceId,
  currentConversationId,
  onWorkspaceSelect,
  onConversationSelect,
  onNewChat,
  loadingConversations = false,
  loadingConversation = false
}: WorkspaceTreeViewProps) {
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<number>>(new Set())

  const toggleWorkspace = (workspaceId: number) => {
    setExpandedWorkspaces(prev => {
      const newSet = new Set(prev)
      if (newSet.has(workspaceId)) {
        newSet.delete(workspaceId)
      } else {
        newSet.add(workspaceId)
      }
      return newSet
    })
  }

  // Group conversations by workspace
  const conversationsByWorkspace = conversations.reduce((acc, conversation) => {
    const workspaceId = conversation.workspace_id || 'default'
    if (!acc[workspaceId]) {
      acc[workspaceId] = []
    }
    acc[workspaceId].push(conversation)
    return acc
  }, {} as Record<string | number, Conversation[]>)

  return (
    <div className="space-y-1">

      {/* Workspaces */}
      {workspaces.map((workspace) => {
        const isExpanded = expandedWorkspaces.has(workspace.id)
        const isSelected = selectedWorkspaceId === workspace.id
        const workspaceConversations = conversationsByWorkspace[workspace.id] || []

        return (
          <div key={workspace.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleWorkspace(workspace.id)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-3 h-3" />
                ) : (
                  <ChevronRightIcon className="w-3 h-3" />
                )}
              </button>
              
              <button
                onClick={() => onWorkspaceSelect(workspace.id)}
                className={`flex-1 flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                }`}
              >
                <span className="text-sm flex-shrink-0">{workspace.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{workspace.name}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onNewChat(workspace.id)
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="New chat in this workspace"
                >
                  <ChatBubbleLeftRightIcon className="w-3 h-3" />
                </button>
              </button>
            </div>

            {/* Conversations under this workspace */}
            {isExpanded && (
              <div className="ml-6 space-y-1">
                {loadingConversations ? (
                  <div className="text-xs text-gray-500 p-2">Loading conversations...</div>
                ) : workspaceConversations.length > 0 ? (
                  workspaceConversations.slice(0, 5).map((conversation) => {
                    const isActive = currentConversationId === parseInt(conversation.id)
                    return (
                      <button
                        key={conversation.id}
                        onClick={() => onConversationSelect(conversation.id)}
                        className={`w-full flex items-center gap-2 p-1.5 rounded-md text-left transition-colors ${
                          isActive
                            ? 'bg-blue-100 border border-blue-200'
                            : 'hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-700 truncate">
                            {loadingConversation && isActive ? (
                              <span className="text-blue-600">Loading...</span>
                            ) : (
                              conversation.messages?.length > 0 
                                ? conversation.messages[0].content.substring(0, 20) + '...' 
                                : 'Empty conversation'
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="text-xs text-gray-500 p-2">No conversations yet</div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
