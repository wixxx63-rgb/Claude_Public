import React, { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import GraphScreen from './screens/GraphScreen'
import NodeEditScreen from './screens/NodeEditScreen'
import CharactersScreen from './screens/CharactersScreen'

export type Screen =
  | { name: 'home' }
  | { name: 'graph' }
  | { name: 'edit-node'; nodeId: string }
  | { name: 'characters' }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  const nav = {
    home: () => setScreen({ name: 'home' }),
    graph: () => setScreen({ name: 'graph' }),
    editNode: (nodeId: string) => setScreen({ name: 'edit-node', nodeId }),
    characters: () => setScreen({ name: 'characters' }),
  }

  if (screen.name === 'home') return <HomeScreen onOpen={nav.graph} />
  if (screen.name === 'graph') return <GraphScreen onEditNode={nav.editNode} onCharacters={nav.characters} onHome={nav.home} />
  if (screen.name === 'edit-node') return <NodeEditScreen nodeId={screen.nodeId} onBack={nav.graph} />
  if (screen.name === 'characters') return <CharactersScreen onBack={nav.graph} />
  return null
}
