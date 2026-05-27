import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppConstructionBackdrop } from "@/components/AppConstructionBackdrop";
import { LegalDocumentCard } from "@/components/legal/LegalDocumentCard";
import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import {
  getAccentTints,
  onAccentTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { LEGAL_STUFF_DOCUMENTS, type LegalStuffDocId } from "@/constants/legal";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";

type Props = {
  busy?: boolean;
  onAcceptAll: () => void | Promise<void>;
  onDecline: () => void;
};

type DocProgress = Record<LegalStuffDocId, { viewed: boolean; checked: boolean }>;

function initialProgress(): DocProgress {
  return LEGAL_STUFF_DOCUMENTS.reduce((acc, doc) => {
    acc[doc.id] = { viewed: false, checked: false };
    return acc;
  }, {} as DocProgress);
}

export function LegalAgreementFlow({ busy = false, onAcceptAll, onDecline }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [progress, setProgress] = useState<DocProgress>(initialProgress);
  const [viewingId, setViewingId] = useState<LegalStuffDocId | null>(null);

  const viewingDoc = viewingId
    ? LEGAL_STUFF_DOCUMENTS.find((d) => d.id === viewingId) ?? null
    : null;

  const allAccepted = LEGAL_STUFF_DOCUMENTS.every((d) => progress[d.id].checked);
  const canSubmit = allAccepted && !busy;

  const markViewed = useCallback((id: LegalStuffDocId) => {
    setProgress((prev) => ({
      ...prev,
      [id]: { ...prev[id], viewed: true },
    }));
  }, []);

  const toggleChecked = useCallback((id: LegalStuffDocId) => {
    setProgress((prev) => {
      if (!prev[id].viewed) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], checked: !prev[id].checked },
      };
    });
  }, []);

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Legal agreements</Text>
      <Text style={styles.lede}>
        Review each document, then check the box to confirm. All six are required to use Ideal Solutions Pro.
      </Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator>
        {LEGAL_STUFF_DOCUMENTS.map((doc) => (
          <LegalDocumentCard
            key={doc.id}
            doc={doc}
            checked={progress[doc.id].checked}
            viewed={progress[doc.id].viewed}
            onToggle={() => toggleChecked(doc.id)}
            onView={() => setViewingId(doc.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.acceptButton,
            !canSubmit && styles.acceptButtonDisabled,
            pressed && canSubmit && styles.pressed,
          ]}
          disabled={!canSubmit}
          onPress={() => void onAcceptAll()}
          accessibilityRole="button"
          accessibilityLabel="Accept all and continue"
        >
          <Text style={styles.acceptButtonText}>{busy ? "Saving…" : "Accept all and continue"}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.declineButton, pressed && styles.pressed]}
          onPress={onDecline}
          accessibilityRole="button"
          accessibilityLabel="Decline"
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </Pressable>
      </View>

      <Modal visible={viewingDoc != null} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.modalRoot}>
          <AppConstructionBackdrop />
          <SafeAreaView style={styles.modalRoot}>
            {viewingDoc ? (
              <>
                <LegalDocumentScreen
                  title={viewingDoc.title}
                  body={viewingDoc.content}
                  effectiveVersion={`${viewingDoc.version} · ${viewingDoc.lastUpdated}`}
                  mode="read"
                  onMarkViewed={() => markViewed(viewingDoc.id)}
                />
                <View style={styles.modalFooter}>
                  <Pressable
                    style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
                    onPress={() => {
                      if (viewingDoc) markViewed(viewingDoc.id);
                      setViewingId(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Done reviewing"
                  >
                    <Text style={styles.doneButtonText}>Done reviewing</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const secondary = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 12,
      minHeight: 0,
    },
    heading: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "800",
      marginBottom: 6,
    },
    lede: {
      color: hexToRgba(colors.text, 0.8),
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
    },
    list: {
      flex: 1,
      minHeight: 0,
    },
    listContent: {
      gap: 12,
      paddingBottom: 16,
    },
    footer: {
      paddingTop: 12,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: hexToRgba(colors.accent, 0.22),
    },
    acceptButton: {
      ...secondary,
      paddingVertical: 14,
      backgroundColor: colors.accent,
    },
    acceptButtonDisabled: {
      opacity: 0.45,
    },
    acceptButtonText: {
      color: onAccentTextColor(colors),
      fontSize: 17,
      fontWeight: "800",
    },
    declineButton: {
      marginTop: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    declineButtonText: {
      color: hexToRgba(colors.text, 0.65),
      fontSize: 15,
      fontWeight: "600",
    },
    modalRoot: {
      flex: 1,
      backgroundColor: "transparent",
    },
    modalFooter: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: hexToRgba(colors.accent, 0.22),
    },
    doneButton: {
      ...secondary,
      paddingVertical: 14,
    },
    doneButtonText: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
