import { useState, useEffect } from 'react';

export function useDeviceMode() {
  const checkIsPWA = () => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  };

  const [isPWA, setIsPWA] = useState(checkIsPWA);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 840);
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setIsMobile(window.innerWidth <= 840);
      setIsPWA(checkIsPWA());
    };

    window.addEventListener('resize', handleResize);
    
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e) => setIsPWA(e.matches || checkIsPWA());
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  return { isPWA, isMobile, windowWidth };
}
