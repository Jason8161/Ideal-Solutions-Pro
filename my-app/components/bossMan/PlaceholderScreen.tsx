import { Text } from "react-native";

import { ScStickyScroll, useScStyles } from "@/components/serviceCalls/screenChrome";

type PlaceholderScreenProps = {
  title: string;
  subtitle: string;
  backHref?: string;
};

export function PlaceholderScreen({
  title,
  subtitle,
  backHref = "/job-folder/boss-man",
}: PlaceholderScreenProps) {
  const scStyles = useScStyles();

  return (
    <ScStickyScroll title={title} subtitle={subtitle} backHref={backHref}>
      <Text style={scStyles.emptyText}>
        This section is on the roadmap for Job Folder. Use Current Jobs, Estimates, and Service Calls for day-to-day
        work in the meantime.
      </Text>
    </ScStickyScroll>
  );
}
