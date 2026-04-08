import { useEffect, useRef } from 'react'

export function useIpc() {
  return window.electronAPI
}

/** Subscribe to a main-process menu event. Cleans up on unmount. */
export function useMenuEvent(channel: string, handler: () => void): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const cleanup = window.electronAPI.on(channel, () => handlerRef.current())
    return cleanup
  }, [channel])
}
