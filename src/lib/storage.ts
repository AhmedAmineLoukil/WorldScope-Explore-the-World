import { useEffect, useState } from 'react';

export function useStoredState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : initial; } catch { return initial; } });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* Keep the interface usable if storage is unavailable. */ } }, [key, state]);
  return [state, setState] as const;
}
