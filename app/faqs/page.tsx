
"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  PageShell,
  PageTitle,
  card,
  outlineBtn,
  serif,
} from "@/components/izha/ui";
import { KEYS, useStored } from "@/lib/izha-store";
import {
  DEFAULT_CUSTOMER_CARE,
  type CustomerCareSettings,
} from "@/lib/demo-store";

export default function FaqsPage() {
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

  const fq = care?.faqs || DEFAULT_CUSTOMER_CARE.faqs;
  const items = fq.items && fq.items.length > 0 ? fq.items : DEFAULT_CUSTOMER_CARE.faqs.items;

  return (
    <PageShell>
      <PageTitle
        title={fq.title || "Frequently Asked Questions (FAQs)"}
        sub={fq.sub || "Welcome to Izha Blooms! 🌸 We understand that you may have a few questions before placing your order. Here are some answers to help make your shopping experience smooth and delightful."}
      />

      <div className="mx-auto mt-6 sm:mt-10 w-full max-w-3xl space-y-3 sm:space-y-4 px-1 sm:px-0">
        {items.map((item, i) => (
          <div
            key={i}
            className={`${card} p-4 sm:p-5 md:p-6`}
          >
            <h2
              className={`${serif} text-lg sm:text-xl md:text-[22px] font-medium leading-snug text-[#332B2B]`}
            >
              {item.q}
            </h2>

            <p className="mt-2 text-[13px] sm:text-[14px] leading-relaxed text-[#6f6565] break-words">
              {item.a}
            </p>
          </div>
        ))}

        <div className="pt-4 sm:pt-6 pb-2 text-center">
          <Link href="/shop" className={outlineBtn}>
            Explore All Styles
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
