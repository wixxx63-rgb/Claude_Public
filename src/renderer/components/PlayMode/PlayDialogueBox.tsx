import type { DialogueLine, Character } from '../../types/project'
import styles from './PlayMode.module.css'

interface Props {
  line: DialogueLine
  character: Character | null
}

export default function PlayDialogueBox({ line, character }: Props) {
  const speakerName = character?.name ?? (line.speaker ? line.speaker : 'Narrator')
  const speakerColor = character?.color ?? '#e0e0e8'

  return (
    <div className={styles.dialogueBox} onClick={e => e.stopPropagation()}>
      {speakerName && (
        <div className={styles.speakerName} style={{ color: speakerColor }}>
          {speakerName}
        </div>
      )}
      <div className={styles.dialogueText}>{line.text}</div>
      <div className={styles.advanceHint}>▼</div>
    </div>
  )
}
