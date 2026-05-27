import { Redirect, type Href } from "expo-router";

/** Legacy hub route — reports now live on each job detail screen. */
export default function ReportsLegacyRedirect() {
  return <Redirect href={"/job-folder/current-jobs" as Href} />;
}
