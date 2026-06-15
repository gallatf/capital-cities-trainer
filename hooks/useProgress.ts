import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

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

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setProgress(JSON.parse(raw));
      })
      .finally(() => setLoaded(true));
  }, []);

  const save = useCallback((next: Progress) => {
    setProgress(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      // offline/storage unavailable; in-memory state still works for this session
    });
  }, []);

  return { progress, setProgress: save, loaded };
}
