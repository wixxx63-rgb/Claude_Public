import React, { useState, useEffect, useRef } from 'react'
import type { Project, StoryNode, Branch } from '../types'

interface Props {
  project: Project
  startNodeId: string
  onExit: () => void
}

interface PlayState {
  nodeId: string
  history: string[]
  lineIndex: number   // -1 = show summary; 0+ = dialogue line index
}

export default function PlayerScreen({ project, startNodeId, onExit }: Props) {
  const [state, setState] = useState<PlayState>({
    nodeId: startNodeId,
    history: [],
    lineIndex: -1,
  })
  const [showMenu, setShowMenu] = useState(false)
  const touchStartX = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const node = project.nodes.find(n => n.id === state.nodeId)
  const charMap = Object.fromEntries(project.characters.map(c => [c.id, c]))
  const outEdges = project.edges.filter(e => e.from === state.nodeId)
  const labelEdges = outEdges.filter(e => e.label)    // choice edges
  const seqEdge   = outEdges.find(e => !e.label && !e.isDeath)  // sequential edge

  const hasDialogue = (node?.dialogueLines?.length ?? 0) > 0
  const totalLines  = node?.dialogueLines?.length ?? 0
  const isOnSummary = state.lineIndex === -1
  const currentLine = hasDialogue && state.lineIndex >= 0 ? node!.dialogueLines[state.lineIndex] : null

  const isEnd = node?.type === 'death' || node?.type === 'ending'
  const isDecision = labelEdges.length > 0 && (isOnSummary || !hasDialogue || state.lineIndex >= totalLines - 1)
  const canAdvance = !isDecision && !isEnd && (seqEdge || (hasDialogue && state.lineIndex < totalLines - 1))

  // Scroll to top when node or line changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [state.nodeId, state.lineIndex])

  function advance() {
    if (!node) return
    // If on summary and has dialogue, go to first line
    if (isOnSummary && hasDialogue) {
      setState(s => ({ ...s, lineIndex: 0 }))
      return
    }
    // If in dialogue and not at last line, advance line
    if (hasDialogue && state.lineIndex < totalLines - 1) {
      setState(s => ({ ...s, lineIndex: s.lineIndex + 1 }))
      return
    }
    // Move to next sequential node
    if (seqEdge) {
      setState(s => ({
        nodeId: seqEdge.to,
        history: [...s.history, s.nodeId],
        lineIndex: -1,
      }))
    }
  }

  function chooseOption(branch: Branch) {
    const target = branch.leads[0] ?? outEdges.find(e => e.label === branch.option)?.to
    if (!target) return
    setState(s => ({
      nodeId: target,
      history: [...s.history, s.nodeId],
      lineIndex: -1,
    }))
  }

  function goBack() {
    setState(s => {
      if (s.lineIndex > 0) return { ...s, lineIndex: s.lineIndex - 1 }
      if (s.lineIndex === 0 && hasDialogue) return { ...s, lineIndex: -1 }
      if (s.history.length === 0) return s
      const prev = s.history[s.history.length - 1]
      return { nodeId: prev, history: s.history.slice(0, -1), lineIndex: -1 }
    })
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) < 60) return
    if (dx > 0) goBack()
    else if (canAdvance) advance()
  }

  if (!node) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--dim)' }}>
      Scene not found.
    </div>
  )

  const povChar = node.isPov && node.povCharacter ? charMap[node.povCharacter] : null

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', userSelect: 'none' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top) + 10px) 16px 10px',
        borderBottom: '1px solid var(--border)', flexShrink: 0
      }}>
        <button
          onClick={() => setShowMenu(true)}
          style={{ background: 'transparent', color: 'var(--dim)', fontSize: 20, padding: '4px 8px', width: 'auto' }}
        >☰</button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
            {node.title || node.id}
          </div>
          {(node.day != null || node.block) && (
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
              {node.day != null ? `Day ${node.day}` : ''}{node.block ? ` · ${node.block}` : ''}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {povChar && (
            <div style={{
              fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
              background: povChar.color + '22', color: povChar.color,
              border: `1px solid ${povChar.color}60`
            }}>POV {povChar.name}</div>
          )}
          <div style={{
            fontSize: 11, color: 'var(--dim)',
            padding: '4px 8px', background: 'var(--bg2)',
            borderRadius: 8, border: '1px solid var(--border)'
          }}>
            {node.type}
          </div>
        </div>
      </div>

      {/* Main scroll area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>

        {/* Current dialogue line */}
        {currentLine ? (
          <DialogueLineView
            line={currentLine}
            charMap={charMap}
            lineNum={state.lineIndex + 1}
            total={totalLines}
          />
        ) : (
          /* Summary / scene text */
          <div>
            {node.summary && (
              <p style={{
                fontSize: 16, lineHeight: 1.75, color: 'var(--text)',
                marginBottom: 20, whiteSpace: 'pre-wrap'
              }}>
                {node.summary}
              </p>
            )}
            {!node.summary && (
              <p style={{ fontSize: 15, color: 'var(--dim)', fontStyle: 'italic' }}>
                (No content yet)
              </p>
            )}
          </div>
        )}

        {/* Choices */}
        {isDecision && labelEdges.length > 0 && (
          <div style={{ marginTop: 24, marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--dim)', fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>
              CHOOSE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {node.branches.map((branch, i) => (
                <button
                  key={i}
                  className="btn-choice"
                  onClick={() => chooseOption(branch)}
                >
                  <span style={{ color: 'var(--accent)', fontWeight: 700, marginRight: 8 }}>
                    {branch.option}.
                  </span>
                  {branch.desc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* End state */}
        {isEnd && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              background: node.type === 'death' ? '#2a0f0f' : '#0f2a18',
              border: `1px solid ${node.type === 'death' ? '#d0404060' : '#40a06060'}`,
              borderRadius: 14, padding: '20px',
              textAlign: 'center', color: node.type === 'death' ? '#d04040' : '#40a060'
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>
                {node.type === 'death' ? '✖' : '★'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                {node.type === 'death' ? 'Story Ended' : 'The End'}
              </div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                {node.title}
              </div>
            </div>
          </div>
        )}

        <div style={{ height: 100 }} />
      </div>

      {/* Bottom controls */}
      {!isDecision && (
        <div style={{
          display: 'flex', gap: 10,
          padding: `12px 20px calc(env(safe-area-inset-bottom) + 12px)`,
          borderTop: '1px solid var(--border)', flexShrink: 0,
          background: 'var(--bg)'
        }}>
          <button
            className="btn-ghost"
            style={{ flex: 0, width: 52, padding: '14px', fontSize: 18 }}
            onClick={goBack}
            disabled={state.history.length === 0 && state.lineIndex <= -1}
          >◀</button>

          {isEnd ? (
            <button className="btn-ghost" style={{ flex: 1 }} onClick={onExit}>
              ↩ Back to Library
            </button>
          ) : canAdvance ? (
            <button className="btn-primary" style={{ flex: 1 }} onClick={advance}>
              {isOnSummary && hasDialogue ? 'Read Dialogue ▶' : 'Continue ▶'}
            </button>
          ) : (
            <button className="btn-ghost" style={{ flex: 1, opacity: 0.4 }} disabled>
              Tap a choice above
            </button>
          )}
        </div>
      )}

      {/* Menu overlay */}
      {showMenu && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end', zIndex: 100
          }}
          onClick={() => setShowMenu(false)}
        >
          <div
            style={{
              background: 'var(--bg3)', borderRadius: '20px 20px 0 0', width: '100%',
              padding: `24px 24px calc(env(safe-area-inset-bottom) + 24px)`,
              display: 'flex', flexDirection: 'column', gap: 12
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              {project.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--dim)' }}>
              {project.nodes.length} scenes · {state.history.length} visited
            </div>
            <button className="btn-ghost" onClick={goBack} disabled={state.history.length === 0} style={{ textAlign: 'left', paddingLeft: 18 }}>
              ◀ Go Back
            </button>
            <button className="btn-ghost" onClick={() => { setState({ nodeId: startNodeId, history: [], lineIndex: -1 }); setShowMenu(false) }} style={{ textAlign: 'left', paddingLeft: 18 }}>
              ↩ Restart
            </button>
            <button
              onClick={() => { setShowMenu(false); onExit() }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--danger)', padding: '14px 18px', textAlign: 'left', fontSize: 15, fontWeight: 600, width: '100%' }}
            >
              ✕ Exit Story
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DialogueLineView({
  line, charMap, lineNum, total
}: {
  line: { speaker: string; text: string }
  charMap: Record<string, { name: string; color: string }>
  lineNum: number
  total: number
}) {
  const char = charMap[line.speaker]
  const color = char?.color ?? '#9aa5bb'
  const name  = char?.name  ?? line.speaker

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 16 }}>
        Line {lineNum} / {total}
      </div>
      <div style={{
        background: 'var(--bg2)', border: `1px solid var(--border)`,
        borderLeft: `4px solid ${color}`,
        borderRadius: '0 14px 14px 0', padding: '18px 20px', marginBottom: 8
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 10 }}>
          {name}
        </div>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
          {line.text}
        </p>
      </div>
    </div>
  )
}
