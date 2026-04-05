import React, { useState, useRef } from 'react'
import type { Project } from '../types'

const S_TOKEN = 'nf:cloud_token'
const S_GIST  = 'nf:cloud_gist_id'
const FILENAME = 'narrative-flow-save.json'

interface Props { onLoad: (p: Project) => void }
type Tab = 'gist' | 'file'

function normalizeProject(raw: any): Project {
  return {
    name: raw.meta?.projectName ?? raw.name ?? 'Story',
    nodes: (raw.nodes ?? []).map((n: any) => ({
      ...n,
      isPov: n.isPov ?? false,
      povCharacter: n.povCharacter ?? null,
      dialogueLines: n.dialogueLines ?? [],
      branches: n.branches ?? [],
    })),
    edges: raw.edges ?? [],
    characters: (raw.characters ?? []).map((c: any) => ({
      color: '#888888',
      sprites: [],
      ...c,
    })),
    assets: raw.assets ?? [],
  }
}

export default function LoadScreen({ onLoad }: Props) {
  const [tab,    setTab]    = useState<Tab>('gist')
  const [token,  setToken]  = useState(() => localStorage.getItem(S_TOKEN) ?? '')
  const [gistId, setGistId] = useState(() => localStorage.getItem(S_GIST)  ?? '')
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function saveToken(v: string) { setToken(v); localStorage.setItem(S_TOKEN, v) }
  function saveGist(v: string)  { setGistId(v); localStorage.setItem(S_GIST, v) }

  async function loadFromGist() {
    if (!token) { setError('Enter your GitHub token.'); return }
    if (!gistId) { setError('Enter a Gist ID.'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(d.message ?? `HTTP ${res.status}`)
      }
      const data: any = await res.json()
      const content = data.files?.[FILENAME]?.content
      if (!content) throw new Error(`"${FILENAME}" not found. Push from the desktop app first.`)
      onLoad(normalizeProject(JSON.parse(content)))
    } catch (e: any) {
      setError(e.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  function loadFromFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string)
        onLoad(normalizeProject(raw))
      } catch {
        setError('Invalid JSON file.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg)', padding: 'env(safe-area-inset-top) 0 env(safe-area-inset-bottom)'
    }}>
      {/* Header */}
      <div style={{ padding: '40px 24px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>
          Narrative Flow
        </div>
        <div style={{ fontSize: 13, color: 'var(--dim)', marginTop: 4 }}>Mobile Player</div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', margin: '0 24px 20px',
        background: 'var(--bg2)', borderRadius: 10, padding: 4
      }}>
        {(['gist', 'file'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setError('') }}
            style={{
              flex: 1, padding: '10px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: tab === t ? 'var(--bg3)' : 'transparent',
              color: tab === t ? 'var(--text)' : 'var(--dim)',
              border: tab === t ? '1px solid var(--border)' : '1px solid transparent',
              width: 'auto'
            }}
          >
            {t === 'gist' ? '☁ Cloud Sync' : '📁 Load File'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
        {tab === 'gist' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--dim)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                GITHUB TOKEN
              </label>
              <input
                type="password"
                value={token}
                onChange={e => saveToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                style={{ fontFamily: 'monospace' }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
              <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6, lineHeight: 1.5 }}>
                Same token used in the desktop app. Needs <strong>gist</strong> scope.
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--dim)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                GIST ID
              </label>
              <input
                value={gistId}
                onChange={e => saveGist(e.target.value)}
                placeholder="Paste the Gist ID from desktop"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>

            {error && (
              <div style={{
                background: '#2a0f0f', border: '1px solid #d0404040',
                borderRadius: 10, padding: '12px 14px',
                fontSize: 14, color: 'var(--danger)', lineHeight: 1.5
              }}>
                {error}
              </div>
            )}

            <button className="btn-primary" onClick={loadFromGist} disabled={busy}>
              {busy ? 'Loading…' : '↓ Load from Cloud'}
            </button>

            <div style={{
              background: 'var(--bg2)', borderRadius: 10, padding: '14px 16px',
              fontSize: 13, color: 'var(--dim)', lineHeight: 1.6
            }}>
              <strong style={{ color: 'var(--muted)' }}>How to sync:</strong><br />
              1. Desktop app → <strong>☁ Sync</strong> → Push to Cloud<br />
              2. Come back here, tap <em>Load from Cloud</em>
            </div>
          </div>
        )}

        {tab === 'file' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: 'var(--bg2)', border: '2px dashed var(--border)',
              borderRadius: 14, padding: '32px 20px', textAlign: 'center'
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
              <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 16 }}>
                Load a Narrative Flow save file (.json)
              </div>
              <button
                className="btn-ghost"
                style={{ width: 'auto', padding: '12px 28px', fontSize: 15 }}
                onClick={() => fileRef.current?.click()}
              >
                Choose File
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={loadFromFile}
              />
            </div>

            {error && (
              <div style={{
                background: '#2a0f0f', border: '1px solid #d0404040',
                borderRadius: 10, padding: '12px 14px',
                fontSize: 14, color: 'var(--danger)'
              }}>
                {error}
              </div>
            )}

            <div style={{
              background: 'var(--bg2)', borderRadius: 10, padding: '14px 16px',
              fontSize: 13, color: 'var(--dim)', lineHeight: 1.6
            }}>
              Export from desktop: <strong>File → Export JSON</strong>, then send it to your phone (AirDrop, Drive, email…)
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 24px', textAlign: 'center', fontSize: 11, color: 'var(--dim)' }}>
        Narrative Flow v2 · Mobile Player
      </div>
    </div>
  )
}
