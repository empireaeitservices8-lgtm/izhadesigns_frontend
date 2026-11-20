"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageShell,
  PageTitle,
  card,
  outlineBtn,
  serif,
} from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";
import {
  DEFAULT_PAGE_FAQS,
  type EditablePageData,
} from "@/lib/pages-content";

export default function FaqsPage() {
  const [page, setPage] = useState<EditablePageData>(DEFAULT_PAGE_FAQS);

  useEffect(() => {
    fetch(apiUrl("/content/page_faqs"))
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setPage(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const items = page.faqs && page.faqs.length > 0 ? page.faqs : DEFAULT_PAGE_FAQS.faqs!;

  return (
    <PageShell>
      <PageTitle
        title={page.title || DEFAULT_PAGE_FAQS.title}
        sub={page.sub || DEFAULT_PAGE_FAQS.sub}
      />

      <div className="mx-auto mt-6 sm:mt-10 w-full max-w-3xl space-y-3 sm:space-y-4 px-1 sm:px-0">
        {page.intro && (
          <div className={`${card} p-4 sm:p-5 text-sm leading-relaxed text-[#6f6565]`}>
            {page.intro}
          </div>
        )}

        {items.map((item, i) => (
          <div
            key={item.id || i}
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

        {page.sections && page.sections.length > 0 && (
          <div className="space-y-3 pt-2">
            {page.sections.map((section, idx) => (
              <div key={section.id || idx} className={`${card} p-4 sm:p-5 md:p-6 space-y-2`}>
                <h3 className="text-base sm:text-lg font-semibold text-[#332B2B]">
                  {section.title}
                </h3>
                {section.description && (
                  <p className="text-sm text-[#6f6565] leading-relaxed">{section.description}</p>
                )}
                {section.contentType === "bullets" && (
                  <ul className="list-disc space-y-1.5 pl-5 text-sm text-[#6f6565]">
                    {section.items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                )}
                {section.contentType === "numbers" && (
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[#6f6565]">
                    {section.items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ol>
                )}
                {section.contentType === "paragraph" && (
                  <div className="space-y-2 text-sm text-[#6f6565] leading-relaxed">
                    {section.items.map((it, i) => (
                      <p key={i}>{it}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {page.closingMessage && (
          <p className="pt-2 text-center text-xs sm:text-sm italic text-[#887878]">
            {page.closingMessage}
          </p>
        )}

        <div className="pt-4 sm:pt-6 pb-2 text-center">
          <Link href="/shop" className={outlineBtn}>
            Explore All Styles
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
