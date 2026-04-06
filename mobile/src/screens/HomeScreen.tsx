import React, { useState, useRef } from 'react'
import { useStore } from '../store'
import { normalizeProject, emptyProject } from '../types'

const S_TOKEN = 'nf:cloud_token'
const S_GIST  = 'nf:cloud_gist_id'
const FILENAME = 'narrative-flow-save.json'

interface Props { onOpen: () => void }

export default function HomeScreen({ onOpen }: Props) {
  const loadProject = useStore(s => s.loadProject)
  const [tab, setTab] = useState<'recent' | 'file' | 'cloud'>('recent')
  const [token, setToken] = useState(() => localStorage.getItem(S_TOKEN) ?? '')
  const [gistId, setGistId] = useState(() => localStorage.getItem(S_GIST) ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function saveToken(v: string) { setToken(v); localStorage.setItem(S_TOKEN, v) }
  function saveGist(v: string) { setGistId(v); localStorage.setItem(S_GIST, v) }

  function createNew() {
    loadProject(emptyProject())
    onOpen()
  }

  function loadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string)
        loadProject(normalizeProject(raw))
        onOpen()
      } catch {
        setError('Could not read file — invalid format.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function loadFromGist() {
    if (!token) { setError('Enter your GitHub token.'); return }
    if (!gistId) { setError('Enter a Gist ID.'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        }
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as any
        throw new Error(d.message ?? `HTTP ${res.status}`)
      }
      const data: any = await res.json()
      const content = data.files?.[FILENAME]?.content
      if (!content) throw new Error(`"${FILENAME}" not found in this Gist. Push from desktop first.`)
      loadProject(normalizeProject(JSON.parse(content)))
      onOpen()
    } catch (e: any) {
      setError(e.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      {/* Hero */}
      <div style={{ padding: '48px 24px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12, lineHeight: 1 }}>✍️</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 6px' }}>
          Narrative Flow
        </h1>
        <p style={{ fontSize: 14, color: 'var(--dim)', margin: 0 }}>Story editor</p>
      </div>

      {/* New Story */}
      <div style={{ padding: '0 20px 24px' }}>
        <button className="btn-primary" style={{ fontSize: 17, padding: '16px' }} onClick={createNew}>
          + New Story
        </button>
      </div>

      {/* Tab bar */}
      <div className="tab-bar" style={{ margin: '0 20px 20px' }}>
        {(['file', 'cloud'] as const).map(t => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => { setTab(t); setError('') }}>
            {t === 'file' ? '📁 Open File' : '☁ Cloud'}
          </button>
        ))}
      </div>

      {/* File tab */}
      {tab === 'file' && (
        <div className="panel">
          <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, marginBottom: 20 }}>
              Open a <strong>.nflow</strong> or <strong>.json</strong> save file
            </p>
            <button className="btn-ghost" style={{ width: 'auto', padding: '12px 32px' }}
              onClick={() => fileRef.current?.click()}>
              Choose File
            </button>
            <input ref={fileRef} type="file" accept=".json,.nflow,application/json"
              style={{ display: 'none' }} onChange={loadFile} />
          </div>
          {error && <div className="error-box">{error}</div>}
        </div>
      )}

      {/* Cloud tab */}
      {tab === 'cloud' && (
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="field-label">GITHUB TOKEN</label>
            <input type="password" value={token} onChange={e => saveToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              autoComplete="off" autoCorrect="off" autoCapitalize="off" />
          </div>
          <div>
            <label className="field-label">GIST ID</label>
            <input value={gistId} onChange={e => saveGist(e.target.value)}
              placeholder="Paste Gist ID from desktop"
              autoCorrect="off" autoCapitalize="off" />
          </div>
          {error && <div className="error-box">{error}</div>}
          <button className="btn-primary" onClick={loadFromGist} disabled={busy}>
            {busy ? 'Loading…' : '↓ Load from Cloud'}
          </button>
          <p style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.6 }}>
            Desktop: <strong>☁ Sync → Push to Cloud</strong>, then paste the Gist ID here.
          </p>
        </div>
      )}
    </div>
  )
}
