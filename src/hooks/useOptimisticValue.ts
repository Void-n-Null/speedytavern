/**
 * useOptimisticValue - Local state that syncs with server value
 * 
 * Solves the "whiplash" problem when updating server state:
 * 1. User changes value → local state updates immediately
 * 2. Mutation fires → server processes
 * 3. Cache updates → local state clears (they now match)
 * 
 * Without this, clearing local state before cache updates causes:
 * User action → local cleared → UI shows stale cache → cache updates → UI jumps
 * 
 * @param serverValue - The value from TanStack Query cache
 * @returns [displayValue, setLocalValue, isLocalActive]
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function useOptimisticValue<T>(
  serverValue: T
): [T, (value: T | null) => void, boolean] {
  const [localValue, setLocalValue] = useState<T | null>(null);
  const prevServerRef = useRef(serverValue);
  
  // Clear local value only when SERVER changes to match local
  // This prevents clearing when local is set to match server (start of edit)
  useEffect(() => {
    const serverChanged = prevServerRef.current !== serverValue;
    prevServerRef.current = serverValue;
    
    if (localValue !== null && serverValue === localValue && serverChanged) {
      setLocalValue(null);
    }
  }, [localValue, serverValue]);
  
  // Return server value when no local override
  const displayValue = localValue ?? serverValue;
  
  const setLocal = useCallback((value: T | null) => {
    setLocalValue(value);
  }, []);
  
  const isLocalActive = localValue !== null;
  
  return [displayValue, setLocal, isLocalActive];
}

/**
 * useOptimisticNumber - Specialized for numeric values with tolerance
 * 
 * Useful for sliders where floating point comparison might fail.
 */
export function useOptimisticNumber(
  serverValue: number,
  tolerance = 0.001
): [number, (value: number) => void] {
  const [localValue, setLocalValue] = useState<number | null>(null);
  const prevServerRef = useRef(serverValue);
  
  // Clear only when SERVER changes to match local (within tolerance)
  useEffect(() => {
    const serverChanged = Math.abs(prevServerRef.current - serverValue) > tolerance;
    prevServerRef.current = serverValue;
    
    if (localValue !== null && Math.abs(serverValue - localValue) < tolerance && serverChanged) {
      setLocalValue(null);
    }
  }, [localValue, serverValue, tolerance]);
  
  const displayValue = localValue ?? serverValue;
  
  const setLocal = useCallback((value: number) => {
    setLocalValue(value);
  }, []);
  
  return [displayValue, setLocal];
}
