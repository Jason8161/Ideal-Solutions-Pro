import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";

import { FormScrollView, FORM_MULTILINE_EXTRA_SCROLL_HEIGHT } from "@/components/FormScrollView";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { AiUsageBanner } from "@/components/employeeAi/AiUsageBanner";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { StickyPageHeader, StickyScreenShell } from "@/components/serviceCalls/screenChrome";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import {
  emptyBossEstimate,
  getBossEstimateById,
  saveBossEstimate,
} from "@/lib/bossMan/bossEstimateStorage";
import { computeBossEstimateTotal, formatBossMoney } from "@/lib/bossMan/money";
import type { BossEstimate } from "@/lib/bossMan/types";
import { recordAiQuestion } from "@/lib/employeeAi/usageStorage";
import { useAiAccess } from "@/lib/employeeAi/useAiAccess";
import { useSubscription } from "@/context/SubscriptionContext";
import { canAccessFeature } from "@/lib/subscription/featureAccess";
import {
  checkDailyImageUploadLimit,
  loadDailyUsage,
  recordDailyImageUpload,
} from "@/lib/subscription/dailyUsage";
import { applyPhotoEstimateToBossEstimate } from "@/lib/photoToEstimateApply";
import { requestPhotoEstimate } from "@/lib/photoToEstimateClient";
import {
  encodeEstimatePhotoForApi,
  MAX_PHOTO_ESTIMATE_IMAGES,
  pickEstimatePhotosFromLibrary,
  type PickedEstimatePhoto,
} from "@/lib/photoToEstimateImage";
import type { PhotoEstimateAiResult } from "@/lib/photoToEstimateTypes";
import { companyProfileFromPartial, loadCompanyProfile } from "@/lib/profileStorage";

export default function PhotoToEstimateScreen() {
  const { id: estimateIdParam } = useLocalSearchParams<{ id?: string }>();
  const estimateId = Array.isArray(estimateIdParam) ? estimateIdParam[0] : estimateIdParam;
  const router = useRouter();
  const { colors } = useAppTheme();
  const { scStyles, styles: bossStyles } = useBossManChrome();
  const { access, refresh } = useAiAccess();
  const { activeTier, featureAccessContext, refresh: refreshSubscription } = useSubscription();
  const input = useMemo(() => inputStyle(colors), [colors]);

  const [photos, setPhotos] = useState<PickedEstimatePhoto[]>([]);
  const [notes, setNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<PhotoEstimateAiResult | null>(null);
  const [previewEstimate, setPreviewEstimate] = useState<BossEstimate | null>(null);
  const [saving, setSaving] = useState(false);

  const addPhotos = useCallback(async () => {
    if (!canAccessFeature("estimate_image_uploads", activeTier, featureAccessContext)) {
      Alert.alert(
        "Photo estimates",
        "Jobsite photo uploads need Side Job / DIY Mode or higher.",
        [
          { text: "Not now", style: "cancel" },
          { text: "View plans", onPress: () => router.push("/settings/subscribe" as Href) },
        ],
      );
      return;
    }
    const usage = await loadDailyUsage();
    const imageCheck = checkDailyImageUploadLimit(activeTier, usage);
    if (!imageCheck.allowed) {
      Alert.alert(
        "Daily photo limit",
        imageCheck.limit === 0
          ? "Photo uploads are not included on Helper Mode. Upgrade to Side Job or Bossman."
          : `You've used today's ${imageCheck.limit} photo uploads. Super Bossman has unlimited photos.`,
        [{ text: "OK", style: "cancel" }],
      );
      return;
    }
    const picked = await pickEstimatePhotosFromLibrary(photos.length);
    if (picked.length === 0) return;
    const remaining =
      imageCheck.limit === null ? picked.length : Math.max(0, (imageCheck.remaining ?? 0));
    const accepted = picked.slice(0, remaining || picked.length);
    if (accepted.length < picked.length) {
      Alert.alert("Daily photo limit", `Only ${accepted.length} more photo(s) allowed today on your plan.`);
    }
    for (let i = 0; i < accepted.length; i += 1) {
      await recordDailyImageUpload();
    }
    void refreshSubscription();
    setPhotos((prev) => [...prev, ...accepted].slice(0, MAX_PHOTO_ESTIMATE_IMAGES));
    setResult(null);
    setPreviewEstimate(null);
  }, [activeTier, featureAccessContext, photos.length, refreshSubscription, router]);

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
    setPreviewEstimate(null);
  };

  const analyze = async () => {
    if (photos.length === 0) {
      Alert.alert("Add photos", "Upload at least one jobsite photo for the AI to review.");
      return;
    }

    if (access && !access.check.allowed) {
      const showSubscribe =
        !access.isEmployee &&
        (access.ownerSubscriptionTier === "locked" || access.ownerSubscriptionTier === "side_hustle");
      Alert.alert(
        "AI limit reached",
        access.check.blockReason ??
          "You've reached fair-use limits. AI is included with your app subscription.",
        showSubscribe
          ? [
              { text: "Not now", style: "cancel" },
              {
                text: "View plans",
                onPress: () => router.push("/settings/subscribe" as Href),
              },
            ]
          : [{ text: "OK", style: "cancel" }],
      );
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setPreviewEstimate(null);

    try {
      const profile = await loadCompanyProfile();
      const company = companyProfileFromPartial(profile);
      const encoded = await Promise.all(photos.map((p) => encodeEstimatePhotoForApi(p)));

      const response = await requestPhotoEstimate({
        images: encoded,
        notes: notes.trim() || undefined,
        userContext: {
          companyName: company.companyName,
          trade: company.businessType,
        },
      });

      if (!response.ok) {
        Alert.alert("Photo estimate", response.message);
        return;
      }

      await recordAiQuestion({
        actor: access?.actor ?? "owner",
        employeeId: access?.employeeId,
      });
      await refresh();

      const base = estimateId
        ? (await getBossEstimateById(estimateId)) ?? emptyBossEstimate("custom")
        : emptyBossEstimate("custom");

      const merged = applyPhotoEstimateToBossEstimate(base, response.estimate);
      setResult(response.estimate);
      setPreviewEstimate(merged);
    } finally {
      setAnalyzing(false);
    }
  };

  const saveAndOpen = async () => {
    if (!previewEstimate) return;
    setSaving(true);
    try {
      const saved = await saveBossEstimate(previewEstimate);
      router.replace(`/job-folder/estimates/estimate-edit?id=${saved.id}` as Href);
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  };

  const previewTotal = previewEstimate ? computeBossEstimateTotal(previewEstimate) : 0;

  return (
    <StickyScreenShell
      header={
        <StickyPageHeader
          title="Photo to estimate"
          subtitle="Upload jobsite photos — AI drafts scope, line items, and amounts for you to review."
          fallbackHref={"/job-folder/estimates" as Href}
        />
      }
    >
      <FormScrollView
        style={scStyles.scrollBody}
        contentContainerStyle={scStyles.content}
        extraScrollHeight={FORM_MULTILINE_EXTRA_SCROLL_HEIGHT}
      >
        {access ? (
          <AiUsageBanner
            check={access.check}
            isEmployee={access.isEmployee}
            ownerSubscriptionTier={access.ownerSubscriptionTier}
            crewAiIncluded={access.crewAiIncluded}
            hideUpgrade={access.crewAiIncluded}
          />
        ) : null}

        <Text style={scStyles.sectionLabel}>Job photos ({photos.length}/{MAX_PHOTO_ESTIMATE_IMAGES})</Text>
        <Text style={scStyles.emptyText}>
          Include damage, overall scope, measurements, or material photos. More angles improve the draft.
        </Text>

        {photos.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            {photos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={{ width: 100 }}>
                <Image
                  source={{ uri: photo.uri }}
                  style={{ width: 100, height: 100, borderRadius: 10 }}
                  resizeMode="cover"
                  accessibilityLabel={`Job photo ${index + 1}`}
                />
                <Pressable
                  style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }, { marginTop: 6 }]}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={scStyles.menuButtonText}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {photos.length < MAX_PHOTO_ESTIMATE_IMAGES ? (
          <Pressable
            style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
            onPress={() => void addPhotos()}
            disabled={analyzing}
          >
            <Text style={scStyles.menuButtonText}>
              {photos.length === 0 ? "Add photos" : "Add more photos"}
            </Text>
          </Pressable>
        ) : null}

        <Text style={scStyles.sectionLabel}>Notes for AI (optional)</Text>
        <VoiceTextInput
          style={[input, { minHeight: 88, textAlignVertical: "top" }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. replace deck boards only, customer supplies fixtures, 2-story access…"
          placeholderTextColor={placeholderTextColor(colors)}
          multiline
          editable={!analyzing}
        />

        <Pressable
          style={({ pressed }) => [
            scStyles.primaryCta,
            pressed && { opacity: 0.9 },
            (analyzing || photos.length === 0) && { opacity: 0.55 },
          ]}
          onPress={() => void analyze()}
          disabled={analyzing || photos.length === 0}
        >
          {analyzing ? (
            <ActivityIndicator color={scStyles.primaryCtaText.color} />
          ) : (
            <Text style={scStyles.primaryCtaText}>Analyze photos with AI</Text>
          )}
        </Pressable>

        {result && previewEstimate ? (
          <>
            <Text style={scStyles.sectionLabel}>AI draft preview</Text>
            <View style={scStyles.card}>
              <Text style={scStyles.cardTitle}>{previewEstimate.jobName}</Text>
              <Text style={scStyles.cardMeta}>
                Confidence: {result.confidence} · Draft total {formatBossMoney(previewTotal)}
              </Text>
              {previewEstimate.scope ? (
                <Text style={[scStyles.cardMeta, { marginTop: 8 }]}>{previewEstimate.scope}</Text>
              ) : null}
            </View>

            {previewEstimate.lineItems.length > 0 ? (
              <>
                <Text style={scStyles.sectionLabel}>Line items</Text>
                {previewEstimate.lineItems.map((line) => (
                  <View key={line.id} style={scStyles.card}>
                    <Text style={scStyles.cardTitle}>{line.description}</Text>
                    <Text style={scStyles.cardMeta}>
                      {line.amount ? formatBossMoney(Number(line.amount) || 0) : "—"}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}

            {result.assumptions.length > 0 ? (
              <>
                <Text style={scStyles.sectionLabel}>Assumptions</Text>
                {result.assumptions.map((item) => (
                  <Text key={item} style={scStyles.emptyText}>
                    • {item}
                  </Text>
                ))}
              </>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                scStyles.primaryCta,
                pressed && { opacity: 0.9 },
                saving && { opacity: 0.7 },
              ]}
              onPress={() => void saveAndOpen()}
              disabled={saving}
            >
              <Text style={scStyles.primaryCtaText}>
                {estimateId ? "Apply to estimate & edit" : "Save estimate & edit"}
              </Text>
            </Pressable>
            <Text style={scStyles.emptyText}>
              Review all amounts before sending to a customer. AI is a starting draft only.
            </Text>
          </>
        ) : null}
      </FormScrollView>
    </StickyScreenShell>
  );
}
