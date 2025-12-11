/**
 * useIsMobile - Efficient mobile detection hook using matchMedia
 * 
 * Uses JS detection instead of CSS breakpoints because:
 * - Layout structure changes (sidebar → tabs) require conditional rendering
 * - Single source of truth for all components
 * - More efficient than CSS media query battles on every paint
 */

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Returns true if viewport width is below mobile breakpoint.
 * Updates on window resize.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    // Set initial value
    onChange(mql);

    // Modern browsers
    mql.addEventListener('change', onChange);
    return () => {
      mql.removeEventListener('change', onChange);
    };
  }, []);

  return isMobile;
}
