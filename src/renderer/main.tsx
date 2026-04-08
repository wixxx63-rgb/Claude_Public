// NOTE: React 18 Strict Mode is intentionally disabled — react-konva has
// known issues with Strict Mode's double-invocation of effects.
import { createRoot } from 'react-dom/client'
import App from './components/App'
import './types/electron.d'

const root = document.getElementById('root')!
createRoot(root).render(<App />)
