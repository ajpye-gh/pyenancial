import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 640;

/** Tracks whether the viewport is at or under the app's single mobile breakpoint (see index.css's
 *  `@media (max-width: 640px)` rules) - `window.innerWidth` + a resize listener rather than
 *  `matchMedia`, since jsdom doesn't implement `matchMedia` and every other viewport-reactive hook
 *  in this codebase (see useAutoHideOnScroll) already listens to window events directly. */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= breakpoint);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}
