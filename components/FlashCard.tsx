import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text, View } from '@/components/Themed';
import type { CapitalEntry } from '@/hooks/useSession';

type Props = {
  entry: CapitalEntry;
  onRate: (knew: boolean) => void;
};

// A swipe completes the action if it covers enough distance OR is a quick
// flick (high velocity) even over a shorter distance.
const SWIPE_UP_DISTANCE = -40;
const SWIPE_SIDE_DISTANCE = 50;
const SWIPE_VELOCITY = 600;
const OFFSCREEN_DISTANCE = 500;

// Flashcard mode: show the country name, reveal the capital, then let the
// learner self-rate. Also supports swipe gestures: swipe up to reveal, then
// swipe right/left to rate "knew it" / "didn't know it" — buttons remain as
// the primary, accessible way to do the same actions.
export default function FlashCard({ entry, onRate }: Props) {
  const [revealed, setRevealed] = useState(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Fade the new card in rather than having it snap into place once the
  // previous one has swiped off.
  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 180 });
  }, [entry.id, opacity]);

  function handleRate(knew: boolean) {
    setRevealed(false);
    onRate(knew);
  }

  function handleReveal() {
    setRevealed(true);
  }

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .activeOffsetY([-20, 20])
    .onUpdate((e) => {
      // Lock movement to a single axis: vertical (reveal) before the answer
      // is shown, horizontal (rating) after — avoids the card drifting
      // diagonally while the finger moves.
      if (!revealed) {
        translateY.value = Math.min(e.translationY, 0);
        translateX.value = 0;
      } else {
        translateX.value = e.translationX;
        translateY.value = 0;
      }
    })
    .onEnd((e) => {
      if (!revealed) {
        if (e.translationY < SWIPE_UP_DISTANCE || e.velocityY < -SWIPE_VELOCITY) {
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          runOnJS(handleReveal)();
          return;
        }
      } else if (e.translationX > SWIPE_SIDE_DISTANCE || e.velocityX > SWIPE_VELOCITY) {
        translateX.value = withTiming(OFFSCREEN_DISTANCE, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 }, () => {
          // Hide before snapping back so the reset isn't visible, then let
          // the entry.id effect fade the new card in.
          opacity.value = 0;
          translateX.value = 0;
          runOnJS(handleRate)(true);
        });
        return;
      } else if (e.translationX < -SWIPE_SIDE_DISTANCE || e.velocityX < -SWIPE_VELOCITY) {
        translateX.value = withTiming(-OFFSCREEN_DISTANCE, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 }, () => {
          opacity.value = 0;
          translateX.value = 0;
          runOnJS(handleRate)(false);
        });
        return;
      }

      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
    <View style={styles.wrapper}>
      <Animated.View style={[styles.card, cardStyle]}>
        <Text style={styles.country}>{entry.country}</Text>

        {revealed ? (
          <View style={styles.answer}>
            <Text style={styles.capital}>{entry.capital}</Text>
            <Text style={styles.continent}>{entry.continent}</Text>

            <View style={styles.ratingRow}>
              <Pressable style={[styles.button, styles.missedButton]} onPress={() => handleRate(false)}>
                <Text style={styles.buttonText}>I didn't know it</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.knewButton]} onPress={() => handleRate(true)}>
                <Text style={styles.buttonText}>I knew it</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>or swipe ← / →</Text>
          </View>
        ) : (
          <View style={styles.revealArea}>
            <Pressable style={[styles.button, styles.revealButton]} onPress={handleReveal}>
              <Text style={styles.buttonText}>Reveal</Text>
            </Pressable>
            <Text style={styles.hint}>or swipe ↑</Text>
          </View>
        )}
      </Animated.View>
    </View>
    </GestureDetector>
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
    gap: 24,
  },
  country: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  answer: {
    alignItems: 'center',
    gap: 8,
  },
  capital: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  continent: {
    fontSize: 16,
    opacity: 0.7,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  revealArea: {
    alignItems: 'center',
    gap: 8,
  },
  hint: {
    fontSize: 13,
    opacity: 0.5,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  revealButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 40,
  },
  knewButton: {
    backgroundColor: '#2e7d32',
  },
  missedButton: {
    backgroundColor: '#c62828',
  },
});
