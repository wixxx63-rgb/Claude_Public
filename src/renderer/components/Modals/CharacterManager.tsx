import { useState } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import { recordSnapshot } from '../../hooks/useKeyboardShortcuts'
import { uid } from '../../utils/ids'
import type { Character, Sprite } from '../../types/project'
import { IPC } from '../../types/ipc'
import ModalShell from './ModalShell'
import styles from './Modals.module.css'

export default function CharacterManager() {
  const { project, addCharacter, updateCharacter, deleteCharacter, filePath } = useProjectStore()
  const closeModal = useUIStore(s => s.closeModal)
  const [selectedId, setSelectedId] = useState<string | null>(
    project.characters[0]?.id ?? null
  )

  const projectDir = filePath
    ? filePath.replace(/\\/g, '/').replace(/\/[^/]+$/, '')
    : ''

  const selected = project.characters.find(c => c.id === selectedId) ?? null

  function handleAdd() {
    recordSnapshot()
    const char = addCharacter({ id: uid(), name: 'New Character', color: '#7eb8ff', sprites: [] })
    setSelectedId(char.id)
  }

  function handleDelete(char: Character) {
    const usedIn = project.nodes.filter(n => n.chars.includes(char.id)).length
    const msg = usedIn > 0
      ? `Delete "${char.name}"? Used in ${usedIn} scene(s).`
      : `Delete "${char.name}"?`
    if (!confirm(msg)) return
    recordSnapshot()
    deleteCharacter(char.id)
    setSelectedId(project.characters.find(c => c.id !== char.id)?.id ?? null)
  }

  function handlePatch(patch: Partial<Character>) {
    if (!selectedId) return
    recordSnapshot()
    updateCharacter(selectedId, patch)
  }

  function handleAddSprite() {
    if (!selected) return
    const sprite: Sprite = { id: uid(), label: 'neutral', assetId: '' }
    handlePatch({ sprites: [...selected.sprites, sprite] })
  }

  function handleDeleteSprite(spriteId: string) {
    if (!selected) return
    handlePatch({ sprites: selected.sprites.filter(s => s.id !== spriteId) })
  }

  function handleSpriteChange(spriteId: string, patch: Partial<Sprite>) {
    if (!selected) return
    handlePatch({
      sprites: selected.sprites.map(s => s.id === spriteId ? { ...s, ...patch } : s)
    })
  }

  async function handleImportSpriteAsset(spriteId: string) {
    if (!projectDir) { alert('Please save the project first to import assets.'); return }
    const result = await window.electronAPI.invoke(IPC.ASSET_IMPORT, { type: 'image', projectDir }) as { asset: unknown } | null
    if (!result) return
    const { addAsset } = useProjectStore.getState()
    addAsset(result.asset as Parameters<typeof addAsset>[0])
    const asset = result.asset as { id: string }
    handleSpriteChange(spriteId, { assetId: asset.id })
  }

  function getAssetUrl(assetId: string): string {
    const asset = project.assets.find(a => a.id === assetId)
    if (!asset || !projectDir) return ''
    return `asset://local${projectDir}/assets/${asset.filename}`
  }

  return (
    <ModalShell title="Character Manager" onClose={closeModal} width={720}>
      <div className={styles.managerLayout}>
        {/* Left: character list */}
        <div className={styles.managerList}>
          {project.characters.map(char => (
            <button
              key={char.id}
              className={`${styles.managerListItem} ${selectedId === char.id ? styles.managerListItemActive : ''}`}
              onClick={() => setSelectedId(char.id)}
            >
              <span className={styles.charColorDot} style={{ background: char.color }} />
              <span className={styles.managerListName}>{char.name}</span>
              <button
                className={styles.deleteSmall}
                onClick={e => { e.stopPropagation(); handleDelete(char) }}
              >×</button>
            </button>
          ))}
          <button className={styles.addBtn} onClick={handleAdd}>+ Add Character</button>
        </div>

        {/* Right: editor */}
        <div className={styles.managerEditor}>
          {selected ? (
            <>
              <div className={styles.editorSection}>
                <label className={styles.editorLabel}>Name</label>
                <input
                  className={styles.editorInput}
                  value={selected.name}
                  onChange={e => handlePatch({ name: e.target.value })}
                />
              </div>

              <div className={styles.editorSection}>
                <label className={styles.editorLabel}>Dialogue Color</label>
                <div className={styles.colorRow}>
                  <input
                    type="color"
                    value={selected.color}
                    onChange={e => handlePatch({ color: e.target.value })}
                    className={styles.colorPicker}
                  />
                  <span className={styles.colorPreview} style={{ color: selected.color }}>
                    {selected.name || 'Preview'}
                  </span>
                </div>
              </div>

              <div className={styles.editorSection}>
                <div className={styles.sectionHeader}>
                  <label className={styles.editorLabel}>Sprites</label>
                  <button className={styles.addSmall} onClick={handleAddSprite}>+ Add</button>
                </div>
                <div className={styles.spriteList}>
                  {selected.sprites.map(sprite => (
                    <div key={sprite.id} className={styles.spriteRow}>
                      <div className={styles.spriteThumbnail}>
                        {sprite.assetId && getAssetUrl(sprite.assetId) ? (
                          <img src={getAssetUrl(sprite.assetId)} alt={sprite.label} />
                        ) : (
                          <div className={styles.spriteEmpty}>No image</div>
                        )}
                      </div>
                      <div className={styles.spriteFields}>
                        <input
                          className={styles.editorInput}
                          placeholder="Label (e.g. neutral)"
                          value={sprite.label}
                          onChange={e => handleSpriteChange(sprite.id, { label: e.target.value })}
                        />
                        <button
                          className={styles.importBtn}
                          onClick={() => handleImportSpriteAsset(sprite.id)}
                        >
                          {sprite.assetId ? 'Change Image' : 'Import Image'}
                        </button>
                      </div>
                      <button
                        className={styles.deleteSmall}
                        onClick={() => handleDeleteSprite(sprite.id)}
                      >×</button>
                    </div>
                  ))}
                  {selected.sprites.length === 0 && (
                    <div className={styles.emptyHint}>No sprites yet. Add one above.</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className={styles.emptyHint}>Select a character to edit, or create one.</div>
          )}
        </div>
      </div>
    </ModalShell>
  )
}
