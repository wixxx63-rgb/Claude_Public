import React, { useRef, useCallback } from 'react'
import { Group, Circle, Arc, Text, Rect } from 'react-konva'
import type Konva from 'konva'
import type { StoryNode } from '../../types/project'
import {
  NODE_COLORS,
  STATUS_COLORS,
  NODE_RADIUS,
  DIM_OPACITY,
  FULL_OPACITY,
} from '../../utils/theme'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import LinkHandle from './LinkHandle'

export interface NodeCircleProps {
  node: StoryNode
  isSelected: boolean
  isDirectChild: boolean
  activeNodeId: string | null
  zoom: number
  linkMode: boolean
  onLinkStart: (nodeId: string, x: number, y: number) => void
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

const NodeCircle: React.FC<NodeCircleProps> = ({
  node,
  isSelected,
  isDirectChild,
  activeNodeId,
  zoom,
  linkMode,
  onLinkStart,
}) => {
  const moveNode = useProjectStore((s) => s.moveNode)
  const setActiveNode = useUIStore((s) => s.setActiveNode)
  const openSceneMode = useUIStore((s) => s.openSceneMode)

  const colors = NODE_COLORS[node.type] ?? NODE_COLORS.scene
  const statusColor = STATUS_COLORS[node.status]

  // Dimming: dim if there is an active node and this node is neither selected nor a direct child
  const opacity =
    activeNodeId !== null && !isSelected && !isDirectChild ? DIM_OPACITY : FULL_OPACITY

  // Drag tracking refs
  const isDragging = useRef(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const groupRef = useRef<Konva.Group>(null)

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button !== 0) return
      e.cancelBubble = true

      isDragging.current = false
      dragStartPos.current = { x: e.evt.clientX, y: e.evt.clientY }

      if (linkMode) return // In link mode: no dragging

      const stage = e.target.getStage()
      if (!stage) return

      const onMouseMove = (me: MouseEvent) => {
        const dx = me.clientX - dragStartPos.current.x
        const dy = me.clientY - dragStartPos.current.y
        if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) > 5) {
          isDragging.current = true
          if (stage.container()) stage.container().style.cursor = 'grabbing'
        }
        if (isDragging.current && groupRef.current) {
          const scale = stage.scaleX()
          const stagePos = stage.position()
          // Convert screen delta to world delta
          const worldX = node.x + dx / scale
          const worldY = node.y + dy / scale
          groupRef.current.position({ x: worldX, y: worldY })
          groupRef.current.getLayer()?.batchDraw()
        }
      }

      const onMouseUp = (me: MouseEvent) => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        if (stage.container()) stage.container().style.cursor = 'default'

        if (isDragging.current) {
          // Commit final position
          const scale = stage.scaleX()
          const dx2 = me.clientX - dragStartPos.current.x
          const dy2 = me.clientY - dragStartPos.current.y
          const worldX = node.x + dx2 / scale
          const worldY = node.y + dy2 / scale
          moveNode(node.id, worldX, worldY)
        } else {
          // It was a click
          setActiveNode(node.id)
        }
        isDragging.current = false
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [node, linkMode, moveNode, setActiveNode]
  )

  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true
      if (linkMode) {
        setActiveNode(node.id)
      }
    },
    [node.id, linkMode, setActiveNode]
  )

  const handleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true
      openSceneMode(node.id)
    },
    [node.id, openSceneMode]
  )

  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true
      e.evt.preventDefault()
      console.log('context:', node.id)
    },
    [node.id]
  )

  const handleLinkStart = useCallback(
    (nodeId: string) => {
      const group = groupRef.current
      const stage = group?.getStage()
      if (!stage || !group) {
        onLinkStart(nodeId, node.x, node.y)
        return
      }
      const scale = stage.scaleX()
      const stagePos = stage.position()
      const screenX = node.x * scale + stagePos.x + NODE_RADIUS * scale
      const screenY = node.y * scale + stagePos.y
      onLinkStart(nodeId, screenX, screenY)
    },
    [node, onLinkStart]
  )

  const handleMouseEnter = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (stage && !linkMode) stage.container().style.cursor = 'pointer'
    },
    [linkMode]
  )

  const handleMouseLeave = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (stage) stage.container().style.cursor = 'default'
    },
    []
  )

  return (
    <Group
      ref={groupRef}
      x={node.x}
      y={node.y}
      opacity={opacity}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDblClick={handleDblClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main circle */}
      <Circle
        radius={NODE_RADIUS}
        fill={colors.fill}
        stroke={isSelected ? '#ffffff' : colors.stroke}
        strokeWidth={isSelected ? 3 : 2}
        shadowBlur={isSelected ? 12 : 0}
        shadowColor={colors.stroke}
        shadowOpacity={0.6}
      />

      {/* Status ring arc */}
      {statusColor && node.status !== 'todo' && (
        <Arc
          innerRadius={NODE_RADIUS - 5}
          outerRadius={NODE_RADIUS - 1}
          angle={node.status === 'done' ? 360 : 180}
          rotation={-90}
          fill={statusColor}
          listening={false}
        />
      )}

      {/* Node title */}
      <Text
        text={truncate(node.title, 14)}
        fontSize={13}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="#ffffff"
        width={NODE_RADIUS * 2 - 12}
        align="center"
        x={-(NODE_RADIUS - 6)}
        y={-9}
        listening={false}
      />

      {/* Node ID text — only shown when zoom > 0.45 */}
      {zoom > 0.45 && (
        <Text
          text={node.id}
          fontSize={11}
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#888888"
          align="center"
          width={NODE_RADIUS * 2}
          x={-NODE_RADIUS}
          y={64}
          listening={false}
        />
      )}

      {/* Gold dot: branches indicator */}
      {node.branches.length > 0 && (
        <Circle
          x={36}
          y={-36}
          radius={5}
          fill="#ffb700"
          stroke="#fff"
          strokeWidth={1}
          listening={false}
        />
      )}

      {/* Purple dot: grokHandoff indicator */}
      {node.grokHandoff && node.grokHandoff.length > 0 && (
        <Circle
          x={-36}
          y={-36}
          radius={5}
          fill="#9b59b6"
          stroke="#fff"
          strokeWidth={1}
          listening={false}
        />
      )}

      {/* Background image placeholder icon */}
      {node.background && (
        <Rect
          x={-6}
          y={38}
          width={12}
          height={12}
          fill="#ffffff"
          opacity={0.7}
          cornerRadius={2}
          listening={false}
        />
      )}

      {/* Link handle — only shown in link mode */}
      {linkMode && (
        <LinkHandle nodeId={node.id} onLinkStart={handleLinkStart} />
      )}
    </Group>
  )
}

export default NodeCircle
