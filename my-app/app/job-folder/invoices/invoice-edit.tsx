import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";

import { InvoiceEditorForm } from "@/components/invoices/InvoiceEditorForm";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { StickyPageHeader, StickyScreenShell } from "@/components/serviceCalls/screenChrome";
import { attachInvoiceToPaymentDraw, getJobPaymentDraws } from "@/lib/bossMan/paymentDraws";
import { getBossJobById } from "@/lib/bossMan/jobStorage";
import {
  emptyBossInvoice,
  getBossInvoiceById,
  peekNextBossInvoiceNumber,
  prefillInvoiceFromJob,
  prefillInvoiceFromPaymentDraw,
} from "@/lib/invoices/invoiceStorage";
import { loadInvoiceCustomization } from "@/lib/invoices/invoiceCustomizationStorage";
import { resolveInvoicePaymentTerms, type BossInvoice } from "@/lib/invoices/types";

export default function BossInvoiceEditScreen() {
  const { id, jobId, estimateId, drawId } = useLocalSearchParams<{
    id?: string;
    jobId?: string;
    estimateId?: string;
    drawId?: string;
  }>();
  const router = useRouter();
  const { scStyles } = useBossManChrome();
  const [invoice, setInvoice] = useState<BossInvoice | null>(null);

  const invoiceId = Array.isArray(id) ? id[0] : id;
  const linkedJobId = Array.isArray(jobId) ? jobId[0] : jobId;
  const linkedEstimateId = Array.isArray(estimateId) ? estimateId[0] : estimateId;
  const linkedDrawId = Array.isArray(drawId) ? drawId[0] : drawId;

  useEffect(() => {
    void (async () => {
      if (invoiceId) {
        const existing = await getBossInvoiceById(invoiceId);
        if (existing) {
          setInvoice(existing);
          return;
        }
      }
      if (linkedEstimateId) {
        const { getBossEstimateById } = await import("@/lib/bossMan/bossEstimateStorage");
        const { bossInvoiceFromBossEstimate, saveBossInvoice } = await import(
          "@/lib/invoices/invoiceStorage"
        );
        const estimate = await getBossEstimateById(linkedEstimateId);
        if (estimate) {
          const inv = bossInvoiceFromBossEstimate(estimate, linkedJobId);
          inv.invoiceNumber = await peekNextBossInvoiceNumber();
          const custom = await loadInvoiceCustomization();
          inv.terms = resolveInvoicePaymentTerms(custom.defaultPaymentTerms);
          inv.notes = custom.defaultNotes || inv.notes;
          setInvoice(inv);
          return;
        }
      }
      if (linkedJobId) {
        if (linkedDrawId) {
          const job = await getBossJobById(linkedJobId);
          const draw = job
            ? getJobPaymentDraws(job).find((d) => d.id === linkedDrawId)
            : undefined;
          if (draw) {
            setInvoice(await prefillInvoiceFromPaymentDraw(linkedJobId, draw));
            return;
          }
        }
        setInvoice(await prefillInvoiceFromJob(linkedJobId));
        return;
      }
      const blank = emptyBossInvoice();
      const custom = await loadInvoiceCustomization();
      blank.terms = resolveInvoicePaymentTerms(custom.defaultPaymentTerms);
      blank.notes = custom.defaultNotes;
      blank.taxPercent = custom.defaultTaxPercent;
      blank.includeTax = Boolean(custom.defaultTaxPercent.trim());
      blank.invoiceNumber = await peekNextBossInvoiceNumber();
      setInvoice(blank);
    })();
  }, [invoiceId, linkedJobId, linkedEstimateId, linkedDrawId]);

  if (!invoice) {
    return (
      <StickyScreenShell
        header={<StickyPageHeader title="Invoice" fallbackHref={"/job-folder/invoices" as Href} />}
      >
        <Text style={scStyles.emptyText}>Loading…</Text>
      </StickyScreenShell>
    );
  }

  return (
    <StickyScreenShell
      header={
        <StickyPageHeader
          title={invoice.invoiceNumber || "New invoice"}
          subtitle={invoice.customerName || invoice.jobName || "Edit invoice"}
          fallbackHref={
            (invoice.jobId
              ? `/job-folder/invoices?jobId=${invoice.jobId}`
              : "/job-folder/invoices") as Href
          }
        />
      }
    >
      <InvoiceEditorForm
        initial={invoice}
        onSaved={(saved) => {
          setInvoice(saved);
          if (linkedJobId && linkedDrawId) {
            void attachInvoiceToPaymentDraw(linkedJobId, linkedDrawId, saved.id);
          }
          if (!invoiceId) {
            router.replace(`/job-folder/invoices/invoice-edit?id=${saved.id}` as Href);
          }
        }}
      />
    </StickyScreenShell>
  );
}
