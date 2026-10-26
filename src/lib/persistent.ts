'use client';
import { useMemo, useSyncExternalStore } from 'react';
export function usePersistent<T>(
  key: string,
  fallback: T,
): [T, (value: T | ((current: T) => T)) => void] {
  const raw = useSyncExternalStore(
    (listener) => {
      window.addEventListener('storage', listener);
      window.addEventListener('cc-storage', listener);
      return () => {
        window.removeEventListener('storage', listener);
        window.removeEventListener('cc-storage', listener);
      };
    },
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const value = useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }, [raw, fallback]);
  return [
    value,
    (next) => {
      let current = value;
      try {
        const stored = localStorage.getItem(key);
        if (stored) current = JSON.parse(stored);
        localStorage.setItem(
          key,
          JSON.stringify(
            typeof next === 'function' ? (next as (v: T) => T)(current) : next,
          ),
        );
        window.dispatchEvent(new Event('cc-storage'));
      } catch {
        throw new Error(
          'Your browser storage is full or unavailable. Allow site storage to save your bag.',
        );
      }
    },
  ];
}
