import React, { useEffect, useRef } from 'react'
import { Line } from 'react-konva'
import type Konva from 'konva'
import type { StoryNode } from '../../types/project'

export interface DragEdgePreviewProps {
  fromNode: StoryNode
  toX: number
  toY: number
}

const DragEdgePreview: React.FC<DragEdgePreviewProps> = ({ fromNode, toX, toY }) => {
  const lineRef = useRef<Konva.Line>(null)
  const rafRef = useRef<number>(0)
  const dashOffsetRef = useRef(0)

  useEffect(() => {
    const animate = () => {
      dashOffsetRef.current = (dashOffsetRef.current - 1) % 10
      if (lineRef.current) {
        lineRef.current.dashOffset(dashOffsetRef.current)
        lineRef.current.getLayer()?.batchDraw()
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <Line
      ref={lineRef}
      points={[fromNode.x, fromNode.y, toX, toY]}
      stroke="#ffb700"
      strokeWidth={2}
      dash={[6, 4]}
      dashOffset={0}
      listening={false}
      opacity={0.85}
    />
  )
}

export default DragEdgePreview
