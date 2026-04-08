import { useEffect } from 'react'
import type { ReactNode } from 'react'
import styles from './Modals.module.css'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  width?: number
}

export default function ModalShell({ title, onClose, children, width = 700 }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.panel}
        style={{ width }}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
