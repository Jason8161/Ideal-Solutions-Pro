import { Platform, StyleSheet, Text, View } from "react-native";

export function RetailDisclaimer() {
  return (
    <View style={styles.box} accessibilityRole="text">
      <Text style={styles.title}>Live pricing</Text>
      <Text style={styles.body}>
        Prices and availability come from each retailer when you open their official site. This app does not
        store Home Depot or Lowe&apos;s prices as a preset list—always confirm at checkout.
      </Text>
      {Platform.OS === "web" ? (
        <Text style={styles.body}>On web, retailer links open in a new browser tab.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#3d5a8a",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#102C55",
    gap: 6,
  },
  title: {
    fontWeight: "700",
    fontSize: 14,
    color: "#ffffff",
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: "#c7d8ff",
  },
});
