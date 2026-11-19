"use client";

import { useEffect } from "react";
import { PageShell, PageTitle, card } from "@/components/izha/ui";
import { KEYS, useStored } from "@/lib/izha-store";
import { DEFAULT_CUSTOMER_CARE, type CustomerCareSettings } from "@/lib/demo-store";

export default function TermsPage() {
  const [care, setCare] = useStored<CustomerCareSettings>(
    KEYS.customerCare,
    DEFAULT_CUSTOMER_CARE
  );

  useEffect(() => {
    fetch("/api/content/customerCare")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setCare(data.data);
        }
      })
      .catch(() => {});
  }, [setCare]);

  const tm = care.terms || DEFAULT_CUSTOMER_CARE.terms;

  return (
    <PageShell>
      <PageTitle
        title={tm.title || "Terms & Conditions"}
        sub={tm.sub || "Store guidelines for shopping with Izha Blooms · Izha Designs, Aluva."}
      />
      <div className={`${card} mx-auto mt-10 max-w-3xl space-y-4 p-6 text-[14px] leading-relaxed text-[#6f6565]`}>
        <p>
          {tm.content || "All product photography, embroidered designs, and branding belong to Izha Designs (Izha Blooms), Aluva, Kerala, India."}
        </p>
        <p>
          {tm.pricingTerms || "Prices are inclusive of applicable taxes and subject to active store offers or coupon terms."}
        </p>
      </div>
    </PageShell>
  );
}
