import { Link, type Href } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, Text } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { BossManMenuButton } from "@/components/bossMan/BossManMenuButton";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import type { JobFolderCategoryId } from "@/lib/bossMan/jobFolderCategories";
import { getJobFolderCategory, getMenuItemsForCategory } from "@/lib/bossMan/jobFolderCategories";
import {
  getDefaultJobFolderHubEnabledKeys,
  isJobFolderHubItemEnabled,
  loadJobFolderHubEnabledKeys,
} from "@/lib/jobFolderHubPreferences";

type Props = {
  categoryId: JobFolderCategoryId;
  footer?: ReactNode;
};

export function JobFolderSubHubScreen({ categoryId, footer }: Props) {
  const category = getJobFolderCategory(categoryId);
  const { scStyles, styles } = useBossManChrome();
  const [enabledKeys, setEnabledKeys] = useState<string[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void loadJobFolderHubEnabledKeys().then((keys) => {
        if (!cancelled) setEnabledKeys(keys);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const visibleMenuItems = useMemo(() => {
    const keys = enabledKeys ?? getDefaultJobFolderHubEnabledKeys();
    return getMenuItemsForCategory(categoryId).filter((item) =>
      isJobFolderHubItemEnabled(item.key, keys),
    );
  }, [categoryId, enabledKeys]);

  return (
    <ScStickyScroll
      backHref={"/job-folder/boss-man" as Href}
      title={category.label}
      subtitle={category.subtitle}
    >
      {visibleMenuItems.map((item) => (
        <Link key={item.key} href={item.href as Href} asChild>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityHint={item.subtitle}
          >
            <BossManMenuButton item={item} />
          </Pressable>
        </Link>
      ))}

      {visibleMenuItems.length === 0 ? (
        <Text style={scStyles.subtitle}>
          No tiles are enabled for this section. Turn them on in Settings → Job folder menu.
        </Text>
      ) : null}

      {footer}
    </ScStickyScroll>
  );
}
