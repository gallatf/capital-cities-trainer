import { useCallback, useEffect, useRef, useState } from 'react';
import { filteredDeck, pickWeighted, computeNextDue } from '@shared/logic.js';
import type { Progress, CapitalProgress } from './useProgress';

export type CapitalEntry = {
  id: string;
  country: string;
  capital: string;
  continent: string;
  region: string;
  difficulty: number;
  lat: number;
  lng: number;
};

type Filter = 'all' | 'new' | 'difficult' | 'due';

// Session queue logic: walks through a weighted, shuffled deck and re-queues
// missed entries a few cards later so they come back up for review.
export function useSession(entries: CapitalEntry[], filter: Filter, progress: Progress) {
  const [current, setCurrent] = useState<CapitalEntry | null>(null);
  const queueRef = useRef<CapitalEntry[]>([]);

  const buildQueue = useCallback((lastId: string | null) => {
    const deck = filteredDeck(entries, filter, progress);
    const queue: CapitalEntry[] = [];
    const remaining = [...deck];
    let last = lastId;
    while (remaining.length) {
      const next = pickWeighted(remaining, progress, last as Parameters<typeof pickWeighted>[2]);
      queue.push(next);
      remaining.splice(remaining.findIndex((v) => v.id === next.id), 1);
      last = next.id;
    }
    return queue;
  }, [entries, filter, progress]);

  useEffect(() => {
    queueRef.current = buildQueue(current?.id ?? null);
    setCurrent(queueRef.current.shift() ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, filter]);

  const next = useCallback(() => {
    if (queueRef.current.length === 0) {
      queueRef.current = buildQueue(current?.id ?? null);
    }
    setCurrent(queueRef.current.shift() ?? null);
  }, [buildQueue, current]);

  const requeueCurrent = useCallback(() => {
    if (!current) return;
    const insertAt = Math.min(3, queueRef.current.length);
    queueRef.current.splice(insertAt, 0, current);
  }, [current]);

  return { current, next, requeueCurrent };
}

// Updates seen/knew/missed counters, appends to history, and recomputes the
// SM-2 schedule for the entry.
export function recordResult(progress: Progress, entryId: string, knew: boolean): Progress {
  const existing: CapitalProgress = progress[entryId] ?? { seen: 0, knew: 0, missed: 0, history: [] };
  const p: CapitalProgress = {
    ...existing,
    seen: existing.seen + 1,
    knew: existing.knew + (knew ? 1 : 0),
    missed: existing.missed + (knew ? 0 : 1),
    history: [...existing.history, knew],
  };
  return { ...progress, [entryId]: { ...p, ...computeNextDue(p, knew) } };
}
