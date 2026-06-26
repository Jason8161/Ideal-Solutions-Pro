import { IapComingSoonScreen } from "@/components/settings/IapComingSoonScreen";
import { getIapCategory } from "@/lib/iapSettingsCategories";

export default function IapCrewAiScreen() {
  const category = getIapCategory("crew-ai");
  if (!category) return null;

  return (
    <IapComingSoonScreen
      category={category}
      bullets={[
        "Crew AI is included with Pro Contractor and Boss Man app subscriptions ΓÇö no separate purchase needed.",
        "Legacy store products ideal_employee_pro_monthly and ideal_employee_supervisor_monthly are grandfathered only.",
        "Employee self-serve checkout remains disabled (see docs/EMPLOYEE_AI_UPGRADE.md).",
      ]}
    />
  );
}
