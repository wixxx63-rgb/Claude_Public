import { useUIStore } from '../../store/useUIStore'
import styles from './PlayMode.module.css'

export default function PlayEndScreen() {
  const exitPlay = useUIStore(s => s.exitPlay)

  return (
    <div className={styles.endScreen} onClick={e => e.stopPropagation()}>
      <h1 className={styles.endTitle}>The End</h1>
      <button className={styles.endBtn} onClick={exitPlay}>
        Return to Editor
      </button>
    </div>
  )
}
