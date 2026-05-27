import { createElement } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  value: string;
  onChange: (timeHHMM: string) => void;
};

function timeValueForInput(hm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return "09:00";
  const h = String(Number(m[1])).padStart(2, "0");
  const min = String(Number(m[2])).padStart(2, "0");
  return `${h}:${min}`;
}

export function ScheduleWebTimeInput({ value, onChange }: Props) {
  const controlValue = value.trim() ? timeValueForInput(value) : "09:00";

  const input = createElement("input", {
    type: "time",
    value: controlValue,
    step: 300,
    onChange: (e: { currentTarget: { value: string } }) => {
      const v = e.currentTarget.value;
      if (!v) return;
      const parts = v.split(":");
      if (parts.length >= 2) {
        const h = Number(parts[0]);
        const min = Number(parts[1]);
        if (!Number.isNaN(h) && !Number.isNaN(min)) {
          onChange(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
        }
      }
    },
    style: {
      width: "100%",
      maxWidth: 360,
      boxSizing: "border-box" as const,
      marginTop: 8,
      padding: 12,
      borderRadius: 12,
      border: "1px solid #3d5a8a",
      backgroundColor: "#102C55",
      color: "#ffffff",
      fontSize: 16,
      fontFamily: "system-ui, sans-serif",
    },
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Start time</Text>
      <Text style={styles.hint}>Pick a time with your browser&apos;s clock control (24-hour where supported).</Text>
      {input}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e8eeff",
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: "#94a8d6",
    marginBottom: 4,
    lineHeight: 18,
  },
});
