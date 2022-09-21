import { useEffect, useRef } from 'react';
import Stats from 'stats.js';

const useStats = () => {
  const statsRef = useRef<Stats>(new Stats());

  useEffect(() => {
    document.body.appendChild(statsRef.current.dom);

    const stats = statsRef.current;
    return () => {
      stats.dom.remove();
    };
  }, []);

  return {
    stats: statsRef.current,
  };
};

export default useStats;
