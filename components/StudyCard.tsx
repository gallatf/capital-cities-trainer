import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text, View } from '@/components/Themed';
import type { CapitalEntry } from '@/hooks/useSession';

type Props = {
  entry: CapitalEntry;
  index: number;
  total: number;
  onNext: () => void;
};

// Study phase card: shows country + capital together without testing.
// Used in the graduated introduction flow before the practice phase begins.
export default function StudyCard({ entry, index, total, onNext }: Props) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 200 });
  }, [entry.id, opacity]);

  const cardStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const isLast = index === total - 1;

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.card, cardStyle]}>
        <Text style={styles.progress}>{index + 1} / {total}</Text>

        <Text style={styles.sectionLabel}>Country</Text>
        <Text style={styles.country}>{entry.country}</Text>

        <View style={styles.arrow}>
          <Text style={styles.arrowText}>↓</Text>
        </View>

        <Text style={styles.sectionLabel}>Capital</Text>
        <Text style={styles.capital}>{entry.capital}</Text>
        <Text style={styles.continent}>{entry.continent}</Text>

        <Pressable style={[styles.nextButton, isLast && styles.practiceButton]} onPress={onNext}>
          <Text style={styles.nextButtonText}>
            {isLast ? 'Start Practice →' : 'Next →'}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  progress: {
    fontSize: 14,
    opacity: 0.4,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    opacity: 0.45,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  country: {
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
  },
  arrow: {
    marginVertical: 4,
  },
  arrowText: {
    fontSize: 22,
    opacity: 0.3,
  },
  capital: {
    fontSize: 30,
    fontWeight: '600',
    textAlign: 'center',
    color: '#0066cc',
  },
  continent: {
    fontSize: 14,
    opacity: 0.45,
    marginBottom: 20,
  },
  nextButton: {
    backgroundColor: '#555',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 8,
  },
  practiceButton: {
    backgroundColor: '#0066cc',
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
