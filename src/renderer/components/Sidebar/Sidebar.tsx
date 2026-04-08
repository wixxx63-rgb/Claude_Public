import { useState, useMemo } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import type { NodeStatus, NodeType } from '../../types/project'
import styles from './Sidebar.module.css'

const STATUS_LABELS: Record<NodeStatus, string> = { todo: 'Todo', inprog: 'In Progress', done: 'Done' }
const TYPE_LABELS: Record<NodeType, string> = { scene: 'Scene', decision: 'Decision', grok: 'Grok', death: 'Death', ending: 'Ending' }

const STATUS_COLORS: Record<NodeStatus, string> = {
  todo: '#555',
  inprog: '#f39c12',
  done: '#27ae60'
}

const TYPE_COLORS: Record<NodeType, string> = {
  scene: '#4a8cff',
  decision: '#ffb700',
  grok: '#9b59b6',
  death: '#e74c3c',
  ending: '#27ae60'
}

export default function Sidebar() {
  const nodes = useProjectStore(s => s.project.nodes)
  const { searchQuery, activeNodeId, setActiveNode } = useUIStore()
  const [collapsed, setCollapsed] = useState(false)
  const [statusFilter, setStatusFilter] = useState<Set<NodeStatus>>(new Set())
  const [typeFilter, setTypeFilter] = useState<Set<NodeType>>(new Set())
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    return nodes.filter(n => {
      if (statusFilter.size > 0 && !statusFilter.has(n.status)) return false
      if (typeFilter.size > 0 && !typeFilter.has(n.type)) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !n.id.toLowerCase().includes(q) &&
          !n.title.toLowerCase().includes(q) &&
          !n.summary.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [nodes, statusFilter, typeFilter, searchQuery])

  // Group by path
  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const n of filtered) {
      const key = n.path || '(Ungrouped)'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(n)
    }
    // Sort paths alphabetically
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  function toggleStatus(s: NodeStatus) {
    setStatusFilter(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s); else next.add(s)
      return next
    })
  }

  function toggleType(t: NodeType) {
    setTypeFilter(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t); else next.add(t)
      return next
    })
  }

  function togglePathCollapse(path: string) {
    setCollapsedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path); else next.add(path)
      return next
    })
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <button
        className={styles.collapseBtn}
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {!collapsed && (
        <>
          {/* Status filter */}
          <div className={styles.filterRow}>
            {(Object.keys(STATUS_LABELS) as NodeStatus[]).map(s => (
              <button
                key={s}
                className={`${styles.filterChip} ${statusFilter.has(s) ? styles.filterActive : ''}`}
                style={statusFilter.has(s) ? { borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s] } : undefined}
                onClick={() => toggleStatus(s)}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className={styles.filterRow}>
            {(Object.keys(TYPE_LABELS) as NodeType[]).map(t => (
              <button
                key={t}
                className={`${styles.filterChip} ${typeFilter.has(t) ? styles.filterActive : ''}`}
                style={typeFilter.has(t) ? { borderColor: TYPE_COLORS[t], color: TYPE_COLORS[t] } : undefined}
                onClick={() => toggleType(t)}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <div className={styles.list}>
            {groups.map(([path, pathNodes]) => (
              <div key={path} className={styles.pathGroup}>
                <button
                  className={styles.pathHeader}
                  onClick={() => togglePathCollapse(path)}
                >
                  <span className={styles.pathChevron}>
                    {collapsedPaths.has(path) ? '›' : '⌄'}
                  </span>
                  <span className={styles.pathName}>{path}</span>
                  <span className={styles.pathCount}>{pathNodes.length}</span>
                </button>

                {!collapsedPaths.has(path) && pathNodes.map(node => (
                  <button
                    key={node.id}
                    className={`${styles.nodeItem} ${activeNodeId === node.id ? styles.nodeActive : ''}`}
                    onClick={() => setActiveNode(node.id)}
                  >
                    <span
                      className={styles.statusPip}
                      style={{ background: STATUS_COLORS[node.status] }}
                    />
                    <span className={styles.nodeId}>{node.id}</span>
                    <span className={styles.nodeTitle}>{node.title || 'Untitled'}</span>
                    <span
                      className={styles.typeBadge}
                      style={{ color: TYPE_COLORS[node.type] }}
                    >
                      {node.type[0].toUpperCase()}
                    </span>
                    {node.day != null && (
                      <span className={styles.dayBadge}>D{node.day}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}

            {groups.length === 0 && (
              <div className={styles.empty}>No nodes match filters</div>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
