"use client"

import { useState, useCallback } from "react"
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  ConnectionMode,
  BackgroundVariant,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { ColorInputNode, RadioInputNode, SliderInputNode, AnimatedOutputNode } from "./CustomNodes"    

const initialNodes = [
  {
    id: 'input-1',
    type: 'colorInput',
    position: { x: 50, y: 50 },
    data: { 
      label: 'Agent Type',
      value: 'Chatbot',
      color: '#3b82f6'
    }
  },
  {
    id: 'input-2',
    type: 'radioInput',
    position: { x: 50, y: 180 },
    data: { 
      label: 'Tools',
      value: 'Web Search',
      selected: 'Web Search'
    }
  },
  {
    id: 'input-3',
    type: 'sliderInput',
    position: { x: 50, y: 310 },
    data: { 
      label: 'Platform',
      value: 'WhatsApp',
      level: 75
    }
  },
  {
    id: 'output',
    type: 'animatedOutput',
    position: { x: 320, y: 180 },
    data: { 
      label: 'output',
      description: 'Your AI Agent'
    }
  }
]

const initialEdges = [
  {
    id: "e1-4",
    source: "input-1",
    target: "output",
    style: { stroke: "#3b82f6", strokeWidth: 2 },
    animated: true,
  },
  {
    id: "e2-4",
    source: "input-2",
    target: "output",
    style: { stroke: "#8b5cf6", strokeWidth: 2 },
    animated: true,
  },
  {
    id: "e3-4",
    source: "input-3",
    target: "output",
    style: { stroke: "#06b6d4", strokeWidth: 2 },
    animated: true,
  },
]

export function HeroFlow() {
  const [nodes, setNodes] = useState(initialNodes)
  const [edges, setEdges] = useState(initialEdges)

  const onNodesChange = useCallback(
    (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  )

  const onEdgesChange = useCallback(
    (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  )

  const onConnect = useCallback((params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)), [])

  const nodeTypes = {
    colorInput: ColorInputNode,
    radioInput: RadioInputNode,
    sliderInput: SliderInputNode,
    animatedOutput: AnimatedOutputNode,
  }

  return (
    <div className="w-full h-[500px] rounded-2xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "#3b82f6", strokeWidth: 2 },
        }}
        connectionMode={ConnectionMode.Loose}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" className="opacity-30" />
        <Controls showZoom={false} showFitView={false} showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  )
}
