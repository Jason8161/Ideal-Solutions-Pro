import { Redirect, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { computeInvoiceTotals } from "@/lib/invoices/invoiceCalculations";
import { loadInvoiceCustomization } from "@/lib/invoices/invoiceCustomizationStorage";
import { buildInvoicePayLinkQuery } from "@/lib/invoices/invoicePayLink";
import { getBossInvoiceById } from "@/lib/invoices/invoiceStorage";
import {
  getEnabledCustomerPaymentMethods,
  loadCustomerPaymentMethods,
} from "@/lib/invoices/customerPaymentMethodsStorage";

function strParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}

export default function InvoicePayByIdScreen() {
  const params = useLocalSearchParams<{ invoiceId?: string }>();
  const invoiceId = strParam(params.invoiceId);
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setHref("/pay");
      return;
    }
    void (async () => {
      const invoice = await getBossInvoiceById(invoiceId);
      if (!invoice) {
        setHref(`/pay?invoiceId=${encodeURIComponent(invoiceId)}`);
        return;
      }
      const [methods, custom] = await Promise.all([
        loadCustomerPaymentMethods(),
        loadInvoiceCustomization(),
      ]);
      const enabled = getEnabledCustomerPaymentMethods(methods);
      const query = buildInvoicePayLinkQuery(invoice, {
        companyName: custom.companyName.trim(),
        methods: enabled,
      });
      const totals = computeInvoiceTotals(invoice);
      const search = new URLSearchParams({
        invoiceId: query.invoiceId,
        invoice: query.invoice,
        amount: query.amount,
        amount_cents: query.amountCents,
      });
      if (query.company) search.set("company", query.company);
      if (query.m) search.set("m", query.m);
      if (totals.balanceCents <= 0) search.set("amount", "0.00");
      setHref(`/pay?${search.toString()}`);
    })();
  }, [invoiceId]);

  if (!href) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={href as Href} />;
}
