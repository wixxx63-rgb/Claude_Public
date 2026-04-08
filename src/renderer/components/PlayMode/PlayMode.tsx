import { useEffect, useCallback } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import { usePlayStore } from '../../store/usePlayStore'
import { evalCondition } from '../../utils/variableEngine'
import PlayBackground from './PlayBackground'
import PlaySprites from './PlaySprites'
import PlayDialogueBox from './PlayDialogueBox'
import PlayChoices from './PlayChoices'
import PlayEndScreen from './PlayEndScreen'
import TransitionOverlay from './TransitionOverlay'
import styles from './PlayMode.module.css'

export default function PlayMode() {
  const { project, filePath } = useProjectStore()
  const { playStartNodeId, exitPlay } = useUIStore()
  const {
    currentNodeId, lineIndex, varState, phase,
    transitionActive, startPlay, advance, selectChoice, stopPlay
  } = usePlayStore()

  const projectDir = filePath
    ? filePath.replace(/\\/g, '/').replace(/\/[^/]+$/, '')
    : ''

  // Start play on mount
  useEffect(() => {
    if (playStartNodeId) {
      startPlay(playStartNodeId, project.variables)
    }
    return () => stopPlay()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdvance = useCallback(() => {
    if (phase === 'dialogue') advance()
  }, [phase, advance])

  // Click / spacebar to advance
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        handleAdvance()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleAdvance])

  const currentNode = project.nodes.find(n => n.id === currentNodeId) ?? null
  const currentLine = currentNode?.dialogueLines[lineIndex] ?? null

  const validBranches = currentNode?.branches.filter(b =>
    b.leads.length > 0 && evalCondition(b.condition, varState)
  ) ?? []

  return (
    <div
      className={styles.root}
      onClick={handleAdvance}
    >
      <PlayBackground
        assetId={currentNode?.background ?? null}
        assets={project.assets}
        projectDir={projectDir}
      />

      <PlaySprites
        currentLine={currentLine}
        node={currentNode}
        characters={project.characters}
        assets={project.assets}
        projectDir={projectDir}
      />

      {phase === 'dialogue' && currentLine && currentLine.text && (
        <PlayDialogueBox
          line={currentLine}
          character={
            currentLine.speaker
              ? (project.characters.find(c => c.id === currentLine.speaker) ?? null)
              : null
          }
        />
      )}

      {phase === 'choices' && (
        <PlayChoices
          branches={validBranches}
          varState={varState}
          onSelect={(i) => selectChoice(i)}
        />
      )}

      {phase === 'ended' && <PlayEndScreen />}

      <TransitionOverlay
        transition={currentNode?.transition ?? 'fade'}
        active={transitionActive}
      />

      {/* HUD */}
      <div className={styles.hud}>
        <button
          className={styles.backBtn}
          onClick={(e) => { e.stopPropagation(); exitPlay() }}
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
