import { useCallback, useEffect, useState } from "react";

import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { getLegalDocument } from "@/lib/legal/legalDocuments";
import type { LegalDocId } from "@/lib/legal/types";
import { loadCompanyProfile } from "@/lib/profileStorage";
import { settingsBackHref, settingsBackLabel, type SettingsRouteId } from "@/lib/settingsGroups";

type Props = {
  docId: LegalDocId;
  settingsRoute: SettingsRouteId;
};

export function LegalReadOnlySettingsScreen({ docId, settingsRoute }: Props) {
  const doc = getLegalDocument(docId);
  const [body, setBody] = useState(() => doc.getText());

  const load = useCallback(async () => {
    const profile =
      docId === "terms" || docId === "servicesDescription" ? await loadCompanyProfile() : null;
    setBody(doc.getText(profile));
  }, [doc, docId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <StickyScrollScreen
      title={doc.title}
      subtitle="Read-only copy for your records."
      backHref={settingsBackHref(settingsRoute)}
      backLabel={settingsBackLabel(settingsRoute)}
      contentContainerStyle={{ flex: 1, minHeight: 400, paddingBottom: 24 }}
    >
      <LegalDocumentScreen
        title={doc.title}
        body={body}
        effectiveVersion={doc.version}
        mode="read"
      />
    </StickyScrollScreen>
  );
}
