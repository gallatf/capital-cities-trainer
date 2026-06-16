import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import type { CapitalEntry } from '@/hooks/useSession';
import type { Progress } from '@/hooks/useProgress';

type Props = {
  entries: CapitalEntry[];
  progress: Progress;
  onSelect: (region: string, continent: string, entries: CapitalEntry[]) => void;
  onCancel: () => void;
};

type RegionInfo = {
  region: string;
  continent: string;
  total: number;
  unseen: number;
  entries: CapitalEntry[];
};

// Groups entries by continent > region and shows unseen counts so the user
// can pick exactly which geographic cluster to study next.
export default function BatchSelectionScreen({ entries, progress, onSelect, onCancel }: Props) {
  const continents = useMemo(() => {
    const regionMap = new Map<string, RegionInfo>();

    for (const entry of entries) {
      const key = `${entry.continent}__${entry.region}`;
      if (!regionMap.has(key)) {
        regionMap.set(key, { region: entry.region, continent: entry.continent, total: 0, unseen: 0, entries: [] });
      }
      const info = regionMap.get(key)!;
      info.total += 1;
      info.entries.push(entry);
      if (!progress[entry.id] || progress[entry.id].seen === 0) info.unseen += 1;
    }

    // Group by continent
    const continentMap = new Map<string, RegionInfo[]>();
    for (const info of regionMap.values()) {
      if (!continentMap.has(info.continent)) continentMap.set(info.continent, []);
      continentMap.get(info.continent)!.push(info);
    }

    // Sort regions within each continent by unseen desc, then name
    for (const regions of continentMap.values()) {
      regions.sort((a, b) => b.unseen - a.unseen || a.region.localeCompare(b.region));
    }

    // Sort continents by total unseen desc
    return Array.from(continentMap.entries())
      .map(([continent, regions]) => ({
        continent,
        regions,
        totalUnseen: regions.reduce((s, r) => s + r.unseen, 0),
      }))
      .sort((a, b) => b.totalUnseen - a.totalUnseen);
  }, [entries, progress]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose a region to learn</Text>
        <Pressable onPress={onCancel} hitSlop={12}>
          <Text style={styles.cancelLink}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {continents.map(({ continent, regions, totalUnseen }) => (
          <View key={continent} style={styles.continentSection}>
            <View style={styles.continentHeader}>
              <Text style={styles.continentName}>{continent}</Text>
              {totalUnseen > 0 && (
                <Text style={styles.unseenBadge}>{totalUnseen} new</Text>
              )}
            </View>

            {regions.map((info) => (
              <Pressable
                key={info.region}
                style={({ pressed }) => [styles.regionRow, pressed && styles.regionRowPressed]}
                onPress={() => onSelect(info.region, info.continent, info.entries)}
              >
                <View style={styles.regionLeft}>
                  <Text style={styles.regionName}>{info.region}</Text>
                  <Text style={styles.regionCount}>{info.total} countries</Text>
                </View>
                {info.unseen > 0 ? (
                  <View style={styles.newPill}>
                    <Text style={styles.newPillText}>{info.unseen} new</Text>
                  </View>
                ) : (
                  <Text style={styles.doneCheck}>✓</Text>
                )}
              </Pressable>
            ))}
          </View>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  cancelLink: {
    fontSize: 15,
    color: '#0066cc',
  },
  listContent: {
    gap: 20,
  },
  continentSection: {
    gap: 2,
  },
  continentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.3)',
    marginBottom: 4,
  },
  continentName: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.5,
  },
  unseenBadge: {
    fontSize: 11,
    color: '#2e7d32',
    fontWeight: '600',
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  regionRowPressed: {
    backgroundColor: 'rgba(0, 102, 204, 0.08)',
  },
  regionLeft: {
    flex: 1,
  },
  regionName: {
    fontSize: 16,
    fontWeight: '500',
  },
  regionCount: {
    fontSize: 12,
    opacity: 0.45,
    marginTop: 1,
  },
  newPill: {
    backgroundColor: '#2e7d32',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  newPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  doneCheck: {
    color: '#2e7d32',
    fontSize: 18,
    fontWeight: '700',
  },
});
