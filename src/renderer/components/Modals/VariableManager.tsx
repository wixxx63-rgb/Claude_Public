import { useState } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import { recordSnapshot } from '../../hooks/useKeyboardShortcuts'
import { uid } from '../../utils/ids'
import type { Variable } from '../../types/project'
import ModalShell from './ModalShell'
import styles from './Modals.module.css'

export default function VariableManager() {
  const { project, addVariable, updateVariable, deleteVariable } = useProjectStore()
  const closeModal = useUIStore(s => s.closeModal)
  const [selectedId, setSelectedId] = useState<string | null>(
    project.variables[0]?.id ?? null
  )

  const selected = project.variables.find(v => v.id === selectedId) ?? null

  function handleAdd() {
    recordSnapshot()
    const v = addVariable({ id: uid(), name: 'new_var', type: 'string', defaultValue: '' })
    setSelectedId(v.id)
  }

  function handleDelete(v: Variable) {
    if (!confirm(`Delete variable "${v.name}"?`)) return
    recordSnapshot()
    deleteVariable(v.id)
    setSelectedId(project.variables.find(x => x.id !== v.id)?.id ?? null)
  }

  function handlePatch(patch: Partial<Variable>) {
    if (!selectedId) return
    recordSnapshot()
    updateVariable(selectedId, patch)
  }

  function defaultValueInput(v: Variable) {
    if (v.type === 'boolean') {
      return (
        <input
          type="checkbox"
          checked={Boolean(v.defaultValue)}
          onChange={e => handlePatch({ defaultValue: e.target.checked })}
          className={styles.checkbox}
        />
      )
    }
    if (v.type === 'number') {
      return (
        <input
          type="number"
          className={styles.editorInput}
          value={v.defaultValue as number ?? 0}
          onChange={e => handlePatch({ defaultValue: parseFloat(e.target.value) || 0 })}
        />
      )
    }
    return (
      <input
        type="text"
        className={styles.editorInput}
        value={v.defaultValue as string ?? ''}
        onChange={e => handlePatch({ defaultValue: e.target.value })}
      />
    )
  }

  return (
    <ModalShell title="Variable Manager" onClose={closeModal} width={600}>
      <div className={styles.managerLayout}>
        {/* Left: variable list */}
        <div className={styles.managerList}>
          {project.variables.map(v => (
            <button
              key={v.id}
              className={`${styles.managerListItem} ${selectedId === v.id ? styles.managerListItemActive : ''}`}
              onClick={() => setSelectedId(v.id)}
            >
              <span className={styles.varTypeBadge}>{v.type[0].toUpperCase()}</span>
              <span className={styles.managerListName}>{v.name}</span>
              <button
                className={styles.deleteSmall}
                onClick={e => { e.stopPropagation(); handleDelete(v) }}
              >×</button>
            </button>
          ))}
          <button className={styles.addBtn} onClick={handleAdd}>+ Add Variable</button>
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
                  placeholder="e.g. loyalty, knows_secret"
                />
              </div>

              <div className={styles.editorSection}>
                <label className={styles.editorLabel}>Type</label>
                <select
                  className={styles.editorSelect}
                  value={selected.type}
                  onChange={e => {
                    const type = e.target.value as Variable['type']
                    const defaultValue = type === 'boolean' ? false : type === 'number' ? 0 : ''
                    handlePatch({ type, defaultValue })
                  }}
                >
                  <option value="string">String</option>
                  <option value="boolean">Boolean</option>
                  <option value="number">Number</option>
                </select>
              </div>

              <div className={styles.editorSection}>
                <label className={styles.editorLabel}>Default Value</label>
                {defaultValueInput(selected)}
              </div>

              <div className={styles.editorSection}>
                <div className={styles.conditionHint}>
                  <strong>Condition syntax:</strong><br />
                  <code>{selected.name}=value</code> — equality<br />
                  <code>{selected.name}&gt;5</code> — numeric comparison<br />
                  <code>!{selected.name}</code> — falsy check
                </div>
              </div>
            </>
          ) : (
            <div className={styles.emptyHint}>Select a variable to edit, or create one.</div>
          )}
        </div>
      </div>
    </ModalShell>
  )
}
