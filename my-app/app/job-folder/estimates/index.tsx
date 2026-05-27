import { Link, useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import {
  bossEstimateSubtitle,
  bossEstimateTitle,
  convertBossEstimateToJob,
  loadBossEstimates,
} from "@/lib/bossMan/bossEstimateStorage";
import {
  getQuickEstimateTemplatesForBusiness,
  quickTemplatesSubtitle,
} from "@/lib/bossMan/estimateQuickTemplates";
import {
  ESTIMATE_TEMPLATE_LABELS,
  type BossEstimate,
  type EstimateTemplateType,
} from "@/lib/bossMan/types";
import { companyProfileFromPartial, loadCompanyProfile } from "@/lib/profileStorage";

function TemplateButton({
  template,
  onPress,
  scStyles,
  styles,
}: {
  template: EstimateTemplateType;
  onPress: () => void;
  scStyles: ReturnType<typeof useBossManChrome>["scStyles"];
  styles: ReturnType<typeof useBossManChrome>["styles"];
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
      onPress={onPress}
    >
      <Text style={scStyles.menuButtonText}>{ESTIMATE_TEMPLATE_LABELS[template]}</Text>
    </Pressable>
  );
}

export default function BossEstimatesHubScreen() {
  const { scStyles, styles } = useBossManChrome();
  const router = useRouter();
  const [estimates, setEstimates] = useState<BossEstimate[]>([]);
  const [businessType, setBusinessType] = useState("");

  const templateGroups = useMemo(
    () => getQuickEstimateTemplatesForBusiness(businessType),
    [businessType],
  );

  const refresh = useCallback(() => {
    void Promise.all([loadBossEstimates(), loadCompanyProfile()]).then(([rows, profile]) => {
      setEstimates(rows);
      setBusinessType(companyProfileFromPartial(profile).businessType);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const openTemplate = (template: EstimateTemplateType) => {
    router.push(`/job-folder/estimates/estimate-edit?template=${template}` as Href);
  };

  return (
    <ScStickyScroll
      backHref="/job-folder/hub/jobs-estimates"
      title="Estimates"
      subtitle="Quick templates for jobs in Job Folder, or use the full Estimates workspace for PDFs and customer accept links."
    >
      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
        onPress={() => router.push("/job-folder/estimates/estimate-edit?template=custom" as Href)}
      >
        <Text style={scStyles.menuButtonText}>Create quick estimate</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }]}
        onPress={() => router.push("/job-folder/estimates/photo-to-estimate" as Href)}
      >
        <Text style={scStyles.primaryCtaText}>Photo to estimate (AI)</Text>
      </Pressable>
      <Text style={scStyles.emptyText}>
        Upload jobsite photos and let AI draft scope, line items, and ballpark amounts — then review and edit.
      </Text>

      <Link href="/estimates" asChild>
        <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}>
          <Text style={scStyles.menuButtonText}>Edit existing (full workspace)</Text>
        </Pressable>
      </Link>

      <Text style={scStyles.sectionLabel}>Quick templates</Text>
      <Text style={scStyles.emptyText}>{quickTemplatesSubtitle(templateGroups)}</Text>

      {templateGroups.primary.map((template) => (
        <TemplateButton
          key={template}
          template={template}
          onPress={() => openTemplate(template)}
          scStyles={scStyles}
          styles={styles}
        />
      ))}

      {templateGroups.more.length > 0 ? (
        <>
          <Text style={[scStyles.sectionLabel, { marginTop: 8 }]}>Other templates</Text>
          {templateGroups.more.map((template) => (
            <TemplateButton
              key={template}
              template={template}
              onPress={() => openTemplate(template)}
              scStyles={scStyles}
              styles={styles}
            />
          ))}
        </>
      ) : null}

      {!templateGroups.hasBusinessType ? (
        <Link href={"/settings/user-info" as Href} asChild>
          <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}>
            <Text style={scStyles.menuButtonText}>Set type of business (User info)</Text>
          </Pressable>
        </Link>
      ) : null}

      <Text style={scStyles.sectionLabel}>Saved estimates</Text>
      {estimates.length === 0 ? (
        <Text style={scStyles.emptyText}>No saved quick estimates yet.</Text>
      ) : (
        estimates.map((row) => (
          <View key={row.id} style={scStyles.card}>
            <Text style={scStyles.cardTitle}>{bossEstimateTitle(row)}</Text>
            <Text style={scStyles.cardMeta}>{bossEstimateSubtitle(row)}</Text>
            <View style={scStyles.actionRow}>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
                onPress={() => router.push(`/job-folder/estimates/estimate-edit?id=${row.id}` as Href)}
              >
                <Text style={scStyles.menuButtonText}>Edit</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
                onPress={() => {
                  void convertBossEstimateToJob(row.id).then((job) => {
                    if (job) {
                      Alert.alert("Job created", "Estimate converted to a new job.", [
                        { text: "OK" },
                        {
                          text: "Open job",
                          onPress: () => router.push(`/job-folder/job/${job.id}` as Href),
                        },
                      ]);
                    }
                  });
                }}
              >
                <Text style={scStyles.menuButtonText}>Convert to job</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
                onPress={() =>
                  router.push(`/job-folder/invoices/invoice-edit?estimateId=${row.id}` as Href)
                }
              >
                <Text style={scStyles.menuButtonText}>Convert to invoice</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScStickyScroll>
  );
}
