import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import { dayKeyFromDate, isValidScheduleDayKey, parseDayKey } from "@/lib/appointmentStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

type DayCell = { day: number; dayKey: string };

function buildMonthGrid(viewMonth: Date): (DayCell | null)[][] {
  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const nDays = new Date(y, m + 1, 0).getDate();
  const flat: (DayCell | null)[] = [];
  for (let i = 0; i < firstDow; i += 1) flat.push(null);
  for (let day = 1; day <= nDays; day += 1) {
    flat.push({ day, dayKey: dayKeyFromDate(new Date(y, m, day)) });
  }
  while (flat.length % 7 !== 0) flat.push(null);
  const rows: (DayCell | null)[][] = [];
  for (let i = 0; i < flat.length; i += 7) rows.push(flat.slice(i, i + 7));
  return rows;
}

function monthTitle(d: Date): string {
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export type InlineMonthCalendarProps = {
  selectedDayKey: string;
  onSelectDay: (dayKey: string) => void;
};

export function InlineMonthCalendar({ selectedDayKey, onSelectDay }: InlineMonthCalendarProps) {
  const { colors } = useAppTheme();
  const accentTint = hexToRgba(colors.accent, 0.22);
  const accentTintActive = hexToRgba(colors.accent, 0.38);
  const mutedText = hexToRgba(colors.text, 0.72);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));

  useEffect(() => {
    const t = selectedDayKey.trim();
    if (!isValidScheduleDayKey(t)) return;
    const next = startOfMonth(parseDayKey(t));
    setViewMonth((prev) =>
      prev.getFullYear() === next.getFullYear() && prev.getMonth() === next.getMonth() ? prev : next,
    );
  }, [selectedDayKey]);

  const todayKey = useMemo(() => dayKeyFromDate(new Date()), []);
  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const goPrev = useCallback(() => {
    setViewMonth((prev) => addMonths(prev, -1));
  }, []);
  const goNext = useCallback(() => {
    setViewMonth((prev) => addMonths(prev, 1));
  }, []);

  return (
    <View style={[styles.wrap, { backgroundColor: accentTint, borderColor: "transparent" }]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={goPrev}
          hitSlop={12}
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.75 }]}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Text style={[styles.navBtnText, { color: colors.text }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthTitle, { color: colors.text }]}>{monthTitle(viewMonth)}</Text>
        <Pressable
          onPress={goNext}
          hitSlop={12}
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.75 }]}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Text style={[styles.navBtnText, { color: colors.text }]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: mutedText }]}>{label}</Text>
          </View>
        ))}
      </View>

      {grid.map((row, ri) => (
        <View key={`w-${ri}`} style={styles.dayRow}>
          {row.map((cell, ci) => {
            if (!cell) {
              return <View key={`e-${ri}-${ci}`} style={styles.dayCell} />;
            }
            const selected = selectedDayKey.trim() === cell.dayKey;
            const isToday = cell.dayKey === todayKey;
            return (
              <Pressable
                key={cell.dayKey}
                onPress={() => onSelectDay(cell.dayKey)}
                style={({ pressed }) => [
                  styles.dayCell,
                  styles.dayPressable,
                  {
                    backgroundColor: selected ? accentTintActive : "transparent",
                    borderColor: "transparent",
                    borderWidth: 1,
                  },
                  pressed && !selected && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${cell.dayKey}${selected ? ", selected" : ""}`}
              >
                <Text
                  style={[
                    styles.dayNum,
                    {
                      color: selected ? colors.text : isToday ? colors.accent : colors.text,
                      fontWeight: isToday ? "800" : "600",
                    },
                  ]}
                >
                  {cell.day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  navBtn: {
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnText: {
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 32,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dayRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPressable: {
    margin: 2,
    borderRadius: 10,
  },
  dayNum: {
    fontSize: 15,
    fontWeight: "600",
  },
});
