import React, { useState } from 'react'
import { useStore } from '../store'
import type { Character } from '../types'

const PALETTE = [
  '#e06060', '#e0904a', '#d4c84a', '#60c480', '#4a80d4',
  '#9060d0', '#d060a0', '#60c4c4', '#888888', '#c0b090',
]

interface Props { onBack: () => void }

export default function CharactersScreen({ onBack }: Props) {
  const { project, addCharacter, updateCharacter, deleteCharacter } = useStore(s => ({
    project: s.project,
    addCharacter: s.addCharacter,
    updateCharacter: s.updateCharacter,
    deleteCharacter: s.deleteCharacter,
  }))
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<Character>>({})

  function startEdit(c: Character) {
    setEditing(c.id)
    setDraft({ name: c.name, color: c.color })
  }

  function saveEdit() {
    if (!editing) return
    updateCharacter(editing, draft)
    setEditing(null)
    setDraft({})
  }

  function addNew() {
    const c: Character = {
      id: crypto.randomUUID(),
      name: 'New Character',
      color: PALETTE[project.characters.length % PALETTE.length],
      sprites: [],
    }
    addCharacter(c)
    startEdit(c.id)
    setDraft({ name: c.name, color: c.color })
  }

  function startEdit(id: string) {
    const c = project.characters.find(ch => ch.id === id)
    if (!c) return
    setEditing(id)
    setDraft({ name: c.name, color: c.color })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        background: '#0d1117', borderBottom: '1px solid #1e2736',
      }}>
        <button className="icon-btn" onClick={onBack}>←</button>
        <h2 style={{ flex: 1, fontSize: 17, fontWeight: 700, color: '#e0e8ff', margin: 0 }}>Characters</h2>
        <button className="icon-btn" onClick={addNew} title="Add character" style={{ fontSize: 22 }}>+</button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        {project.characters.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#4a5a7a' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
            <p style={{ fontSize: 15 }}>No characters yet.</p>
            <button className="btn-primary" style={{ marginTop: 16, width: 'auto', padding: '12px 28px' }} onClick={addNew}>
              + Add Character
            </button>
          </div>
        )}

        {project.characters.map(c => {
          const isEditing = editing === c.id
          return (
            <div key={c.id} style={{
              background: '#161c2e', borderRadius: 14, marginBottom: 12,
              border: isEditing ? `1px solid ${c.color}60` : '1px solid #1e2836',
              overflow: 'hidden',
            }}>
              {/* Character row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 22, flexShrink: 0,
                  background: `${c.color}33`, border: `2px solid ${c.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>
                  {c.name[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#e0e8ff' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: c.color, marginTop: 2 }}>{c.color}</div>
                </div>
                <button onClick={() => isEditing ? saveEdit() : startEdit(c.id)}
                  style={{ background: 'none', border: 'none', color: isEditing ? '#60c480' : '#4a80d4', fontSize: 14, cursor: 'pointer', padding: '6px 10px' }}>
                  {isEditing ? '✓ Save' : 'Edit'}
                </button>
                <button onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteCharacter(c.id) }}
                  style={{ background: 'none', border: 'none', color: '#5e3a3a', fontSize: 18, cursor: 'pointer', padding: 4 }}>
                  🗑
                </button>
              </div>

              {/* Edit form */}
              {isEditing && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid #1e2836' }}>
                  <div style={{ paddingTop: 14, marginBottom: 14 }}>
                    <label className="field-label">NAME</label>
                    <input value={draft.name ?? ''} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                      placeholder="Character name…" autoFocus />
                  </div>
                  <div>
                    <label className="field-label">COLOR</label>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                      {PALETTE.map(col => (
                        <button key={col} onClick={() => setDraft(d => ({ ...d, color: col }))}
                          style={{
                            width: 36, height: 36, borderRadius: 18, background: col, cursor: 'pointer',
                            border: draft.color === col ? `3px solid #fff` : '3px solid transparent',
                            boxShadow: draft.color === col ? `0 0 0 2px ${col}` : 'none',
                          }} />
                      ))}
                      <input type="color" value={draft.color ?? '#888888'}
                        onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                        style={{ width: 36, height: 36, padding: 2, borderRadius: 18, border: '2px solid #2a3a56', cursor: 'pointer', background: '#161c2e' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
