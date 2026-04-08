import React from 'react'
import { Circle, Text } from 'react-konva'
import { NODE_RADIUS, LINK_HANDLE_COLOR } from '../../utils/theme'

export interface LinkHandleProps {
  nodeId: string
  onLinkStart: (nodeId: string) => void
}

const LinkHandle: React.FC<LinkHandleProps> = ({ nodeId, onLinkStart }) => {
  return (
    <>
      <Circle
        x={NODE_RADIUS}
        y={0}
        radius={8}
        fill={LINK_HANDLE_COLOR}
        stroke="#fff"
        strokeWidth={1.5}
        onMouseDown={(e) => {
          e.cancelBubble = true
          onLinkStart(nodeId)
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage()
          if (stage) stage.container().style.cursor = 'crosshair'
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage()
          if (stage) stage.container().style.cursor = 'default'
        }}
        onClick={(e) => { e.cancelBubble = true }}
        onDblClick={(e) => { e.cancelBubble = true }}
      />
      <Text
        x={NODE_RADIUS - 5}
        y={-6}
        width={10}
        align="center"
        text="+"
        fontSize={12}
        fontStyle="bold"
        fill="#fff"
        listening={false}
      />
    </>
  )
}

export default LinkHandle
