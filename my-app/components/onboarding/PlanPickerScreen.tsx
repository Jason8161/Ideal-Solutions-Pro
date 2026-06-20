import { navigateToAuthScreen } from "@/components/auth/AuthIntentLink";

import { PlanTierCard } from "@/components/subscription/PlanTierCard";

import { getAccentTints, secondaryButtonStyle } from "@/components/themed/screenChrome";

import { useSubscription } from "@/context/SubscriptionContext";

import { useAuth } from "@/lib/auth/AuthContext";

import { AUTH_SIGNUP_HREF } from "@/lib/auth/authPaths";

import { withPromiseTimeout } from "@/lib/async/withPromiseTimeout";

import { useAppTheme } from "@/context/ThemeContext";

import type { ColorScheme } from "@/lib/colorSchemeStorage";

import { refreshHomeProfile } from "@/lib/homeBoot";

import { PURCHASE_ACTION_TIMEOUT_MS, useOfferingsFilteredPlans } from "@/lib/revenuecat";

import { savePlanPickerChoice } from "@/lib/profileStorage";

import {

  PLAN_PICKER_FAIR_USE_NOTE,

  PLAN_PICKER_HEADLINE,

  getSubscriptionPlan,

  plansForPaywall,

  type SubscriptionTierId,

} from "@/lib/subscriptions";

import { startProTrial } from "@/lib/subscriptions/trialStorage";

import { useRouter, type Href } from "expo-router";

import { useEffect, useMemo, useState } from "react";

import {

  ActivityIndicator,

  Platform,

  Pressable,

  ScrollView,

  StyleSheet,

  Text,

  View,

} from "react-native";



const TRIAL_START_TIMEOUT_MS = 10_000;



type PlanPickerScreenProps = {

  onComplete?: () => void;

};



export function PlanPickerScreen({ onComplete }: PlanPickerScreenProps) {

  const router = useRouter();

  const { colors } = useAppTheme();

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { session } = useAuth();

  const {

    loading,

    purchaseTier,

    refresh,

    applyGuestTrialState,

    isTestingUnlocked,

    isBetaFullAccess,

    isConfigured,

    subscriptionsTestingNotice,

  } = useSubscription();

  const [selectedId, setSelectedId] = useState<SubscriptionTierId>("boss_man");

  const [busy, setBusy] = useState(false);

  const [purchaseAccountPrompt, setPurchaseAccountPrompt] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);



  const allPlans = plansForPaywall();

  const filterByOfferings =

    !isTestingUnlocked && !isBetaFullAccess && Platform.OS !== "web";

  const { offeringsLoading, offeringsLoaded, availablePlans, offeringsError } =

    useOfferingsFilteredPlans(allPlans, { enabled: filterByOfferings, isConfigured });

  const plans = filterByOfferings ? availablePlans : allPlans;

  const selectedPlan = getSubscriptionPlan(selectedId);



  useEffect(() => {

    if (!filterByOfferings || !offeringsLoaded || offeringsLoading) return;

    if (!plans.some((plan) => plan.id === selectedId)) {

      const fallback = plans[0]?.id;

      if (fallback) setSelectedId(fallback);

    }

  }, [filterByOfferings, offeringsLoaded, offeringsLoading, plans, selectedId]);



  async function finishWithTier(tier: SubscriptionTierId) {

    await savePlanPickerChoice(tier);

    await refresh();

    await refreshHomeProfile();

    onComplete?.();

  }



  function promptCreateAccountForPurchase(): boolean {

    if (session?.userId) return true;

    setPurchaseAccountPrompt(true);

    return false;

  }



  async function onSubscribe() {

    if (busy || loading) return;

    setActionError(null);

    if (isTestingUnlocked) {

      await finishWithTier("enterprise_boss_man");

      return;

    }

    if (Platform.OS === "web") {

      setActionError("Purchases run in the iOS or Android app.");

      return;

    }

    if (!promptCreateAccountForPurchase()) return;



    setBusy(true);

    try {

      const result = await withPromiseTimeout(

        purchaseTier(selectedId),

        PURCHASE_ACTION_TIMEOUT_MS,

        "Purchase timed out",

      ).catch(() => ({ ok: false as const, message: "Purchase timed out. Try again." }));

      if (result.ok) {

        await finishWithTier(selectedId);

        return;

      }

      if (result.message) setActionError(result.message);

    } finally {

      setBusy(false);

    }

  }



  async function onStartTrial() {

    if (busy) return;

    setActionError(null);

    setBusy(true);

    try {

      const result = await withPromiseTimeout(

        startProTrial({

          interestTier: selectedId,

          userId: session?.userId,

        }),

        TRIAL_START_TIMEOUT_MS,

        "Trial start timed out",

      ).catch(() => ({

        ok: false as const,

        reason: "remote_error" as const,

        message: "Starting your trial took too long. Please try again.",

      }));



      if (!result.ok) {

        setActionError(result.message);

        return;

      }



      applyGuestTrialState(result.state);

      await finishWithTier(selectedId);

    } finally {

      setBusy(false);

    }

  }



  return (

    <ScrollView

      style={styles.scroll}

      contentContainerStyle={styles.content}

      keyboardShouldPersistTaps="handled"

    >

      <Text style={styles.headline}>{PLAN_PICKER_HEADLINE}</Text>

      <Text style={styles.fairUseNote}>{PLAN_PICKER_FAIR_USE_NOTE}</Text>

      {isTestingUnlocked ? (

        <Text style={styles.testingNote}>

          {subscriptionsTestingNotice ?? "Subscriptions disabled for testing"} — full access, no purchase required.

        </Text>

      ) : null}



      {purchaseAccountPrompt && !session ? (

        <View style={styles.promptCard}>

          <Text style={styles.promptTitle}>Create account to subscribe</Text>

          <Text style={styles.fairUseNote}>

            Sign in or create an account before completing your purchase. Your trial progress stays on this device until

            you link an account.

          </Text>

          <Pressable

            onPress={() => navigateToAuthScreen(router, AUTH_SIGNUP_HREF as Href)}

            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}

          >

            <Text style={styles.secondaryText}>Create account</Text>

          </Pressable>

          <Pressable onPress={() => setPurchaseAccountPrompt(false)}>

            <Text style={styles.dismissLink}>Not now</Text>

          </Pressable>

        </View>

      ) : null}



      {filterByOfferings && offeringsLoading ? (

        <View style={styles.loadingRow}>

          <ActivityIndicator color={colors.text} />

          <Text style={styles.fairUseNote}>Loading subscription plans…</Text>

        </View>

      ) : null}



      {filterByOfferings && offeringsLoaded && plans.length === 0 ? (

        <Text style={styles.actionError}>

          {offeringsError ?? "No subscription plans are available right now. Try again later."}

        </Text>

      ) : null}



      <View style={styles.cards}>

        {plans.map((plan) => (

          <PlanTierCard

            key={plan.id}

            plan={plan}

            selected={selectedId === plan.id}

            onPress={() => setSelectedId(plan.id)}

            colors={colors}

          />

        ))}

      </View>



      {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}



      <Pressable

        onPress={() => void onSubscribe()}

        disabled={busy || loading || (filterByOfferings && offeringsLoading) || (filterByOfferings && offeringsLoaded && plans.length === 0)}

        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}

      >

        {busy || loading ? (

          <ActivityIndicator color={colors.text} />

        ) : (

          <Text style={styles.primaryText}>

            {isTestingUnlocked

              ? "Continue with full access (testing)"

              : `Subscribe — ${selectedPlan.priceLabel}`}

          </Text>

        )}

      </Pressable>



      {!isTestingUnlocked ? (

        <Pressable

          onPress={() => void onStartTrial()}

          disabled={busy || (filterByOfferings && offeringsLoading) || (filterByOfferings && offeringsLoaded && plans.length === 0)}

          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}

        >

          <Text style={styles.secondaryText}>Start 7-day trial on {selectedPlan.name}</Text>

        </Pressable>

      ) : null}

    </ScrollView>

  );

}



function makeStyles(colors: ColorScheme) {

  const tints = getAccentTints(colors);

  const secondaryBtn = secondaryButtonStyle(colors, tints);



  return StyleSheet.create({

    scroll: { flex: 1, backgroundColor: "transparent" },

    content: { padding: 20, paddingBottom: 40, gap: 14 },

    headline: { fontSize: 20, lineHeight: 28, fontWeight: "800", color: colors.text },

    fairUseNote: { fontSize: 13, lineHeight: 19, color: colors.text, opacity: 0.82 },

    testingNote: { fontSize: 13, lineHeight: 19, color: colors.text, opacity: 0.9, fontWeight: "600" },

    promptCard: { gap: 10 },

    promptTitle: { fontSize: 16, fontWeight: "800", color: colors.text },

    cards: { gap: 16, marginTop: 4 },

    loadingRow: {

      flexDirection: "row",

      alignItems: "center",

      gap: 10,

      marginTop: 4,

    },

    actionError: {

      fontSize: 14,

      lineHeight: 20,

      color: colors.text,

      opacity: 0.9,

      textAlign: "center",

    },

    primary: { ...secondaryBtn, paddingVertical: 16, borderRadius: 14, marginTop: 8 },

    secondary: { ...secondaryBtn, paddingVertical: 12, borderRadius: 14 },

    pressed: { opacity: 0.88 },

    primaryText: { color: colors.text, fontSize: 16, fontWeight: "800" },

    secondaryText: { color: colors.text, fontSize: 15, fontWeight: "700", textAlign: "center" },

    dismissLink: {

      textAlign: "center",

      fontSize: 14,

      fontWeight: "600",

      color: colors.text,

      opacity: 0.8,

    },

  });

}

