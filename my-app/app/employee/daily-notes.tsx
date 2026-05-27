import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";

export default function EmployeeDailyNotesScreen() {
  return (
    <ScStickyScroll
      backHref="/employee"
      title="Daily notes"
      subtitle="Phase 2 — structured daily field notes synced to the job folder."
    />
  );
}
