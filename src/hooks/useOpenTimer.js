import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { addSeconds, getFileSeconds } from '../timeStore';

// Counts the time a file is open. Pauses when the app goes to the background.
// Returns the total seconds spent on this file (saved + this visit).
export default function useOpenTimer(fileId) {
  const loadedRef = useRef(0);
  const flushedRef = useRef(0);
  const startRef = useRef(Date.now());
  const activeRef = useRef(true);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let alive = true;
    loadedRef.current = 0;
    flushedRef.current = 0;
    startRef.current = Date.now();
    activeRef.current = true;

    getFileSeconds(fileId).then((v) => {
      if (alive) loadedRef.current = v;
    });

    const flush = () => {
      if (!activeRef.current) return;
      const secs = Math.floor((Date.now() - startRef.current) / 1000);
      if (secs < 1) return;
      startRef.current += secs * 1000;
      flushedRef.current += secs;
      addSeconds(fileId, secs);
    };

    const tick = setInterval(() => {
      const running = activeRef.current
        ? Math.floor((Date.now() - startRef.current) / 1000)
        : 0;
      setSeconds(loadedRef.current + flushedRef.current + running);
    }, 1000);

    const saver = setInterval(flush, 10000);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        startRef.current = Date.now();
        activeRef.current = true;
      } else {
        flush();
        activeRef.current = false;
      }
    });

    return () => {
      alive = false;
      flush();
      clearInterval(tick);
      clearInterval(saver);
      sub.remove();
    };
  }, [fileId]);

  return seconds;
}
