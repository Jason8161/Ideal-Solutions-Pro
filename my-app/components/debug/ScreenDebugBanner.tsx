import { Text, View, StyleSheet } from "react-native";

/**
 * TEMPORARY — visible on TestFlight to identify which route file is rendering.
 * Remove after confirming employee home screen.
 */
export function ScreenDebugBanner({ screenId }: { screenId: string }) {
  return (
    <View style={styles.banner} pointerEvents="none">
      <Text style={styles.text} numberOfLines={2}>
        THIS IS SCREEN: {screenId}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: "#FF00FF",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 4,
    borderBottomColor: "#000000",
  },
  text: {
    color: "#000000",
    fontWeight: "900",
    fontSize: 15,
    textAlign: "center",
  },
});
