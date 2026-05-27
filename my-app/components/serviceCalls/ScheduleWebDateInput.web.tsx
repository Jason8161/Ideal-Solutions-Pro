import { createElement } from "react";
import { StyleSheet, Text, View } from "react-native";

import { dayKeyFromDate, isValidScheduleDayKey } from "@/lib/appointmentStorage";

type Props = {
  value: string;
  onChange: (dayKey: string) => void;
};

export function ScheduleWebDateInput({ value, onChange }: Props) {
  const controlValue = isValidScheduleDayKey(value) ? value : dayKeyFromDate(new Date());

  const input = createElement("input", {
    type: "date",
    value: controlValue,
    onChange: (e: { currentTarget: { value: string } }) => {
      const v = e.currentTarget.value;
      if (v) onChange(v);
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
      <Text style={styles.label}>Visit date</Text>
      <Text style={styles.hint}>Choose a day with your browser&apos;s calendar control.</Text>
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
