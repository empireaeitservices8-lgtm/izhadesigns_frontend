"use client";

import { useEffect, useState } from "react";
import { PageShell, PageTitle, card } from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";
import {
  DEFAULT_PAGE_PRIVACY,
  type EditablePageData,
} from "@/lib/pages-content";

export default function PrivacyPolicyPage() {
  const [page, setPage] = useState<EditablePageData>(DEFAULT_PAGE_PRIVACY);

  useEffect(() => {
    fetch(apiUrl("/content/page_privacy"))
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setPage(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const sections = page.sections && page.sections.length > 0 ? page.sections : DEFAULT_PAGE_PRIVACY.sections;
  const contactEmail = page.contactInfo?.email || DEFAULT_PAGE_PRIVACY.contactInfo?.email || "izhablooms@gmail.com";

  return (
    <PageShell>
      <PageTitle
        title={page.title || DEFAULT_PAGE_PRIVACY.title}
        sub={page.sub || DEFAULT_PAGE_PRIVACY.sub}
      />
      <div className={`${card} mx-auto mt-6 sm:mt-10 max-w-3xl space-y-6 p-4 sm:p-6 md:p-8 text-[14px] leading-relaxed text-[#6f6565]`}>
        {page.intro && (
          <p className="leading-7 font-normal text-[#332B2B]">
            {page.intro}
          </p>
        )}

        {sections.map((section, idx) => (
          <section key={section.id || idx} className="space-y-2">
            <h2 className="text-base sm:text-lg font-semibold text-[#332B2B]">
              {section.title}
            </h2>

            {section.description && (
              <p className="leading-relaxed">{section.description}</p>
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

        <div className="border-t border-[#eee5e0] pt-4">
          <p>
            For privacy inquiries, write to{" "}
            <strong className="text-[#332B2B]">{contactEmail}</strong>.
          </p>
          {page.closingMessage && (
            <p className="mt-3 text-xs sm:text-sm italic text-[#887878]">
              {page.closingMessage}
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
