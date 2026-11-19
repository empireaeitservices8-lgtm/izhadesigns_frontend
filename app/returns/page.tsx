
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PageShell, PageTitle, card, outlineBtn } from "@/components/izha/ui";
import { KEYS, useStored } from "@/lib/izha-store";
import {
  DEFAULT_CUSTOMER_CARE,
  type CustomerCareSettings,
} from "@/lib/demo-store";

export default function ReturnsPage() {
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

  const ret = care.returns || DEFAULT_CUSTOMER_CARE.returns;

  const sections = [
    {
      title: "1. Return Policy",
      content: [
        "We do not accept returns for reasons such as change of mind, colour preference or incorrect size selection.",
        "Returns are accepted only in cases where the product received is damaged, defective or incorrect.",
        "Any such issue must be reported within 24 hours of receiving the order, with clear photographs and an unboxing video showing the issue.",
      ],
    },
    {
      title: "2. Exchange Policy",
      content: [
        "Size exchanges are subject to availability of stock.",
        "Exchange requests must be raised within 48 hours of delivery.",
        "The product must be unused, unwashed, unworn and in its original condition, with all tags and packaging intact.",
        "Products showing signs of use, washing, alteration or damage caused after delivery will not be eligible for exchange.",
      ],
    },
    {
      title: "3. Damaged or Incorrect Products",
      description:
        "If you receive a damaged, defective or incorrect product:",
      content: [
        "Please contact us within 24 hours of delivery.",
        "Share clear photographs and an unboxing video showing the issue.",
        "Once the issue is verified, we will arrange an appropriate resolution, such as a replacement or refund, depending on the situation.",
      ],
    },
    {
      title: "4. Exchange Shipping Charges",
      content: [
        "For eligible size exchanges, return shipping and reshipping charges may be borne by the customer.",
        "If the exchange is due to an error from our side, Izha Blooms will bear the applicable shipping charges.",
      ],
    },
    {
      title: "5. Refund Policy",
      content: [
        "Refunds are applicable only for approved cases, such as unavailable replacement stock or verified product issues.",
        "Approved refunds will be processed to the original payment method.",
        "Please allow 5–7 business days for the refund to reflect, depending on the payment provider.",
      ],
    },
    {
      title: "6. Non-Exchangeable Items",
      description: "The following are not eligible for exchange:",
      content: [
        "Products purchased during special clearance or final sale offers, unless defective or incorrect.",
        "Products that have been worn, washed, altered or damaged after delivery.",
        "Products without original tags or packaging.",
      ],
    },
  ];

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-5 sm:py-10">
        <PageTitle
          title={ret.title || "Return & Exchange Policy"}
          sub={
            "At Izha Blooms, every piece is carefully selected, checked and packed with love. We want you to be happy with your purchase. Please read our Return & Exchange Policy before placing your order."
          }
        />

        <div
          className={`${card} mx-auto mt-6 w-full space-y-7 p-4 sm:mt-10 sm:space-y-9 sm:p-8 md:p-10`}
        >
          {sections.map((section, index) => (
            <section key={index} className="space-y-3">
              <h2 className="text-base font-semibold tracking-wide text-[#332B2B] sm:text-lg">
                {section.title}
              </h2>

              {section.description && (
                <p className="text-sm leading-7 text-[#6f6565] sm:text-[15px]">
                  {section.description}
                </p>
              )}

              <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-[#6f6565] sm:text-[15px]">
                {section.content.map((item, i) => (
                  <li key={i} className="pl-1">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* Contact Section */}
          <section className="space-y-4 border-t border-[#eee4e1] pt-6 sm:pt-8">
            <h2 className="text-base font-semibold tracking-wide text-[#332B2B] sm:text-lg">
              7. How to Request an Exchange
            </h2>

            <p className="text-sm leading-7 text-[#6f6565] sm:text-[15px]">
              For any return or exchange request, please contact us through:
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a
                href="https://wa.me/919995757612"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-3 rounded-xl border border-[#eee4e1] p-4 transition-colors hover:bg-[#faf5f2]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5eae5] text-lg">
                  <span aria-hidden="true">✆</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-[#887878]">
                    WhatsApp
                  </span>
                  <span className="break-words text-sm font-medium text-[#332B2B]">
                    9995757612
                  </span>
                </span>
              </a>

              <a
                href="https://www.instagram.com/izhablooms/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-3 rounded-xl border border-[#eee4e1] p-4 transition-colors hover:bg-[#faf5f2]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5eae5] text-lg">
                  <span aria-hidden="true">◎</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-[#887878]">
                    Instagram
                  </span>
                  <span className="break-words text-sm font-medium text-[#332B2B]">
                    @izhablooms
                  </span>
                </span>
              </a>
            </div>

            <p className="text-sm leading-7 text-[#6f6565]">
              Our team will guide you through the process.
            </p>
          </section>

          {/* Thank You Message */}
          <div className="border-t border-[#eee4e1] pt-6 text-center sm:pt-8">
            <p className="text-sm leading-7 text-[#6f6565] sm:text-[15px]">
              Thank you for choosing Izha Blooms. We truly appreciate your
              love and support!
            </p>
            <p className="mt-3 text-2xl" aria-label="Flower">
              🌸
            </p>
          </div>

          {/* Size Guide */}
          <div className="flex justify-center pt-2">
            <Link
              href="/size-guide"
              className={`${outlineBtn} w-full justify-center text-center sm:w-auto`}
            >
              View Size Guide
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
