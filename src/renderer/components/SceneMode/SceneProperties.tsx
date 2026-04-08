import React from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { recordSnapshot } from '../../hooks/useKeyboardShortcuts'
import type { VariableEffect, SceneTransition, VariableOperation } from '../../types/project'
import AssetPicker from './AssetPicker'
import styles from './SceneMode.module.css'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScenePropertiesProps {
  nodeId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

const SceneProperties: React.FC<ScenePropertiesProps> = ({ nodeId }) => {
  const node = useProjectStore((s) => s.project.nodes.find((n) => n.id === nodeId))
  const characters = useProjectStore((s) => s.project.characters)
  const variables = useProjectStore((s) => s.project.variables)
  const assets = useProjectStore((s) => s.project.assets)
  const filePath = useProjectStore((s) => s.filePath)
  const updateNode = useProjectStore((s) => s.updateNode)

  if (!node) return null

  const projectDir = filePath
    ? filePath.replace(/\\/g, '/').replace(/\/[^/]+$/, '')
    : ''

  const bgAsset = node.background ? assets.find((a) => a.id === node.background) : null
  const musicAsset = node.music ? assets.find((a) => a.id === node.music) : null
  const sfxAsset = node.sfx ? assets.find((a) => a.id === node.sfx) : null

  // ─── Variable effects ───────────────────────────────────────────────────────

  function handleAddVariableEffect() {
    if (variables.length === 0) return
    recordSnapshot()
    const newEffect: VariableEffect = {
      variableId: variables[0].id,
      operation: 'set',
      value: '',
    }
    updateNode(nodeId, { variables: [...node!.variables, newEffect] })
  }

  function handleUpdateVariableEffect(index: number, patch: Partial<VariableEffect>) {
    recordSnapshot()
    const updated = node!.variables.map((e, i) =>
      i === index ? { ...e, ...patch } : e
    )
    updateNode(nodeId, { variables: updated })
  }

  function handleRemoveVariableEffect(index: number) {
    recordSnapshot()
    updateNode(nodeId, { variables: node!.variables.filter((_, i) => i !== index) })
  }

  // ─── Characters in scene ────────────────────────────────────────────────────

  function handleAddChar(charId: string) {
    if (node!.chars.includes(charId)) return
    recordSnapshot()
    updateNode(nodeId, { chars: [...node!.chars, charId] })
  }

  function handleRemoveChar(charId: string) {
    recordSnapshot()
    updateNode(nodeId, { chars: node!.chars.filter((id) => id !== charId) })
  }

  const availableCharsToAdd = characters.filter((c) => !node.chars.includes(c.id))

  return (
    <div className={styles.propertiesPanel}>
      <div className={styles.propSection}>
        <div className={styles.propSectionTitle}>Scene Settings</div>

        {/* Background */}
        <div className={styles.propGroup}>
          <label className={styles.propLabel}>Background</label>
          {bgAsset && (
            <div className={styles.bgThumbRow}>
              <img
                className={styles.bgThumb}
                src={
                  filePath
                    ? `asset://local${filePath.replace(/\\/g, '/').replace(/\/[^/]+$/, '')}/assets/${bgAsset.filename}`
                    : bgAsset.path
                }
                alt={bgAsset.name}
              />
              <span className={styles.bgName}>{bgAsset.name}</span>
            </div>
          )}
          <div className={styles.propAssetRow}>
            <AssetPicker
              type="image"
              value={node.background}
              onChange={(id) => {
                recordSnapshot()
                updateNode(nodeId, { background: id })
              }}
              projectDir={projectDir}
              compact
            />
            {node.background && (
              <button
                className={styles.clearBtn}
                onClick={() => {
                  recordSnapshot()
                  updateNode(nodeId, { background: null })
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Music */}
        <div className={styles.propGroup}>
          <label className={styles.propLabel}>Music</label>
          {musicAsset && (
            <div className={styles.assetName}>♫ {musicAsset.filename}</div>
          )}
          <div className={styles.propAssetRow}>
            <AssetPicker
              type="audio"
              value={node.music}
              onChange={(id) => {
                recordSnapshot()
                updateNode(nodeId, { music: id })
              }}
              projectDir={projectDir}
              compact
            />
            {node.music && (
              <button
                className={styles.clearBtn}
                onClick={() => {
                  recordSnapshot()
                  updateNode(nodeId, { music: null })
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Entry SFX */}
        <div className={styles.propGroup}>
          <label className={styles.propLabel}>Entry Sound Effect</label>
          {sfxAsset && (
            <div className={styles.assetName}>🔊 {sfxAsset.filename}</div>
          )}
          <div className={styles.propAssetRow}>
            <AssetPicker
              type="audio"
              value={node.sfx}
              onChange={(id) => {
                recordSnapshot()
                updateNode(nodeId, { sfx: id })
              }}
              projectDir={projectDir}
              compact
            />
            {node.sfx && (
              <button
                className={styles.clearBtn}
                onClick={() => {
                  recordSnapshot()
                  updateNode(nodeId, { sfx: null })
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Transition */}
        <div className={styles.propGroup}>
          <label className={styles.propLabel}>Scene Transition</label>
          <select
            className={styles.propSelect}
            value={node.transition}
            onChange={(e) => {
              recordSnapshot()
              updateNode(nodeId, { transition: e.target.value as SceneTransition })
            }}
          >
            <option value="fade">Fade</option>
            <option value="cut">Cut</option>
            <option value="slide-left">Slide Left</option>
            <option value="slide-right">Slide Right</option>
          </select>
        </div>
      </div>

      {/* Variables on entry */}
      <div className={styles.propSection}>
        <div className={styles.propSectionTitle}>Variables on Entry</div>
        {node.variables.length === 0 && (
          <div className={styles.emptyHint}>No variable effects.</div>
        )}
        {node.variables.map((effect, i) => {
          const variable = variables.find((v) => v.id === effect.variableId)
          return (
            <div key={i} className={styles.varEffectRow}>
              {/* Variable name select */}
              <select
                className={styles.varSelect}
                value={effect.variableId}
                onChange={(e) =>
                  handleUpdateVariableEffect(i, { variableId: e.target.value })
                }
              >
                {variables.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>

              {/* Operation select */}
              <select
                className={styles.varOpSelect}
                value={effect.operation}
                onChange={(e) =>
                  handleUpdateVariableEffect(i, {
                    operation: e.target.value as VariableOperation,
                  })
                }
              >
                <option value="set">set</option>
                <option value="add">add</option>
                <option value="subtract">subtract</option>
                <option value="toggle">toggle</option>
              </select>

              {/* Value input (hide for toggle) */}
              {effect.operation !== 'toggle' && (
                <input
                  className={styles.varValueInput}
                  type={variable?.type === 'number' ? 'number' : 'text'}
                  value={String(effect.value ?? '')}
                  placeholder="value"
                  onChange={(e) =>
                    handleUpdateVariableEffect(i, { value: e.target.value })
                  }
                />
              )}

              <button
                className={styles.removeVarBtn}
                onClick={() => handleRemoveVariableEffect(i)}
                title="Remove"
              >
                ×
              </button>
            </div>
          )
        })}
        <button
          className={styles.addVarBtn}
          onClick={handleAddVariableEffect}
          disabled={variables.length === 0}
          title={variables.length === 0 ? 'No project variables defined' : 'Add variable effect'}
        >
          + Add Effect
        </button>
      </div>

      {/* Characters in scene */}
      <div className={styles.propSection}>
        <div className={styles.propSectionTitle}>Characters in Scene</div>
        <div className={styles.charTags}>
          {node.chars.map((charId) => {
            const char = characters.find((c) => c.id === charId)
            if (!char) return null
            return (
              <div key={charId} className={styles.charTag}>
                <span
                  className={styles.charDot}
                  style={{ background: char.color }}
                />
                <span className={styles.charTagName}>{char.name}</span>
                <button
                  className={styles.charTagRemove}
                  onClick={() => handleRemoveChar(charId)}
                >
                  ×
                </button>
              </div>
            )
          })}
          {node.chars.length === 0 && (
            <div className={styles.emptyHint}>No characters assigned.</div>
          )}
        </div>

        {availableCharsToAdd.length > 0 && (
          <div className={styles.addCharRow}>
            <select
              className={styles.addCharSelect}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddChar(e.target.value)
                  e.target.value = ''
                }
              }}
            >
              <option value="" disabled>
                Add character…
              </option>
              {availableCharsToAdd.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}

export default SceneProperties
