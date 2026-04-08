import type { Branch } from '../../types/project'
import type { VarState } from '../../utils/variableEngine'
import { evalCondition } from '../../utils/variableEngine'
import styles from './PlayMode.module.css'

interface Props {
  branches: Branch[]
  varState: VarState
  onSelect: (index: number) => void
}

export default function PlayChoices({ branches, varState, onSelect }: Props) {
  const visible = branches.filter(b => evalCondition(b.condition, varState))

  return (
    <div className={styles.choices} onClick={e => e.stopPropagation()}>
      {visible.map((branch, i) => (
        <button
          key={i}
          className={styles.choiceBtn}
          onClick={() => onSelect(i)}
        >
          {branch.desc || branch.option}
        </button>
      ))}
    </div>
  )
}
