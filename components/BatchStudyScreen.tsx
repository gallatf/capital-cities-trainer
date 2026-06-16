import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Text, View } from '@/components/Themed';
import type { CapitalEntry } from '@/hooks/useSession';

type Props = {
  region: string;
  continent: string;
  entries: CapitalEntry[];
  onStartPractice: () => void;
  onExit: () => void;
};

// Compute a map region that fits all markers with some padding.
function getBoundingRegion(entries: CapitalEntry[]) {
  const lats = entries.map((e) => e.lat);
  const lngs = entries.map((e) => e.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latDelta = Math.max((maxLat - minLat) * 1.5, 5);
  const lngDelta = Math.max((maxLng - minLng) * 1.5, 5);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

// Study phase: shows the full batch as a list with a map of all capitals pinned.
// No testing — pure exposure before practice begins.
export default function BatchStudyScreen({ region, continent, entries, onStartPractice, onExit }: Props) {
  const mapRegion = getBoundingRegion(entries);
  const mapRef = useRef<MapView>(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.regionTitle}>{region}</Text>
          <Text style={styles.continentSub}>{continent} · {entries.length} countries</Text>
        </View>
        <Pressable onPress={onExit} hitSlop={12}>
          <Text style={styles.exitLink}>✕ Exit</Text>
        </Pressable>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        mapType="standard"
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
      >
        {entries.map((entry) => (
          <Marker
            key={entry.id}
            coordinate={{ latitude: entry.lat, longitude: entry.lng }}
            title={entry.capital}
            description={entry.country}
            pinColor="#0066cc"
          />
        ))}
      </MapView>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {entries.map((entry, i) => (
          <View key={entry.id} style={styles.row}>
            <Text style={styles.rowIndex}>{i + 1}</Text>
            <View style={styles.rowBody}>
              <Text style={styles.rowCountry}>{entry.country}</Text>
              <Text style={styles.rowCapital}>{entry.capital}</Text>
            </View>
          </View>
        ))}
        <View style={styles.listFooter} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.practiceButton} onPress={onStartPractice}>
          <Text style={styles.practiceButtonText}>Start Practice →</Text>
        </Pressable>
        <Text style={styles.footerHint}>You'll be quizzed on these {entries.length} capitals</Text>
      </View>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  regionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  continentSub: {
    fontSize: 13,
    opacity: 0.5,
    marginTop: 2,
  },
  exitLink: {
    fontSize: 13,
    color: '#888',
    paddingTop: 4,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
    gap: 12,
  },
  rowIndex: {
    fontSize: 13,
    opacity: 0.35,
    width: 20,
    textAlign: 'right',
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowCountry: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  rowCapital: {
    fontSize: 15,
    color: '#0066cc',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  listFooter: {
    height: 16,
  },
  footer: {
    paddingTop: 12,
    alignItems: 'center',
    gap: 6,
  },
  practiceButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  practiceButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  footerHint: {
    fontSize: 12,
    opacity: 0.45,
  },
});
