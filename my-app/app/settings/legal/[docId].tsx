import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { getLegalStuffDocument, isLegalStuffDocId } from "@/constants/legal";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

export default function LegalStuffDocumentPage() {
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!docId || !isLegalStuffDocId(docId)) {
    return (
      <StickyScrollScreen title="Legal document" backHref="/settings/legal-stuff" backLabel="← Legal Stuff">
        <Text style={styles.error}>Document not found.</Text>
      </StickyScrollScreen>
    );
  }

  const doc = getLegalStuffDocument(docId);

  return (
    <StickyScrollScreen
      title={doc.title}
      subtitle="Read-only copy for your records."
      backHref="/settings/legal-stuff"
      backLabel="← Legal Stuff"
      contentContainerStyle={styles.content}
    >
      <LegalDocumentScreen
        title={doc.title}
        body={doc.content}
        effectiveVersion={`${doc.version} · ${doc.lastUpdated}`}
        mode="read"
      />
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    content: {
      flex: 1,
      minHeight: 400,
      paddingBottom: 24,
    },
    error: {
      color: colors.text,
      fontSize: 16,
      padding: 24,
    },
  });
}
