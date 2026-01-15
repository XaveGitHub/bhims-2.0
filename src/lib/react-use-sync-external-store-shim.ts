// React 19 compatibility shim for use-sync-external-store
// React 19 has useSyncExternalStore built-in, so we re-export it
import { useSyncExternalStore } from 'react'

export { useSyncExternalStore }
export default useSyncExternalStore
