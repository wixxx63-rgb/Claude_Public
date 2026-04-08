import React from 'react'
import { Shape, Text, Rect, Group } from 'react-konva'
import type Konva from 'konva'
import type { Edge, StoryNode } from '../../types/project'
import {
  NODE_RADIUS,
  DIM_OPACITY,
  FULL_OPACITY,
  EDGE_COLORS,
} from '../../utils/theme'
import {
  circleEdgePoint,
  edgeControlPoint,
  edgeMidpoint,
  quadraticPoint,
  quadraticTangent,
} from '../../utils/bezier'

export interface EdgeLineProps {
  edge: Edge
  fromNode: StoryNode
  toNode: StoryNode
  isHighlighted: boolean
  zoom: number
}

const ARROW_SIZE = 10

const EdgeLine: React.FC<EdgeLineProps> = ({
  edge,
  fromNode,
  toNode,
  isHighlighted,
  zoom,
}) => {
  const from = { x: fromNode.x, y: fromNode.y }
  const to = { x: toNode.x, y: toNode.y }

  const cp = edgeControlPoint(from, to)
  const startPt = circleEdgePoint(from, cp, NODE_RADIUS)
  const endPt = circleEdgePoint(to, cp, NODE_RADIUS)

  const strokeColor = edge.isDeath ? EDGE_COLORS.death : EDGE_COLORS.normal
  const opacity = isHighlighted ? FULL_OPACITY : DIM_OPACITY

  // Arrow direction at t=0.99
  const tangent = quadraticTangent(startPt, cp, endPt, 0.99)
  const tLen = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y) || 1
  const tx = tangent.x / tLen
  const ty = tangent.y / tLen

  const arrowTip = quadraticPoint(startPt, cp, endPt, 1.0)
  const arrowBase = {
    x: arrowTip.x - tx * ARROW_SIZE,
    y: arrowTip.y - ty * ARROW_SIZE,
  }
  const perpX = -ty
  const perpY = tx
  const arrowL = {
    x: arrowBase.x + perpX * (ARROW_SIZE * 0.45),
    y: arrowBase.y + perpY * (ARROW_SIZE * 0.45),
  }
  const arrowR = {
    x: arrowBase.x - perpX * (ARROW_SIZE * 0.45),
    y: arrowBase.y - perpY * (ARROW_SIZE * 0.45),
  }

  const midPt = edgeMidpoint(startPt, cp, endPt)

  const showLabel = zoom > 0.35 && edge.label && edge.label.trim().length > 0

  return (
    <Group opacity={opacity} listening={false}>
      {/* Bezier curve */}
      <Shape
        sceneFunc={(ctx: Konva.Context, shape: Konva.Shape) => {
          ctx.beginPath()
          ctx.moveTo(startPt.x, startPt.y)
          ctx.quadraticCurveTo(cp.x, cp.y, endPt.x, endPt.y)
          ctx.strokeShape(shape)
        }}
        stroke={strokeColor}
        strokeWidth={1.8}
        dash={edge.isDeath ? [8, 5] : undefined}
        fill="transparent"
      />

      {/* Arrowhead */}
      <Shape
        sceneFunc={(ctx: Konva.Context, shape: Konva.Shape) => {
          ctx.beginPath()
          ctx.moveTo(arrowTip.x, arrowTip.y)
          ctx.lineTo(arrowL.x, arrowL.y)
          ctx.lineTo(arrowR.x, arrowR.y)
          ctx.closePath()
          ctx.fillShape(shape)
        }}
        fill={strokeColor}
        stroke={strokeColor}
        strokeWidth={1}
      />

      {/* Edge label */}
      {showLabel && (
        <Group x={midPt.x} y={midPt.y}>
          <Rect
            x={-30}
            y={-9}
            width={60}
            height={18}
            fill="rgba(13,13,20,0.82)"
            cornerRadius={4}
            stroke={strokeColor}
            strokeWidth={0.8}
          />
          <Text
            text={edge.label}
            fontSize={11}
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#cccccc"
            width={60}
            height={18}
            align="center"
            verticalAlign="middle"
            x={-30}
            y={-9}
          />
        </Group>
      )}
    </Group>
  )
}

export default EdgeLine
