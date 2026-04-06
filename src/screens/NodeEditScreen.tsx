import React, { useState } from 'react'
import { useStore } from '../store'
import type { Branch, DialogueLine } from '../types'

const NODE_TYPES = ['scene', 'decision', 'death', 'ending', 'grok'] as const
const NODE_STATUSES = ['todo', 'inprog', 'done'] as const
const STATUS_LABEL: Record<string, string> = { todo: 'To Do', inprog: 'In Progress', done: 'Done' }
const TYPE_LABEL: Record<string, string> = { scene: '🎭 Scene', decision: '⚡ Decision', death: '💀 Death', ending: '🏁 Ending', grok: '🤖 Grok' }

interface Props { nodeId: string; onBack: () => void }

export default function NodeEditScreen({ nodeId, onBack }: Props) {
  const { project, updateNode, addDialogueLine, updateDialogueLine, deleteDialogueLine, addBranch, updateBranch, deleteBranch } = useStore(s => ({
    project: s.project,
    updateNode: s.updateNode,
    addDialogueLine: s.addDialogueLine,
    updateDialogueLine: s.updateDialogueLine,
    deleteDialogueLine: s.deleteDialogueLine,
    addBranch: s.addBranch,
    updateBranch: s.updateBranch,
    deleteBranch: s.deleteBranch,
  }))

  const node = project.nodes.find(n => n.id === nodeId)
  const [expandedDL, setExpandedDL] = useState<string | null>(null)
  const [expandedBranch, setExpandedBranch] = useState<number | null>(null)
  const [section, setSection] = useState<'info' | 'dialogue' | 'branches'>('info')

  if (!node) return (
    <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <p style={{ color: 'var(--dim)' }}>Scene not found.</p>
      <button className="btn-ghost" style={{ width: 'auto', marginTop: 16 }} onClick={onBack}>← Back</button>
    </div>
  )

  function field(label: string, el: React.ReactNode) {
    return (
      <div style={{ marginBottom: 18 }}>
        <label className="field-label">{label}</label>
        {el}
      </div>
    )
  }

  function addDL() {
    const line: DialogueLine = { id: crypto.randomUUID(), speaker: null, text: '', position: 'left' }
    addDialogueLine(nodeId, line)
    setExpandedDL(line.id)
  }

  function addBranchItem() {
    const branch: Branch = { option: '', desc: '', leads: [], effects: [], condition: null }
    addBranch(nodeId, branch)
    setExpandedBranch(node.branches.length)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        background: '#0d1117', borderBottom: '1px solid #1e2736',
      }}>
        <button className="icon-btn" onClick={onBack}>←</button>
        <input
          value={node.title}
          onChange={e => updateNode(nodeId, { title: e.target.value })}
          style={{
            flex: 1, background: 'transparent', border: 'none',
            fontSize: 17, fontWeight: 700, color: '#e0e8ff', outline: 'none',
          }}
          placeholder="Scene title…"
        />
      </div>

      {/* Type + Status pills */}
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {NODE_TYPES.map(t => (
            <button key={t}
              onClick={() => updateNode(nodeId, { type: t })}
              style={{
                padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: node.type === t ? '#4a80d4' : '#1e2a3e',
                color: node.type === t ? '#fff' : '#7a8aaa',
              }}>
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {NODE_STATUSES.map(s => (
            <button key={s}
              onClick={() => updateNode(nodeId, { status: s })}
              style={{
                padding: '5px 10px', borderRadius: 20, fontSize: 12, border: 'none', cursor: 'pointer',
                background: node.status === s ? '#2a3a2a' : '#1e2a3e',
                color: node.status === s ? '#60c480' : '#7a8aaa',
              }}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      <div className="tab-bar" style={{ margin: '12px 16px 0' }}>
        {(['info', 'dialogue', 'branches'] as const).map(s => (
          <button key={s} className={`tab${section === s ? ' active' : ''}`} onClick={() => setSection(s)}>
            {s === 'info' ? '📋 Info' : s === 'dialogue' ? '💬 Dialogue' : '⚡ Branches'}
            {s === 'dialogue' && node.dialogueLines.length > 0 && (
              <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>({node.dialogueLines.length})</span>
            )}
            {s === 'branches' && node.branches.length > 0 && (
              <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>({node.branches.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>

        {/* INFO section */}
        {section === 'info' && (
          <div>
            {field('SUMMARY', (
              <textarea
                value={node.summary}
                onChange={e => updateNode(nodeId, { summary: e.target.value })}
                rows={4} placeholder="What happens in this scene…"
              />
            ))}
            {field('PATH / ACT', (
              <input value={node.path} onChange={e => updateNode(nodeId, { path: e.target.value })}
                placeholder="e.g. Act 1 / Chapter 3" />
            ))}
            {field('TRIGGER', (
              <textarea value={node.trigger} onChange={e => updateNode(nodeId, { trigger: e.target.value })}
                rows={2} placeholder="What causes this scene to occur…" />
            ))}
            {field('CONSEQUENCES', (
              <textarea value={node.consequences} onChange={e => updateNode(nodeId, { consequences: e.target.value })}
                rows={2} placeholder="Long-term effects…" />
            ))}

            {/* Characters in scene */}
            <div style={{ marginBottom: 18 }}>
              <label className="field-label">CHARACTERS IN SCENE</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {project.characters.map(c => {
                  const active = node.chars.includes(c.id)
                  return (
                    <button key={c.id}
                      onClick={() => updateNode(nodeId, {
                        chars: active ? node.chars.filter(id => id !== c.id) : [...node.chars, c.id]
                      })}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 13,
                        border: `2px solid ${active ? c.color : '#2a3a56'}`,
                        background: active ? `${c.color}22` : '#161c2e',
                        color: active ? c.color : '#7a8aaa', cursor: 'pointer',
                      }}>
                      {c.name}
                    </button>
                  )
                })}
                {project.characters.length === 0 && (
                  <span style={{ fontSize: 13, color: '#4a5a7a' }}>No characters yet — add them via 👥</span>
                )}
              </div>
            </div>

            {field('DAY', (
              <input type="number" value={node.day ?? ''} onChange={e => updateNode(nodeId, { day: e.target.value ? Number(e.target.value) : null })}
                placeholder="Day number (optional)" />
            ))}
          </div>
        )}

        {/* DIALOGUE section */}
        {section === 'dialogue' && (
          <div>
            {node.dialogueLines.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#4a5a7a' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
                <p style={{ fontSize: 14 }}>No dialogue lines yet.</p>
              </div>
            )}
            {node.dialogueLines.map((dl, idx) => {
              const expanded = expandedDL === dl.id
              const char = project.characters.find(c => c.id === dl.speaker)
              return (
                <div key={dl.id} style={{
                  background: '#161c2e', borderRadius: 12, marginBottom: 10,
                  border: expanded ? '1px solid #2a4a7a' : '1px solid #1e2836',
                  overflow: 'hidden',
                }}>
                  {/* Collapsed row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}
                    onClick={() => setExpandedDL(expanded ? null : dl.id)}>
                    <div style={{
                      width: 6, height: 32, borderRadius: 3, flexShrink: 0,
                      background: char?.color ?? '#3a4a6a',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: char?.color ?? '#7a8aaa' }}>
                        {char?.name ?? 'Narrator'}
                      </div>
                      <div style={{ fontSize: 13, color: '#9aa5bb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {dl.text || <span style={{ color: '#4a5a7a' }}>Empty line…</span>}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteDialogueLine(nodeId, dl.id) }}
                      style={{ background: 'none', border: 'none', color: '#4a5a7a', fontSize: 18, cursor: 'pointer', padding: 4 }}>
                      ✕
                    </button>
                    <span style={{ color: '#4a5a7a', fontSize: 14 }}>{expanded ? '▲' : '▼'}</span>
                  </div>
                  {/* Expanded */}
                  {expanded && (
                    <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1e2836', paddingTop: 12 }}>
                      <div style={{ marginBottom: 10 }}>
                        <label className="field-label">SPEAKER</label>
                        <select value={dl.speaker ?? ''} onChange={e => updateDialogueLine(nodeId, dl.id, { speaker: e.target.value || null })}>
                          <option value="">Narrator</option>
                          {project.characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="field-label">LINE</label>
                        <textarea value={dl.text} rows={3}
                          onChange={e => updateDialogueLine(nodeId, dl.id, { text: e.target.value })}
                          placeholder="Dialogue text…" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            <button className="btn-ghost" style={{ marginTop: 4 }} onClick={addDL}>
              + Add Line
            </button>
          </div>
        )}

        {/* BRANCHES section */}
        {section === 'branches' && (
          <div>
            {node.branches.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#4a5a7a' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
                <p style={{ fontSize: 14 }}>No branches yet.</p>
              </div>
            )}
            {node.branches.map((br, idx) => {
              const expanded = expandedBranch === idx
              const leadTitles = br.leads.map(id => project.nodes.find(n => n.id === id)?.title ?? id)
              return (
                <div key={idx} style={{
                  background: '#161c2e', borderRadius: 12, marginBottom: 10,
                  border: expanded ? '1px solid #3a3060' : '1px solid #1e2836', overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}
                    onClick={() => setExpandedBranch(expanded ? null : idx)}>
                    <div style={{ width: 6, height: 32, borderRadius: 3, background: '#9060d0', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#c0a0e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {br.option || <span style={{ color: '#4a5a7a' }}>Option {idx + 1}</span>}
                      </div>
                      {leadTitles.length > 0 && (
                        <div style={{ fontSize: 11, color: '#5e7a9a' }}>→ {leadTitles.join(', ')}</div>
                      )}
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteBranch(nodeId, idx) }}
                      style={{ background: 'none', border: 'none', color: '#4a5a7a', fontSize: 18, cursor: 'pointer', padding: 4 }}>
                      ✕
                    </button>
                    <span style={{ color: '#4a5a7a', fontSize: 14 }}>{expanded ? '▲' : '▼'}</span>
                  </div>
                  {expanded && (
                    <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1e2836', paddingTop: 12 }}>
                      <div style={{ marginBottom: 10 }}>
                        <label className="field-label">OPTION TEXT</label>
                        <input value={br.option} onChange={e => updateBranch(nodeId, idx, { option: e.target.value })}
                          placeholder="Choice shown to player…" />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label className="field-label">DESCRIPTION</label>
                        <textarea value={br.desc} rows={2} onChange={e => updateBranch(nodeId, idx, { desc: e.target.value })}
                          placeholder="Additional context…" />
                      </div>
                      <div>
                        <label className="field-label">LEADS TO (tap to toggle)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {project.nodes.filter(n => n.id !== nodeId).map(n => {
                            const active = br.leads.includes(n.id)
                            return (
                              <button key={n.id}
                                onClick={() => updateBranch(nodeId, idx, {
                                  leads: active ? br.leads.filter(id => id !== n.id) : [...br.leads, n.id]
                                })}
                                style={{
                                  padding: '5px 12px', borderRadius: 16, fontSize: 12,
                                  border: `1.5px solid ${active ? '#9060d0' : '#2a3a56'}`,
                                  background: active ? '#2a1a4a' : '#161c2e',
                                  color: active ? '#c0a0e8' : '#7a8aaa', cursor: 'pointer',
                                }}>
                                {n.title}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            <button className="btn-ghost" style={{ marginTop: 4 }} onClick={addBranchItem}>
              + Add Branch
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
