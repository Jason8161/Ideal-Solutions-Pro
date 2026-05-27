import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, useFocusEffect, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { VirtualCardSendToCustomerModal } from "@/components/virtualBusinessCard/VirtualCardSendToCustomerModal";
import { VirtualBusinessCardView } from "@/components/virtualBusinessCard/VirtualBusinessCardView";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import {
  accentPanelStyle,
  getAccentTints,
  inputStyle,
  navCardStyle,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { pickImageFromLibrary } from "@/lib/companyLogoPicker";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";
import type { SimpleCustomerContact } from "@/lib/customerContactPick";
import { openVirtualCardSms, showVirtualCardShareMenu } from "@/lib/virtualBusinessCard/exportShare";
import { deferAfterInteractions } from "@/lib/deferNavigation";
import { loadVirtualCardFromUserProfile } from "@/lib/virtualBusinessCard/profileSync";
import { isUsableImageUri } from "@/lib/virtualBusinessCard/safeCard";
import {
  applyTemplateTheme,
  VIRTUAL_CARD_TEMPLATES,
} from "@/lib/virtualBusinessCard/templates";
import {
  createVirtualBusinessCard,
  deleteVirtualBusinessCard,
  duplicateVirtualBusinessCard,
  loadVirtualBusinessCardStore,
  newVirtualCardSocialId,
  setActiveVirtualBusinessCardId,
  upsertVirtualBusinessCard,
} from "@/lib/virtualBusinessCard/storage";
import type {
  VirtualBusinessCardData,
  VirtualCardFontStyle,
  VirtualCardTemplateId,
} from "@/lib/virtualBusinessCard/types";

const FONT_STYLES: { id: VirtualCardFontStyle; label: string }[] = [
  { id: "modern", label: "Modern" },
  { id: "classic", label: "Classic" },
  { id: "condensed", label: "Condensed" },
];

const COLOR_PRESETS = ["#2563eb", "#eab308", "#22c55e", "#ef4444", "#8b5cf6", "#0f172a", "#ffffff", "#1e293b"];

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  styles,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  colors: ColorScheme;
  styles: ReturnType<typeof makeStyles>;
  keyboardType?: "default" | "email-address" | "phone-pad" | "url";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <VoiceTextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor(colors)}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
      />
    </View>
  );
}

export default function VirtualBusinessCardSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const previewRef = useRef<View>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hydrated, setHydrated] = useState(false);
  const [card, setCard] = useState<VirtualBusinessCardData>(() => createVirtualBusinessCard());
  const [savedCards, setSavedCards] = useState<VirtualBusinessCardData[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [sendToCustomerOpen, setSendToCustomerOpen] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [saving, setSaving] = useState(false);

  const patchCard = useCallback((patch: Partial<VirtualBusinessCardData>) => {
    setCard((prev) => ({ ...prev, ...patch, updatedAt: new Date().toISOString() }));
  }, []);

  const reload = useCallback(() => {
    void loadVirtualBusinessCardStore().then((store) => {
      setSavedCards(store.cards);
      const active = store.cards.find((c) => c.id === store.activeCardId) ?? store.cards[0];
      if (active) setCard(active);
      else {
        void loadVirtualCardFromUserProfile()
          .then((fromProfile) => {
            setCard(fromProfile);
          })
          .catch(() => {
            setCard(createVirtualBusinessCard());
          });
      }
      setHydrated(true);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const persistCard = useCallback(async (snapshot: VirtualBusinessCardData) => {
    setSaving(true);
    try {
      const store = await upsertVirtualBusinessCard(snapshot);
      setSavedCards(store.cards);
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistCard(card);
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [card, hydrated, persistCard]);

  const onSaveNow = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    void persistCard(card);
    Alert.alert("Saved", "Your virtual business card is saved on this device.");
  }, [card, persistCard]);

  const onLoadFromProfile = useCallback(() => {
    Alert.alert("Load from User info?", "This replaces fields with your company profile. Template colors stay as-is.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Load",
        onPress: () => {
          void loadVirtualCardFromUserProfile().then((fromProfile) => {
            setCard((prev) => ({
              ...fromProfile,
              id: prev.id,
              name: prev.name,
              templateId: prev.templateId,
              accentColor: prev.accentColor,
              backgroundColor: prev.backgroundColor,
              textColor: prev.textColor,
              fontStyle: prev.fontStyle,
              showQrCode: prev.showQrCode,
            }));
          });
        },
      },
    ]);
  }, []);

  const onResetDefaults = useCallback(() => {
    Alert.alert("Reset card?", "Creates a fresh card from your User info profile.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => void loadVirtualCardFromUserProfile().then(setCard),
      },
    ]);
  }, []);

  const onDuplicate = useCallback(() => {
    const copy = duplicateVirtualBusinessCard(card);
    void persistCard(copy).then(() => {
      setCard(copy);
      Alert.alert("Duplicated", `"${copy.name}" is ready to edit.`);
    });
  }, [card, persistCard]);

  const onSelectTemplate = useCallback((templateId: VirtualCardTemplateId) => {
    setCard((prev) => applyTemplateTheme(prev, templateId));
  }, []);

  const onSwitchCard = useCallback(
    async (id: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      await persistCard(card);
      const next = savedCards.find((c) => c.id === id);
      if (!next) return;
      await setActiveVirtualBusinessCardId(id);
      setCard(next);
      setCardsOpen(false);
    },
    [card, persistCard, savedCards],
  );

  const onNewCard = useCallback(() => {
    void loadVirtualCardFromUserProfile().then((fromProfile) => {
      const created = { ...fromProfile, name: `Card ${savedCards.length + 1}` };
      void persistCard(created).then(() => setCard(created));
      setCardsOpen(false);
    });
  }, [persistCard, savedCards.length]);

  const onDeleteCard = useCallback(
    (id: string) => {
      Alert.alert("Delete this card?", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteVirtualBusinessCard(id).then((store) => {
              setSavedCards(store.cards);
              if (id === card.id) {
                const next = store.cards.find((c) => c.id === store.activeCardId);
                if (next) setCard(next);
                else void loadVirtualCardFromUserProfile().then(setCard);
              }
            });
          },
        },
      ]);
    },
    [card.id],
  );

  const addSocialLink = useCallback(() => {
    patchCard({
      socialLinks: [...card.socialLinks, { id: newVirtualCardSocialId(), label: "Social", url: "" }],
    });
  }, [card.socialLinks, patchCard]);

  const onSendToCustomer = useCallback(
    async (recipient: SimpleCustomerContact) => {
      const phone = recipient.phone.trim();
      if (!phone) {
        Alert.alert("Phone required", "Add a phone number for this customer to send a text.");
        return;
      }
      setSendingSms(true);
      try {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        await persistCard(card);
        await openVirtualCardSms(card, phone);
      } catch (e) {
        Alert.alert("Could not open messages", e instanceof Error ? e.message : "Try again.");
      } finally {
        setSendingSms(false);
      }
    },
    [card, persistCard],
  );

  if (!hydrated) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StickyScrollScreen
        title="Virtual Business Card"
        subtitle="Design, preview, save, and share your professional card."
        backHref={settingsBackHref("virtual-business-card")}
        backLabel={settingsBackLabel("virtual-business-card")}
        scrollStyle={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.previewPanel}>
          <VirtualBusinessCardView ref={previewRef} card={card} />
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={() => setPreviewOpen(true)}>
            <MaterialCommunityIcons name="eye-outline" size={20} color={colors.text} />
            <Text style={styles.actionBtnText}>Preview</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={onSaveNow}>
            <MaterialCommunityIcons name="content-save-outline" size={20} color={colors.text} />
            <Text style={styles.actionBtnText}>{saving ? "Saving…" : "Save"}</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtnPrimary}
            onPress={() => deferAfterInteractions(() => void showVirtualCardShareMenu(card, previewRef))}
            accessibilityLabel="Share my business card"
          >
            <MaterialCommunityIcons name="share-variant" size={20} color={colors.text} />
            <Text style={styles.actionBtnText} numberOfLines={1}>
              Share My Card
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.sendCustomerBtn}
          onPress={() => setSendToCustomerOpen(true)}
          disabled={sendingSms}
          accessibilityLabel="Send business card to customer by text"
        >
          <MaterialCommunityIcons name="message-text-outline" size={20} color={colors.text} />
          <Text style={styles.sendCustomerBtnText}>
            {sendingSms ? "Opening Messages…" : "Send to customer"}
          </Text>
        </Pressable>

        <Pressable style={styles.navCard} onPress={() => setCardsOpen(true)}>
          <Text style={styles.navCardTitle}>My saved cards ({savedCards.length})</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.accent} />
        </Pressable>

        <View style={styles.toolRow}>
          <Pressable style={styles.toolChip} onPress={onLoadFromProfile}>
            <Text style={styles.toolChipText}>Load from User info</Text>
          </Pressable>
          <Pressable style={styles.toolChip} onPress={onDuplicate}>
            <Text style={styles.toolChipText}>Duplicate</Text>
          </Pressable>
          <Pressable style={styles.toolChip} onPress={onResetDefaults}>
            <Text style={styles.toolChipText}>Reset</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Card label</Text>
        <VoiceTextInput
          style={styles.input}
          value={card.name}
          onChangeText={(name) => patchCard({ name })}
          placeholder="e.g. Main card, Job site card"
          placeholderTextColor={placeholderTextColor(colors)}
        />

        <Text style={styles.section}>Templates</Text>
        <Text style={styles.hint}>Switch templates anytime — your text and images stay.</Text>
        <View style={styles.templateGrid}>
          {VIRTUAL_CARD_TEMPLATES.map((t) => {
            const on = card.templateId === t.id;
            return (
              <Pressable
                key={t.id}
                style={[styles.templateTile, on && styles.templateTileOn]}
                onPress={() => onSelectTemplate(t.id)}
              >
                <View style={[styles.templateSwatch, { backgroundColor: t.backgroundColor, borderColor: t.accentColor }]} />
                <Text style={styles.templateName} numberOfLines={2}>
                  {t.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>Your information</Text>
        <Field label="Business name" value={card.businessName} onChangeText={(businessName) => patchCard({ businessName })} placeholder="Company name" colors={colors} styles={styles} />
        <Field label="Your name" value={card.userName} onChangeText={(userName) => patchCard({ userName })} placeholder="Contact name" colors={colors} styles={styles} />
        <Field label="Job title" value={card.jobTitle} onChangeText={(jobTitle) => patchCard({ jobTitle })} placeholder="Owner, electrician, etc." colors={colors} styles={styles} />
        <Field label="Phone" value={card.phone} onChangeText={(phone) => patchCard({ phone })} placeholder="Phone number" colors={colors} styles={styles} keyboardType="phone-pad" />
        <Field label="Email" value={card.email} onChangeText={(email) => patchCard({ email })} placeholder="Email" colors={colors} styles={styles} keyboardType="email-address" />
        <Field label="Website" value={card.website} onChangeText={(website) => patchCard({ website })} placeholder="https://…" colors={colors} styles={styles} keyboardType="url" />
        <Field label="Address / service area" value={card.address} onChangeText={(address) => patchCard({ address })} placeholder="City, state, or full address" colors={colors} styles={styles} />
        <Field label="License number" value={card.licenseNumber} onChangeText={(licenseNumber) => patchCard({ licenseNumber })} placeholder="State / contractor license" colors={colors} styles={styles} />
        <Field label="Tagline" value={card.tagline} onChangeText={(tagline) => patchCard({ tagline })} placeholder="Company slogan" colors={colors} styles={styles} />

        <Text style={styles.section}>Images</Text>
        <View style={styles.imageRow}>
          <Pressable
            style={styles.imageBtn}
            onPress={() =>
              void pickImageFromLibrary({ allowsEditing: true, aspect: [1, 1] }).then((uri) =>
                uri && isUsableImageUri(uri) ? patchCard({ logoUri: uri.trim() }) : undefined,
              )
            }
          >
            <Text style={styles.imageBtnText}>Logo</Text>
          </Pressable>
          <Pressable
            style={styles.imageBtn}
            onPress={() =>
              void pickImageFromLibrary({ allowsEditing: true, aspect: [1, 1] }).then((uri) =>
                uri && isUsableImageUri(uri) ? patchCard({ profilePhotoUri: uri.trim() }) : undefined,
              )
            }
          >
            <Text style={styles.imageBtnText}>Profile photo</Text>
          </Pressable>
          <Pressable style={styles.imageBtn} onPress={() => patchCard({ logoUri: null, profilePhotoUri: null })}>
            <Text style={styles.imageBtnText}>Clear images</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Social links</Text>
        {card.socialLinks.map((link, index) => (
          <View key={link.id} style={styles.socialRow}>
            <VoiceTextInput
              style={[styles.input, styles.socialInput]}
              value={link.label}
              onChangeText={(label) => {
                const socialLinks = [...card.socialLinks];
                socialLinks[index] = { ...link, label };
                patchCard({ socialLinks });
              }}
              placeholder="Label"
              placeholderTextColor={placeholderTextColor(colors)}
            />
            <VoiceTextInput
              style={[styles.input, styles.socialInputWide]}
              value={link.url}
              onChangeText={(url) => {
                const socialLinks = [...card.socialLinks];
                socialLinks[index] = { ...link, url };
                patchCard({ socialLinks });
              }}
              placeholder="https://…"
              placeholderTextColor={placeholderTextColor(colors)}
              autoCapitalize="none"
            />
            <Pressable
              onPress={() => patchCard({ socialLinks: card.socialLinks.filter((l) => l.id !== link.id) })}
              accessibilityLabel="Remove social link"
            >
              <MaterialCommunityIcons name="close-circle-outline" size={22} color={colors.text} />
            </Pressable>
          </View>
        ))}
        <Pressable style={styles.addSocialBtn} onPress={addSocialLink}>
          <Text style={styles.addSocialText}>+ Add social link</Text>
        </Pressable>

        <Text style={styles.section}>Style</Text>
        <View style={styles.fontRow}>
          {FONT_STYLES.map((f) => (
            <Pressable
              key={f.id}
              style={[styles.fontChip, card.fontStyle === f.id && styles.fontChipOn]}
              onPress={() => patchCard({ fontStyle: f.id })}
            >
              <Text style={styles.fontChipText}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        <Field label="Accent color (#hex)" value={card.accentColor} onChangeText={(accentColor) => patchCard({ accentColor })} placeholder="#2563eb" colors={colors} styles={styles} />
        <Field label="Background (#hex)" value={card.backgroundColor} onChangeText={(backgroundColor) => patchCard({ backgroundColor })} placeholder="#f8fafc" colors={colors} styles={styles} />
        <Field label="Text color (#hex)" value={card.textColor} onChangeText={(textColor) => patchCard({ textColor })} placeholder="#0f172a" colors={colors} styles={styles} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorPresets}>
          {COLOR_PRESETS.map((hex) => (
            <Pressable key={hex} style={[styles.colorDot, { backgroundColor: hex }]} onPress={() => patchCard({ accentColor: hex })} />
          ))}
        </ScrollView>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Show QR code on card</Text>
          <Switch
            value={card.showQrCode}
            onValueChange={(showQrCode) => patchCard({ showQrCode })}
            thumbColor={colors.accent}
            trackColor={{ false: hexToRgba(colors.text, 0.2), true: hexToRgba(colors.accent, 0.5) }}
          />
        </View>

        <Text style={styles.section}>Related settings</Text>
        <Link href={"/settings/business-card-qr" as Href} asChild>
          <TouchableOpacity style={styles.navCard}>
            <Text style={styles.navCardTitle}>Business card QR</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.accent} />
          </TouchableOpacity>
        </Link>
        <Link href={"/settings/business-card-display" as Href} asChild>
          <TouchableOpacity style={styles.navCard}>
            <Text style={styles.navCardTitle}>Business card display</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.accent} />
          </TouchableOpacity>
        </Link>
        <Link href={"/business-card" as Href} asChild>
          <TouchableOpacity style={styles.navCard}>
            <Text style={styles.navCardTitle}>Preview live card screen</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.accent} />
          </TouchableOpacity>
        </Link>
      </StickyScrollScreen>

      <Modal visible={previewOpen} animationType="fade" transparent onRequestClose={() => setPreviewOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPreviewOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Preview</Text>
            <VirtualBusinessCardView card={card} />
            <TouchableOpacity style={styles.modalClose} onPress={() => setPreviewOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <VirtualCardSendToCustomerModal
        visible={sendToCustomerOpen}
        onClose={() => setSendToCustomerOpen(false)}
        onRecipientSelected={(recipient) => {
          setSendToCustomerOpen(false);
          void onSendToCustomer(recipient);
        }}
      />

      <Modal visible={cardsOpen} animationType="slide" transparent onRequestClose={() => setCardsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCardsOpen(false)}>
          <Pressable style={styles.modalSheetTall} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>My saved cards</Text>
            <Pressable style={styles.newCardBtn} onPress={onNewCard}>
              <Text style={styles.newCardBtnText}>+ New card from User info</Text>
            </Pressable>
            <ScrollView style={styles.cardsScroll}>
              {savedCards.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.cardRow, c.id === card.id && styles.cardRowActive]}
                  onPress={() => void onSwitchCard(c.id)}
                  onLongPress={() => onDeleteCard(c.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardRowTitle}>{c.name}</Text>
                    <Text style={styles.cardRowMeta} numberOfLines={1}>
                      {c.businessName || "No business name"} · {c.templateId}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.accent} />
                </Pressable>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setCardsOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const nav = navCardStyle(colors);
  const secondary = secondaryButtonStyle(colors, tints);
  const input = inputStyle(colors, tints);

  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 20, paddingBottom: 48, gap: 10 },
    loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
    previewPanel: { ...panel, padding: 12, marginBottom: 4 },
    actionRow: { flexDirection: "row", gap: 8 },
    actionBtn: { ...secondary, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
    actionBtnPrimary: { ...nav, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
    actionBtnText: { color: colors.text, fontWeight: "800", fontSize: 14 },
    sendCustomerBtn: {
      ...nav,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      marginTop: 4,
    },
    sendCustomerBtnText: { color: colors.text, fontWeight: "800", fontSize: 15 },
    navCard: { ...nav, flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
    navCardTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "800" },
    toolRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    toolChip: { ...secondary, paddingVertical: 10, paddingHorizontal: 12 },
    toolChipText: { color: colors.text, fontSize: 13, fontWeight: "700" },
    section: {
      marginTop: 12,
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    hint: { fontSize: 13, color: tints.mutedText, lineHeight: 18 },
    field: { gap: 6 },
    fieldLabel: { fontSize: 14, fontWeight: "700", color: colors.text },
    input,
    templateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
    templateTile: { ...panel, width: "47%", padding: 10, gap: 6 },
    templateTileOn: { backgroundColor: tints.accentTintActive },
    templateSwatch: { height: 28, borderRadius: 6, borderWidth: 2 },
    templateName: { fontSize: 12, fontWeight: "700", color: colors.text },
    imageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    imageBtn: { ...secondary, paddingVertical: 12, paddingHorizontal: 14 },
    imageBtnText: { color: colors.text, fontWeight: "700" },
    socialRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    socialInput: { flex: 0.35 },
    socialInputWide: { flex: 1 },
    addSocialBtn: { paddingVertical: 8 },
    addSocialText: { color: colors.accent, fontWeight: "700" },
    fontRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    fontChip: { ...secondary, paddingVertical: 10, paddingHorizontal: 14 },
    fontChipOn: { backgroundColor: tints.accentTintActive },
    fontChipText: { color: colors.text, fontWeight: "700" },
    colorPresets: { gap: 8, paddingVertical: 8 },
    colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: hexToRgba(colors.text, 0.2) },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
    switchLabel: { color: colors.text, fontSize: 15, fontWeight: "700" },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
    modalSheet: { ...panel, padding: 20, gap: 16, maxHeight: "85%" },
    modalSheetTall: { ...panel, padding: 20, maxHeight: "80%" },
    modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
    modalClose: { alignItems: "center", paddingVertical: 12 },
    modalCloseText: { color: colors.text, fontWeight: "700" },
    newCardBtn: { ...nav, padding: 14, alignItems: "center", marginBottom: 8 },
    newCardBtnText: { color: colors.text, fontWeight: "800" },
    cardsScroll: { maxHeight: 320 },
    cardRow: { ...panel, flexDirection: "row", alignItems: "center", padding: 12, marginBottom: 8 },
    cardRowActive: { backgroundColor: tints.accentTintActive },
    cardRowTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    cardRowMeta: { fontSize: 12, color: tints.mutedText, marginTop: 2 },
  });
}
