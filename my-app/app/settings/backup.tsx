import { Redirect, type Href } from "expo-router";

/** Legacy route — settings hub now links to backup-restore. */
export default function BackupSettingsRedirect() {
  return <Redirect href={"/settings/backup-restore" as Href} />;
}
