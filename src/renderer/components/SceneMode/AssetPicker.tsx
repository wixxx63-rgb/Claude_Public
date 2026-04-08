import React, { useState } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { IPC } from '../../types/ipc'
import styles from './SceneMode.module.css'

// ─── Props ────────────────────────────────────────────────────────────────────

interface AssetPickerProps {
  type: 'image' | 'audio'
  value: string | null
  onChange: (assetId: string | null) => void
  projectDir: string
  /** If true, render as a compact inline button instead of the full expanded grid */
  compact?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildAssetUrl(projectDir: string, filename: string, fallbackPath: string): string {
  if (projectDir) {
    return `asset://local${projectDir}/assets/${filename}`
  }
  return fallbackPath
}

// ─── Component ────────────────────────────────────────────────────────────────

const AssetPicker: React.FC<AssetPickerProps> = ({
  type,
  value,
  onChange,
  projectDir,
  compact = false,
}) => {
  const assets = useProjectStore((s) => s.project.assets)
  const addAsset = useProjectStore((s) => s.addAsset)

  const [expanded, setExpanded] = useState(false)
  const [importing, setImporting] = useState(false)

  const filtered = assets.filter((a) => a.type === type)
  const selectedAsset = value ? assets.find((a) => a.id === value) : null

  async function handleImport() {
    if (!window.electronAPI) return
    setImporting(true)
    try {
      const result = await window.electronAPI.invoke(IPC.ASSET_IMPORT, {
        type,
        projectDir,
      })
      if (result?.asset) {
        addAsset(result.asset)
        onChange(result.asset.id)
        setExpanded(false)
      }
    } finally {
      setImporting(false)
    }
  }

  function handleSelect(assetId: string) {
    onChange(assetId === value ? null : assetId)
    setExpanded(false)
  }

  // ─── Compact mode: toggle button + popover ───────────────────────────────

  if (compact) {
    return (
      <div className={styles.assetPickerCompact}>
        <button
          className={styles.assetPickerToggleBtn}
          onClick={() => setExpanded((v) => !v)}
          title={selectedAsset ? selectedAsset.name : `Pick ${type}`}
        >
          {selectedAsset ? selectedAsset.name : `Pick ${type === 'image' ? '🖼' : '🔊'}`}
          <span className={styles.assetPickerChevron}>{expanded ? '▲' : '▼'}</span>
        </button>

        {expanded && (
          <div className={styles.assetPickerPopover}>
            <AssetGrid
              assets={filtered}
              type={type}
              value={value}
              projectDir={projectDir}
              onSelect={handleSelect}
              onImport={handleImport}
              onClear={() => { onChange(null); setExpanded(false) }}
              importing={importing}
            />
          </div>
        )}
      </div>
    )
  }

  // ─── Full inline mode ────────────────────────────────────────────────────

  return (
    <div className={styles.assetPickerFull}>
      <div className={styles.assetPickerControls}>
        <button
          className={styles.assetPickerExpandBtn}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Collapse' : 'Choose Asset'}
          <span className={styles.assetPickerChevron}>{expanded ? '▲' : '▼'}</span>
        </button>
        {value && (
          <button
            className={styles.clearBtn}
            onClick={() => onChange(null)}
          >
            Clear
          </button>
        )}
      </div>

      {expanded && (
        <AssetGrid
          assets={filtered}
          type={type}
          value={value}
          projectDir={projectDir}
          onSelect={handleSelect}
          onImport={handleImport}
          onClear={() => onChange(null)}
          importing={importing}
        />
      )}
    </div>
  )
}

// ─── Asset Grid Sub-component ─────────────────────────────────────────────────

interface AssetGridProps {
  assets: ReturnType<typeof useProjectStore.getState>['project']['assets']
  type: 'image' | 'audio'
  value: string | null
  projectDir: string
  onSelect: (id: string) => void
  onImport: () => void
  onClear: () => void
  importing: boolean
}

const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  type,
  value,
  projectDir,
  onSelect,
  onImport,
  importing,
}) => {
  return (
    <div className={styles.assetGrid}>
      {assets.length === 0 && (
        <div className={styles.assetGridEmpty}>
          No {type} assets yet. Import one below.
        </div>
      )}

      {assets.map((asset) => {
        const isSelected = asset.id === value
        const url = buildAssetUrl(projectDir, asset.filename, asset.path)

        return (
          <button
            key={asset.id}
            className={`${styles.assetGridItem} ${isSelected ? styles.assetGridItemSelected : ''}`}
            onClick={() => onSelect(asset.id)}
            title={asset.filename}
          >
            {type === 'image' ? (
              <img
                className={styles.assetThumb}
                src={url}
                alt={asset.name}
                loading="lazy"
              />
            ) : (
              <div className={styles.audioIcon}>♪</div>
            )}
            <span className={styles.assetLabel}>{asset.name}</span>
          </button>
        )
      })}

      <button
        className={styles.importAssetBtn}
        onClick={onImport}
        disabled={importing}
      >
        {importing ? 'Importing…' : '+ Import New'}
      </button>
    </div>
  )
}

export default AssetPicker
