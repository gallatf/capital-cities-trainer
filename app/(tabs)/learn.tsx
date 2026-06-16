import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Text, View } from '@/components/Themed';
import FlashCard from '@/components/FlashCard';
import BatchSelectionScreen from '@/components/BatchSelectionScreen';
import BatchStudyScreen from '@/components/BatchStudyScreen';
import { useProgress } from '@/hooks/useProgress';
import { useSession, recordResult, type CapitalEntry } from '@/hooks/useSession';
import allEntries from '../../assets/data/capitals.json';

type Phase = 'selecting' | 'studying' | 'practicing' | 'done';

export default function LearnScreen() {
  const { progress, setProgress, loaded, reload } = useProgress();
  const [phase, setPhase] = useState<Phase>('selecting');
  const [batchRegion, setBatchRegion] = useState('');
  const [batchContinent, setBatchContinent] = useState('');
  const [batchEntries, setBatchEntries] = useState<CapitalEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const { current, next, requeueCurrent } = useSession(
    phase === 'practicing' ? batchEntries : [],
    'all',
    progress
  );

  if (!loaded) {
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }

  function handleRegionSelect(region: string, continent: string, entries: CapitalEntry[]) {
    const sorted = [...entries].sort((a, b) => a.difficulty - b.difficulty);
    setBatchRegion(region);
    setBatchContinent(continent);
    setBatchEntries(sorted);
    setPhase('studying');
  }

  function handleRate(knew: boolean) {
    setProgress(recordResult(progress, current!.id, knew));
    if (!knew) requeueCurrent();
    next();
  }

  if (phase === 'selecting') {
    return (
      <View style={styles.container}>
        <BatchSelectionScreen
          entries={allEntries as CapitalEntry[]}
          progress={progress}
          onSelect={handleRegionSelect}
          onCancel={() => {}}
        />
      </View>
    );
  }

  if (phase === 'studying') {
    return (
      <View style={styles.container}>
        <BatchStudyScreen
          region={batchRegion}
          continent={batchContinent}
          entries={batchEntries}
          onStartPractice={() => setPhase('practicing')}
          onExit={() => setPhase('selecting')}
        />
      </View>
    );
  }

  if (phase === 'practicing') {
    return (
      <View style={styles.container}>
        <View style={styles.practiceHeader}>
          <Text style={styles.practiceTitle}>Practicing: {batchRegion}</Text>
          <Pressable onPress={() => setPhase('selecting')} hitSlop={12}>
            <Text style={styles.exitLink}>✕ Done</Text>
          </Pressable>
        </View>
        <View style={styles.content}>
          {current ? (
            <FlashCard entry={current} onRate={handleRate} />
          ) : (
            <View style={styles.doneState}>
              <Text style={styles.doneTitle}>Batch complete! 🎉</Text>
              <Text style={styles.doneSub}>
                You've practiced all {batchEntries.length} capitals from {batchRegion}.
              </Text>
              <View style={styles.doneActions}>
                <Pressable style={[styles.button, styles.buttonPrimary]} onPress={() => setPhase('selecting')}>
                  <Text style={styles.buttonPrimaryText}>Learn another region</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  practiceTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  exitLink: {
    fontSize: 13,
    color: '#888',
  },
  doneState: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  doneSub: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  doneActions: {
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
});
