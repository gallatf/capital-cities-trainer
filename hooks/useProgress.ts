import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'capital-cities-progress';

export type CapitalProgress = {
  seen: number;
  knew: number;
  missed: number;
  history: boolean[];
  easeFactor?: number;
  repetitions?: number;
  interval?: number;
  due?: number;
};

export type Progress = Record<string, CapitalProgress>;

// Loads/saves practice progress from AsyncStorage (mobile equivalent of the
// web app's localStorage-backed saveProgress/loadProgress in app/app.js).
export function useProgress() {
  const [progress, setProgress] = useState<Progress>({});
  const [loaded, setLoaded] = useState(false);

  // Bumped on every save()/reset() so a reload() that was already in flight
  // can detect it raced with a newer write and discard its (now stale) result
  // instead of clobbering the freshly-saved progress.
  const writeSeq = useRef(0);

  const reload = useCallback(() => {
    const seqAtStart = writeSeq.current;
    return AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (writeSeq.current !== seqAtStart) return;
        setProgress(raw ? JSON.parse(raw) : {});
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback((next: Progress) => {
    writeSeq.current += 1;
    setProgress(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      // offline/storage unavailable; in-memory state still works for this session
    });
  }, []);

  const reset = useCallback(() => {
    writeSeq.current += 1;
    setProgress({});
    return AsyncStorage.removeItem(STORAGE_KEY).catch(() => {
      // offline/storage unavailable; in-memory state still works for this session
    });
  }, []);

  return { progress, setProgress: save, loaded, reload, reset };
}
