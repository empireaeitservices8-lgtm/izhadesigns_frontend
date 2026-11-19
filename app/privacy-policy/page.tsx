"use client";

import { useEffect } from "react";
import { PageShell, PageTitle, card } from "@/components/izha/ui";
import { KEYS, useStored } from "@/lib/izha-store";
import { DEFAULT_CUSTOMER_CARE, type CustomerCareSettings } from "@/lib/demo-store";

export default function PrivacyPolicyPage() {
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

  const priv = care.privacy || DEFAULT_CUSTOMER_CARE.privacy;

  return (
    <PageShell>
      <PageTitle
        title={priv.title || "Privacy Policy"}
        sub={priv.sub || "How Izha Blooms protects your personal & delivery details."}
      />
      <div className={`${card} mx-auto mt-10 max-w-3xl space-y-4 p-6 text-[14px] leading-relaxed text-[#6f6565]`}>
        <p>{priv.content || "We respect your privacy and only collect contact and delivery information needed to fulfil orders, share tracking updates, and assist you personally."}</p>
        <p>
          For privacy inquiries, write to{" "}
          <strong className="text-[#332B2B]">{priv.contactEmail || "izhablooms@gmail.com"}</strong>.
        </p>
      </div>
    </PageShell>
  );
}
