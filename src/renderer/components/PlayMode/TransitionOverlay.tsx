import type { SceneTransition } from '../../types/project'
import styles from './PlayMode.module.css'

interface Props {
  transition: SceneTransition
  active: boolean
}

export default function TransitionOverlay({ transition, active }: Props) {
  if (!active || transition === 'cut') return null

  const cls = [
    styles.transitionOverlay,
    transition === 'fade' ? styles.transitionFade : '',
    transition === 'slide-left' ? styles.transitionSlideLeft : '',
    transition === 'slide-right' ? styles.transitionSlideRight : '',
  ].filter(Boolean).join(' ')

  return <div className={cls} />
}
