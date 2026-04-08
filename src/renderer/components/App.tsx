import { useAutoSave } from '../hooks/useAutoSave'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useUIStore } from '../store/useUIStore'
import Toolbar from './Toolbar/Toolbar'
import Sidebar from './Sidebar/Sidebar'
import GraphMode from './GraphMode/GraphMode'
import SceneMode from './SceneMode/SceneMode'
import PlayMode from './PlayMode/PlayMode'
import CharacterManager from './Modals/CharacterManager'
import VariableManager from './Modals/VariableManager'
import styles from './App.module.css'

export default function App() {
  useAutoSave()
  useKeyboardShortcuts()

  const mode = useUIStore(s => s.mode)
  const sceneNodeId = useUIStore(s => s.sceneNodeId)
  const modalOpen = useUIStore(s => s.modalOpen)

  const showSidebar = mode === 'graph' || mode === 'scene'

  return (
    <div className={styles.root}>
      <Toolbar />

      {showSidebar && <Sidebar />}

      <main
        className={styles.main}
        style={{ marginLeft: showSidebar ? 240 : 0 }}
      >
        {mode === 'graph' && <GraphMode />}
        {mode === 'scene' && sceneNodeId && <SceneMode nodeId={sceneNodeId} />}
      </main>

      {mode === 'play' && <PlayMode />}

      {modalOpen === 'characters' && <CharacterManager />}
      {modalOpen === 'variables' && <VariableManager />}
    </div>
  )
}
