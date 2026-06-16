import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Text, View } from '@/components/Themed';
import FlashCard from '@/components/FlashCard';
import { useProgress } from '@/hooks/useProgress';
import { useSession, recordResult, type CapitalEntry } from '@/hooks/useSession';
import { filteredDeck, nextDueIn } from '@shared/logic.js';
import allEntries from '../../assets/data/capitals.json';

type Filter = 'due' | 'difficult' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'due', label: 'Due' },
  { key: 'difficult', label: 'Difficult' },
];

const CONTINENTS: string[] = Array.from(
  new Set((allEntries as CapitalEntry[]).map((e) => e.continent))
).sort();

export default function PracticeScreen() {
  const { progress, setProgress, loaded, reload } = useProgress();
  const [filter, setFilter] = useState<Filter>('all');
  const [continents, setContinents] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const activeEntries = useMemo(() => {
    if (continents.size === 0) return allEntries as CapitalEntry[];
    return (allEntries as CapitalEntry[]).filter((e) => continents.has(e.continent));
  }, [continents]);

  const { current, next, requeueCurrent } = useSession(activeEntries, filter, progress);

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
      </View>

      <View style={styles.content}>
        {current ? (
          <FlashCard entry={current} onRate={handleRate} />
        ) : (
          <EmptyFilterState
            filter={filter}
            entries={activeEntries}
            progress={progress}
            onSetFilter={setFilter}
          />
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
}: {
  filter: Filter;
  entries: CapitalEntry[];
  progress: Parameters<typeof filteredDeck>[2];
  onSetFilter: (filter: Filter) => void;
}) {
  const nextDue = nextDueIn(progress);
  const nextDueText = nextDue ? `Next country due in ${nextDue}.` : null;

  let message: string;
  let actions: { label: string; onPress: () => void; primary: boolean }[];

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
