"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageShell,
  PageTitle,
  card,
  outlineBtn,
} from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";
import {
  DEFAULT_PAGE_SHIPPING,
  type EditablePageData,
} from "@/lib/pages-content";

export default function ShippingPolicyPage() {
  const [page, setPage] = useState<EditablePageData>(DEFAULT_PAGE_SHIPPING);

  useEffect(() => {
    fetch(apiUrl("/content/page_shipping"))
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setPage(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const sections = page.sections && page.sections.length > 0 ? page.sections : DEFAULT_PAGE_SHIPPING.sections;
  const whatsappNumber = page.contactInfo?.whatsapp || DEFAULT_PAGE_SHIPPING.contactInfo?.whatsapp || "9995757612";
  const contactEmail = page.contactInfo?.email || DEFAULT_PAGE_SHIPPING.contactInfo?.email || "izhablooms@gmail.com";

  return (
    <PageShell>
      <PageTitle
        title={page.title || DEFAULT_PAGE_SHIPPING.title}
        sub={page.sub || DEFAULT_PAGE_SHIPPING.sub}
      />

      <div
        className={`${card} mx-auto mt-6 sm:mt-10 w-full max-w-3xl space-y-7 sm:space-y-8 p-4 sm:p-6 md:p-8 text-sm sm:text-[14px] leading-7 text-[#6f6565]`}
      >
        {/* Introduction */}
        {page.intro && (
          <p>
            {page.intro}
          </p>
        )}

        {/* Dynamic Sections */}
        {sections.map((section, idx) => (
          <section key={section.id || idx} className="space-y-2">
            <h2 className="text-base sm:text-lg font-semibold text-[#332B2B]">
              {section.title}
            </h2>

            {section.description && (
              <p className="text-sm leading-relaxed text-[#6f6565]">
                {section.description}
              </p>
            )}

            {section.contentType === "bullets" && (
              <ul className="list-disc space-y-2 pl-5">
                {section.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}

            {section.contentType === "numbers" && (
              <ol className="list-decimal space-y-2 pl-5">
                {section.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            )}

            {section.contentType === "paragraph" && (
              <div className="space-y-2">
                {section.items.map((item, i) => (
                  <p key={i}>{item}</p>
                ))}
              </div>
            )}
          </section>
        ))}

        {/* Contact Info Card */}
        <section className="space-y-2 border-t border-[#eee5e0] pt-6">
          <h2 className="text-base sm:text-lg font-semibold text-[#332B2B]">
            Need Help With Shipping?
          </h2>
          <p>
            For shipping-related queries or assistance, feel free to contact us.
          </p>

          <div className="rounded-xl bg-[#faf6f3] p-4 sm:p-5 space-y-2">
            <p className="font-semibold text-[#332B2B]">Izha Blooms Support</p>

            {whatsappNumber && (
              <p>
                <strong className="text-[#332B2B]">WhatsApp: </strong>
                <a
                  href={`https://wa.me/91${whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all underline underline-offset-4 hover:text-[#332B2B]"
                >
                  {whatsappNumber}
                </a>
              </p>
            )}

            {contactEmail && (
              <p>
                <strong className="text-[#332B2B]">Mail: </strong>
                <a
                  href={`mailto:${contactEmail}`}
                  className="break-all underline underline-offset-4 hover:text-[#332B2B]"
                >
                  {contactEmail}
                </a>
              </p>
            )}
          </div>
        </section>

        {/* Closing Message */}
        {page.closingMessage && (
          <div className="border-t border-[#eee5e0] pt-5 text-center">
            <p className="font-medium italic text-[#887878]">
              {page.closingMessage}
            </p>
          </div>
        )}

        {/* Track Order */}
        <div className="flex justify-center pt-1">
          <Link
            href="/track-order"
            className={`${outlineBtn} w-full sm:w-auto text-center`}
          >
            Track Your Order
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
