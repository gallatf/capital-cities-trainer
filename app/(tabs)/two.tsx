import { useCallback, useRef, useState } from 'react';
import { Alert, Dimensions, FlatList, Modal, Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { useProgress } from '@/hooks/useProgress';
import { reportRow, reportSummary, currentStreak, verbStatus } from '@shared/logic.js';
import type { CapitalEntry } from '@/hooks/useSession';
import entries from '../../assets/data/capitals.json';

type ReportFilter = 'all' | 'difficult' | 'practiced' | 'known';
type ReportSort = 'accuracy' | 'country' | 'attempts';

const REPORT_FILTERS: { key: ReportFilter; label: string }[] = [
  { key: 'difficult', label: 'Difficult' },
  { key: 'practiced', label: 'Practiced' },
  { key: 'known', label: 'Known' },
  { key: 'all', label: 'All' },
];

const REPORT_SORTS: { key: ReportSort; label: string }[] = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'country', label: 'Country' },
  { key: 'attempts', label: 'Attempts' },
];

const TREND_CHAR: Record<string, string> = {
  improving: '↑',
  declining: '↓',
  stable: '→',
};

const TREND_STYLE: Record<string, keyof typeof styles> = {
  improving: 'trendUp',
  declining: 'trendDown',
  stable: 'trendStable',
};

const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  known: 'Known',
  difficult: 'Difficult',
};

export default function ReportScreen() {
  const { progress, loaded, reload, reset } = useProgress();
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [sort, setSort] = useState<ReportSort>('accuracy');
  const [revealedId, setRevealedId] = useState<string | null>(null);

  function handleReset() {
    Alert.alert(
      'Reset progress',
      'This deletes all your practice history and starts from scratch. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => reset() },
      ]
    );
  }

  // Re-read progress from storage every time this tab gains focus, since the
  // Practice tab stays mounted in the background and updates progress there.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  if (!loaded) {
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const summary = reportSummary(entries as CapitalEntry[], progress);
  const accuracyPct = summary.accuracy === null ? '—' : `${Math.round(summary.accuracy * 100)}%`;

  // Overall streak across all attempts, in chronological order.
  const allHistory: boolean[] = [];
  for (const e of entries as CapitalEntry[]) {
    const p = progress[e.id];
    if (p?.history) allHistory.push(...p.history);
  }
  const streak = currentStreak(allHistory);

  let rows = (entries as CapitalEntry[]).map((e) => ({ ...reportRow(e, progress), status: verbStatus(e.id, progress) }));

  if (filter === 'difficult') rows = rows.filter((r) => r.missed > r.knew);
  else if (filter === 'practiced') rows = rows.filter((r) => r.seen > 0);
  else if (filter === 'known') rows = rows.filter((r) => r.seen > 0 && r.knew >= r.missed);

  if (sort === 'accuracy') rows = [...rows].sort((a, b) => {
    if (a.accuracy === null) return b.accuracy === null ? 0 : 1;
    if (b.accuracy === null) return -1;
    return a.accuracy - b.accuracy;
  });
  else if (sort === 'country') rows = [...rows].sort((a, b) => a.verb.country.localeCompare(b.verb.country));
  else if (sort === 'attempts') rows = [...rows].sort((a, b) => b.seen - a.seen);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.summaryGrid}
        style={styles.summaryScroll}
      >
        <SummaryTile label="Practiced" value={`${summary.practiced}/${entries.length}`} />
        <SummaryTile label="Accuracy" value={accuracyPct} />
        <SummaryTile label="Mastered" value={String(summary.mastered)} />
        <SummaryTile label="Difficult" value={String(summary.difficult)} />
        <SummaryTile label="Not seen" value={String(summary.notSeen)} />
        <SummaryTile label="Streak" value={String(streak)} />
      </ScrollView>

      <View style={styles.toggleRow}>
        <SelectBox
          style={styles.filterSelect}
          value={filter}
          options={REPORT_FILTERS}
          onChange={setFilter}
        />
        <SelectBox
          style={styles.sortSelect}
          textStyle={styles.sortSelectText}
          value={sort}
          options={REPORT_SORTS}
          onChange={setSort}
          prefix="Sort: "
          align="right"
        />
        <Pressable style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </Pressable>
      </View>

      {rows.length === 0 ? (
        <Text style={styles.emptyText}>No countries match this filter yet.</Text>
      ) : (
      <FlatList
        data={rows}
        keyExtractor={(item) => item.verb.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const pct = item.accuracy === null ? '—' : `${Math.round(item.accuracy * 100)}%`;
          const trendChar = item.trend ? TREND_CHAR[item.trend] ?? '—' : '—';
          const trendStyle = item.trend ? styles[TREND_STYLE[item.trend]] : styles.trendStable;
          const dots: boolean[] = item.history.slice(-5);
          const isRevealed = revealedId === item.verb.id;
          return (
            <Pressable
              style={styles.row}
              onPress={() => setRevealedId(isRevealed ? null : item.verb.id)}
            >
              <View style={styles.rowMain}>
                <Text style={styles.countryName}>
                  {item.verb.country}
                  {isRevealed ? <Text style={styles.capitalReveal}> — {item.verb.capital}</Text> : null}
                </Text>
                <Text style={[styles.statusBadge, styles[`status_${item.status}` as keyof typeof styles]]}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Text>
              </View>
              <View style={styles.rowStats}>
                <Text style={styles.rowStat}>Seen: {item.seen}</Text>
                <Text style={styles.rowStat}>Acc: {pct}</Text>
                <Text style={[styles.rowStat, trendStyle]}>{trendChar}</Text>
                {dots.length > 0 ? (
                  <View style={styles.dotsRow}>
                    {dots.map((correct: boolean, i: number) => (
                      <Text
                        key={i}
                        style={correct ? styles.dotCorrect : styles.dotMissed}
                      >
                        {correct ? '●' : '○'}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
      )}
    </View>
  );
}

// A tap-to-open dropdown: shows the current option's label, and opens a
// list of all options anchored just below the box itself (like a native
// select). Used for the Report screen's filter and sort controls so they
// each take a single compact box.
function SelectBox<T extends string>({
  value,
  options,
  onChange,
  prefix = '',
  style,
  textStyle,
  align = 'left',
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (key: T) => void;
  prefix?: string;
  style?: object;
  textStyle?: object;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number; right: number; width: number } | null>(null);
  const buttonRef = useRef<RNView>(null);
  const current = options.find((o) => o.key === value);

  function openMenu() {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      setAnchor({ top: y + height + 4, left: x, right: screenWidth - (x + width), width });
      setOpen(true);
    });
  }

  return (
    <>
      <Pressable ref={buttonRef} style={[styles.selectButton, style]} onPress={openMenu}>
        <Text style={[styles.selectButtonText, textStyle]}>
          {prefix}{current?.label} ▾
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          {anchor ? (
            <View
              style={[
                styles.dropdown,
                { top: anchor.top, minWidth: anchor.width },
                align === 'right' ? { right: anchor.right } : { left: anchor.left },
              ]}
            >
              {options.map(({ key, label }) => (
                <Pressable
                  key={key}
                  style={[styles.dropdownOption, key === value && styles.dropdownOptionActive]}
                  onPress={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, key === value && styles.dropdownOptionTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 24,
  },
  summaryScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  tile: {
    minWidth: 80,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 102, 204, 0.08)',
  },
  tileValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0066cc',
  },
  tileLabel: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  selectButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066cc',
  },
  filterSelect: {
    flexShrink: 1,
  },
  resetButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c62828',
  },
  resetButtonText: {
    color: '#c62828',
    fontWeight: '600',
    fontSize: 13,
  },
  sortSelect: {
    borderColor: '#666',
  },
  sortSelectText: {
    color: '#666',
  },
  selectButtonText: {
    color: '#0066cc',
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
  },
  dropdownOptionText: {
    fontSize: 14,
  },
  dropdownOptionTextActive: {
    color: '#0066cc',
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 24,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 3,
    paddingBottom: 24,
  },
  row: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  countryName: {
    fontSize: 15,
    fontWeight: '600',
  },
  capitalReveal: {
    fontWeight: '400',
    color: '#0066cc',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    color: '#fff',
  },
  status_new: {
    backgroundColor: '#757575',
  },
  status_known: {
    backgroundColor: '#2e7d32',
  },
  status_difficult: {
    backgroundColor: '#c62828',
  },
  rowStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowStat: {
    fontSize: 12,
    opacity: 0.8,
  },
  trendUp: {
    color: '#16a34a',
    fontWeight: '700',
    opacity: 1,
  },
  trendDown: {
    color: '#dc2626',
    fontWeight: '700',
    opacity: 1,
  },
  trendStable: {
    color: '#888',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 'auto',
  },
  dotCorrect: {
    fontSize: 12,
    color: '#16a34a',
  },
  dotMissed: {
    fontSize: 12,
    color: '#dc2626',
  },
});
