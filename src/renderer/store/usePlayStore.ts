import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Variable } from '../types/project'
import { buildDefaultState, applyEffects, evalCondition, parseBranchEffects } from '../utils/variableEngine'
import type { VarState } from '../utils/variableEngine'
import { useProjectStore } from './useProjectStore'

export type PlayPhase = 'dialogue' | 'choices' | 'ended' | 'idle'

interface PlayStore {
  currentNodeId: string | null
  lineIndex: number
  varState: VarState
  phase: PlayPhase
  transitionActive: boolean

  startPlay: (startNodeId: string, variables: Variable[]) => void
  advance: () => void
  selectChoice: (branchIndex: number) => void
  stopPlay: () => void
}

// Internal helper — not exposed on the interface to avoid type pollution
function resolveAdvance(nodeId: string, varState: VarState) {
  const { project } = useProjectStore.getState()
  const edges = project.edges.filter(e => e.from === nodeId)
  const node = project.nodes.find(n => n.id === nodeId)
  if (!node) {
    usePlayStore.setState({ phase: 'ended' })
    return
  }

  // Check for branches with passing conditions
  const validBranches = node.branches.filter(b =>
    b.leads.length > 0 && evalCondition(b.condition, varState)
  )

  if (validBranches.length > 0) {
    usePlayStore.setState({ phase: 'choices' })
    return
  }

  // Auto-advance on single unlabelled edge
  const autoEdge = edges.find(e => !e.label)
  if (autoEdge) {
    enterNode(autoEdge.to)
    return
  }

  // Single labelled edge with no branches
  if (edges.length === 1) {
    enterNode(edges[0].to)
    return
  }

  // No outgoing edges
  if (edges.length === 0) {
    usePlayStore.setState({ phase: 'ended' })
    return
  }

  // Multiple edges but no valid branches — show as choices
  usePlayStore.setState({ phase: 'choices' })
}

function enterNode(nodeId: string) {
  const { project } = useProjectStore.getState()
  const node = project.nodes.find(n => n.id === nodeId)
  if (!node) {
    usePlayStore.setState({ phase: 'ended' })
    return
  }

  const currentVarState = usePlayStore.getState().varState
  const newVarState = applyEffects(currentVarState, node.variables)

  usePlayStore.setState({
    currentNodeId: nodeId,
    lineIndex: 0,
    varState: newVarState,
    transitionActive: true
  })

  setTimeout(() => {
    usePlayStore.setState({ transitionActive: false })
    const n = useProjectStore.getState().project.nodes.find(nd => nd.id === nodeId)
    if (!n) return
    if (n.dialogueLines.length > 0) {
      usePlayStore.setState({ phase: 'dialogue' })
    } else {
      resolveAdvance(nodeId, usePlayStore.getState().varState)
    }
  }, 50)
}

export const usePlayStore = create<PlayStore>()(
  immer((set, get) => ({
    currentNodeId: null,
    lineIndex: 0,
    varState: {},
    phase: 'idle',
    transitionActive: false,

    startPlay(startNodeId, variables) {
      const varState = buildDefaultState(variables)
      set(state => {
        state.varState = varState
        state.phase = 'idle'
      })
      enterNode(startNodeId)
    },

    advance() {
      const { currentNodeId, lineIndex, phase } = get()
      if (!currentNodeId || phase !== 'dialogue') return

      const { project } = useProjectStore.getState()
      const node = project.nodes.find(n => n.id === currentNodeId)
      if (!node) return

      const nextIndex = lineIndex + 1
      if (nextIndex < node.dialogueLines.length) {
        set(state => { state.lineIndex = nextIndex })
      } else {
        resolveAdvance(currentNodeId, get().varState)
      }
    },

    selectChoice(branchIndex) {
      const { currentNodeId, varState } = get()
      if (!currentNodeId) return

      const { project } = useProjectStore.getState()
      const node = project.nodes.find(n => n.id === currentNodeId)
      if (!node) return

      const validBranches = node.branches.filter(b =>
        b.leads.length > 0 && evalCondition(b.condition, varState)
      )

      const branch = validBranches[branchIndex]
      if (!branch) return

      const effects = parseBranchEffects(branch.effects, project.variables)
      const newVarState = applyEffects(varState, effects)
      set(state => { state.varState = newVarState })

      const dest = branch.leads[0]
      if (dest) enterNode(dest)
    },

    stopPlay() {
      set(state => {
        state.currentNodeId = null
        state.lineIndex = 0
        state.varState = {}
        state.phase = 'idle'
        state.transitionActive = false
      })
    }
  }))
)
