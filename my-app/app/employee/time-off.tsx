import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";

export default function EmployeeTimeOffScreen() {
  return (
    <ScStickyScroll
      backHref="/employee"
      title="Time off"
      subtitle="Phase 2 — request PTO and view approval status from your employer."
    />
  );
}
