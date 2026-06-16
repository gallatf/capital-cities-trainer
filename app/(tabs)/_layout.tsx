import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

// Monochrome tab icons: SF Symbols on iOS, Ionicons (tinted by `color`)
// everywhere else, so the tab bar matches the app's blue/white look
// instead of colorful emoji.
function TabIcon({
  symbol,
  ionicon,
  color,
}: {
  symbol: SFSymbol;
  ionicon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <SymbolView
      name={symbol}
      tintColor={color}
      size={28}
      fallback={<Ionicons name={ionicon} size={24} color={color} />}
    />
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color }) => (
            <TabIcon symbol="books.vertical" ionicon="book-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Practice',
          tabBarIcon: ({ color }) => (
            <TabIcon symbol="rectangle.on.rectangle" ionicon="school-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Report',
          tabBarIcon: ({ color }) => (
            <TabIcon symbol="chart.bar" ionicon="stats-chart-outline" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
