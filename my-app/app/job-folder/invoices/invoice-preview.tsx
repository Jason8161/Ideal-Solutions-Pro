import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Share, Text, View } from "react-native";
import * as Print from "expo-print";

import { InvoiceCustomerSendButtons } from "@/components/invoices/InvoiceCustomerSendButtons";
import { InvoicePreview } from "@/components/invoices/InvoicePreview";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { StickyPageHeader, StickyScreenShell } from "@/components/serviceCalls/screenChrome";
import {
  buildBossInvoiceShareText,
  generateBossInvoicePdfUri,
  shareBossInvoicePdf,
} from "@/lib/invoices/bossInvoicePdf";
import { peekInvoiceDraft, takeInvoiceDraft } from "@/lib/invoices/invoiceDraftCache";
import { getBossInvoiceById, saveBossInvoice } from "@/lib/invoices/invoiceStorage";
import type { BossInvoice } from "@/lib/invoices/types";

export default function BossInvoicePreviewScreen() {
  const { id, draft } = useLocalSearchParams<{ id?: string; draft?: string }>();
  const router = useRouter();
  const { scStyles, styles } = useBossManChrome();
  const [invoice, setInvoice] = useState<BossInvoice | null>(null);
  const [busy, setBusy] = useState(false);

  const invoiceId = Array.isArray(id) ? id[0] : id;
  const isDraft = draft === "1" || draft === "true";

  useEffect(() => {
    if (isDraft) {
      setInvoice(peekInvoiceDraft() ?? takeInvoiceDraft());
      return;
    }
    if (invoiceId) {
      void getBossInvoiceById(invoiceId).then(setInvoice);
    }
  }, [invoiceId, isDraft]);

  const sharePdf = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      await shareBossInvoicePdf(invoice);
    } catch (e) {
      Alert.alert("PDF", e instanceof Error ? e.message : "Could not share PDF.");
    } finally {
      setBusy(false);
    }
  };

  const printInvoice = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      const uri = await generateBossInvoicePdfUri(invoice);
      await Print.printAsync({ uri });
    } catch (e) {
      Alert.alert("Print", e instanceof Error ? e.message : "Print is not available.");
    } finally {
      setBusy(false);
    }
  };

  const shareText = async () => {
    if (!invoice) return;
    await Share.share({ message: buildBossInvoiceShareText(invoice) });
  };

  if (!invoice) {
    return (
      <StickyScreenShell
        header={<StickyPageHeader title="Preview" fallbackHref={"/job-folder/invoices" as Href} />}
      >
        <Text style={scStyles.emptyText}>Nothing to preview. Open from the invoice editor.</Text>
      </StickyScreenShell>
    );
  }

  return (
    <StickyScreenShell
      header={
        <StickyPageHeader
          title="Preview"
          subtitle={invoice.invoiceNumber}
          fallbackHref={
            (isDraft
              ? "/job-folder/invoices"
              : `/job-folder/invoices/invoice-edit?id=${invoice.id}`) as Href
          }
        />
      }
    >
      <InvoicePreview invoice={invoice} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}>
        <InvoiceCustomerSendButtons
          invoice={invoice}
          ensureSaved={
            isDraft
              ? async () => {
                  const saved = await saveBossInvoice(invoice);
                  setInvoice(saved);
                  return saved;
                }
              : undefined
          }
          onInvoiceUpdated={setInvoice}
        />
        <Pressable
          style={({ pressed }) => [styles.actionBtn, (pressed || busy) && { opacity: 0.9 }]}
          disabled={busy}
          onPress={() => void sharePdf()}
        >
          <Text style={scStyles.menuButtonText}>PDF / share sheet</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={() => void shareText()}
        >
          <Text style={scStyles.menuButtonText}>Share summary (text / email)</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
          disabled={busy}
          onPress={() => void printInvoice()}
        >
          <Text style={scStyles.menuButtonText}>Print</Text>
        </Pressable>
        {isDraft ? (
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
            onPress={() => router.back()}
          >
            <Text style={scStyles.menuButtonText}>Back to editor</Text>
          </Pressable>
        ) : null}
      </View>
    </StickyScreenShell>
  );
}
