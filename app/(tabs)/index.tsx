import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Text, View } from '@/components/Themed';
import FlashCard from '@/components/FlashCard';
import StudyCard from '@/components/StudyCard';
import { useProgress } from '@/hooks/useProgress';
import { useSession, recordResult, type CapitalEntry } from '@/hooks/useSession';
import { filteredDeck, nextDueIn } from '@shared/logic.js';
import allEntries from '../../assets/data/capitals.json';

type Filter = 'due' | 'difficult' | 'all';
type BatchMode = 'off' | 'studying' | 'practicing';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'due', label: 'Due' },
  { key: 'difficult', label: 'Difficult' },
];

const CONTINENTS: string[] = Array.from(
  new Set((allEntries as CapitalEntry[]).map((e) => e.continent))
).sort();

const BATCH_SIZE = 7;

function pickStudyBatch(
  entries: CapitalEntry[],
  progress: Record<string, { seen: number }>,
): { continent: string; batch: CapitalEntry[] } | null {
  const unseen = entries.filter((e) => !progress[e.id] || progress[e.id].seen === 0);
  if (unseen.length === 0) return null;

  // Group by continent, pick the one with the most unseen entries
  const byContinent = new Map<string, CapitalEntry[]>();
  for (const e of unseen) {
    if (!byContinent.has(e.continent)) byContinent.set(e.continent, []);
    byContinent.get(e.continent)!.push(e);
  }

  let bestContinent = '';
  let bestGroup: CapitalEntry[] = [];
  for (const [cont, group] of byContinent) {
    if (group.length > bestGroup.length) {
      bestContinent = cont;
      bestGroup = group;
    }
  }

  // Take up to BATCH_SIZE, easiest first
  const sorted = [...bestGroup].sort((a, b) => a.difficulty - b.difficulty);
  return { continent: bestContinent, batch: sorted.slice(0, BATCH_SIZE) };
}

export default function PracticeScreen() {
  const { progress, setProgress, loaded, reload } = useProgress();
  const [filter, setFilter] = useState<Filter>('all');
  const [continents, setContinents] = useState<Set<string>>(new Set());

  const [batchMode, setBatchMode] = useState<BatchMode>('off');
  const [batchContinent, setBatchContinent] = useState<string>('');
  const [batchEntries, setBatchEntries] = useState<CapitalEntry[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const activeEntries = useMemo(() => {
    if (continents.size === 0) return allEntries as CapitalEntry[];
    return (allEntries as CapitalEntry[]).filter((e) => continents.has(e.continent));
  }, [continents]);

  // During batch practice, restrict the session to batch entries only
  const sessionEntries = batchMode === 'practicing' ? batchEntries : activeEntries;
  const sessionFilter = batchMode === 'practicing' ? 'all' : filter;

  const { current, next, requeueCurrent } = useSession(sessionEntries, sessionFilter, progress);

  const unseenCount = useMemo(
    () => activeEntries.filter((e) => !progress[e.id] || progress[e.id].seen === 0).length,
    [activeEntries, progress]
  );

  if (!loaded) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text>Loading…</Text>
        </View>
      </View>
    );
  }

  function handleRate(knew: boolean) {
    setProgress(recordResult(progress, current!.id, knew));
    if (!knew) requeueCurrent();
    next();
  }

  function toggleContinent(continent: string) {
    setContinents((prev) => {
      const next = new Set(prev);
      if (next.has(continent)) next.delete(continent);
      else next.add(continent);
      return next;
    });
  }

  function startBatch() {
    const result = pickStudyBatch(activeEntries, progress);
    if (!result) return;
    setBatchContinent(result.continent);
    setBatchEntries(result.batch);
    setStudyIndex(0);
    setBatchMode('studying');
  }

  function handleStudyNext() {
    if (studyIndex < batchEntries.length - 1) {
      setStudyIndex((i) => i + 1);
    } else {
      setBatchMode('practicing');
    }
  }

  function exitBatch() {
    setBatchMode('off');
    setBatchContinent('');
    setBatchEntries([]);
    setStudyIndex(0);
  }

  // --- Batch study phase ---
  if (batchMode === 'studying') {
    return (
      <View style={styles.container}>
        <View style={styles.batchHeader}>
          <Text style={styles.batchHeaderTitle}>Learning: {batchContinent}</Text>
          <Text style={styles.batchHeaderSub}>
            Study these {batchEntries.length} capitals, then practice them
          </Text>
          <Pressable onPress={exitBatch}>
            <Text style={styles.exitLink}>✕ Exit</Text>
          </Pressable>
        </View>
        <View style={styles.content}>
          <StudyCard
            entry={batchEntries[studyIndex]}
            index={studyIndex}
            total={batchEntries.length}
            onNext={handleStudyNext}
          />
        </View>
      </View>
    );
  }

  // --- Batch practice phase ---
  if (batchMode === 'practicing') {
    return (
      <View style={styles.container}>
        <View style={styles.batchHeader}>
          <Text style={styles.batchHeaderTitle}>Practicing: {batchContinent}</Text>
          <Text style={styles.batchHeaderSub}>{batchEntries.length} capitals from the study batch</Text>
          <Pressable onPress={exitBatch}>
            <Text style={styles.exitLink}>✕ Done</Text>
          </Pressable>
        </View>
        <View style={styles.content}>
          {current ? (
            <FlashCard entry={current} onRate={handleRate} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.title}>Batch complete!</Text>
              <Text style={styles.subtitle}>
                You've practiced all {batchEntries.length} capitals from {batchContinent}.
              </Text>
              <View style={styles.emptyActions}>
                <Pressable style={[styles.button, styles.buttonPrimary]} onPress={startBatch}>
                  <Text style={styles.buttonPrimaryText}>Learn next batch</Text>
                </Pressable>
                <Pressable style={[styles.button, styles.buttonSecondary]} onPress={exitBatch}>
                  <Text style={styles.buttonSecondaryText}>Back to all practice</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  // --- Normal practice ---
  return (
    <View style={styles.container}>
      <View style={styles.continentToggle}>
        <Pressable
          style={[styles.continentButton, continents.size === 0 && styles.continentButtonActive]}
          onPress={() => setContinents(new Set())}
        >
          <Text style={[styles.continentButtonText, continents.size === 0 && styles.continentButtonTextActive]}>
            All
          </Text>
        </Pressable>
        {CONTINENTS.map((continent) => (
          <Pressable
            key={continent}
            style={[styles.continentButton, continents.has(continent) && styles.continentButtonActive]}
            onPress={() => toggleContinent(continent)}
          >
            <Text style={[styles.continentButtonText, continents.has(continent) && styles.continentButtonTextActive]}>
              {continent}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.filterToggle}>
        {FILTERS.map(({ key, label }) => (
          <Pressable
            key={key}
            style={[styles.filterButton, filter === key && styles.filterButtonActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.filterButtonText, filter === key && styles.filterButtonTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
        {unseenCount > 0 && (
          <Pressable style={[styles.filterButton, styles.learnButton]} onPress={startBatch}>
            <Text style={styles.learnButtonText}>Learn ({unseenCount})</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.content}>
        {current ? (
          <FlashCard entry={current} onRate={handleRate} />
        ) : (
          <EmptyFilterState filter={filter} entries={activeEntries} progress={progress} onSetFilter={setFilter} unseenCount={unseenCount} onStartBatch={startBatch} />
        )}
      </View>
    </View>
  );
}

function EmptyFilterState({
  filter,
  entries,
  progress,
  onSetFilter,
  unseenCount,
  onStartBatch,
}: {
  filter: Filter;
  entries: CapitalEntry[];
  progress: Parameters<typeof filteredDeck>[2];
  onSetFilter: (filter: Filter) => void;
  unseenCount: number;
  onStartBatch: () => void;
}) {
  const nextDue = nextDueIn(progress);
  const nextDueText = nextDue ? `Next country due in ${nextDue}.` : null;

  let message: string;
  let actions: { label: string; filter?: Filter; onPress: () => void; primary: boolean }[];

  if (filter === 'due') {
    message = 'All caught up!';
    const difficultCount = filteredDeck(entries, 'difficult', progress).length;
    if (difficultCount > 0) {
      actions = [
        { label: `Practice ${difficultCount} difficult countr${difficultCount === 1 ? 'y' : 'ies'}`, onPress: () => onSetFilter('difficult'), primary: true },
        { label: 'Practice all countries', onPress: () => onSetFilter('all'), primary: false },
      ];
    } else {
      actions = [{ label: 'Practice all countries', onPress: () => onSetFilter('all'), primary: true }];
    }
  } else if (filter === 'difficult') {
    message = 'No difficult countries — great work!';
    actions = [{ label: 'Practice all countries', onPress: () => onSetFilter('all'), primary: true }];
  } else {
    message = 'No countries match this filter yet.';
    actions = [{ label: 'Show all countries', onPress: () => onSetFilter('all'), primary: true }];
  }

  if (unseenCount > 0) {
    actions = [
      { label: `Learn ${unseenCount} new countries by region`, onPress: onStartBatch, primary: true },
      ...actions.map((a) => ({ ...a, primary: false })),
    ];
  }

  return (
    <View style={styles.emptyState}>
      <Text style={styles.title}>{message}</Text>
      {nextDueText ? <Text style={styles.subtitle}>{nextDueText}</Text> : null}
      <View style={styles.emptyActions}>
        {actions.map(({ label, onPress, primary }, i) => (
          <Pressable
            key={i}
            style={[styles.button, primary ? styles.buttonPrimary : styles.buttonSecondary]}
            onPress={onPress}
          >
            <Text style={primary ? styles.buttonPrimaryText : styles.buttonSecondaryText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continentToggle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingBottom: 12,
  },
  continentButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
  },
  continentButtonActive: {
    backgroundColor: '#666',
  },
  continentButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },
  continentButtonTextActive: {
    color: '#fff',
  },
  filterToggle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingBottom: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066cc',
  },
  filterButtonActive: {
    backgroundColor: '#0066cc',
  },
  filterButtonText: {
    color: '#0066cc',
    fontWeight: '600',
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  learnButton: {
    borderColor: '#2e7d32',
    backgroundColor: '#2e7d32',
  },
  learnButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  batchHeader: {
    alignItems: 'center',
    paddingBottom: 16,
    gap: 4,
  },
  batchHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  batchHeaderSub: {
    fontSize: 13,
    opacity: 0.55,
    textAlign: 'center',
  },
  exitLink: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  emptyActions: {
    marginTop: 16,
    gap: 12,
    alignItems: 'center',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#0066cc',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: '#0066cc',
  },
  buttonSecondaryText: {
    color: '#0066cc',
    fontWeight: '600',
    fontSize: 16,
  },
});
