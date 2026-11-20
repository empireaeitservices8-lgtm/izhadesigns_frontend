"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, PageTitle, card, outlineBtn } from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";
import {
  DEFAULT_PAGE_RETURNS,
  type EditablePageData,
} from "@/lib/pages-content";

export default function ReturnsPage() {
  const [page, setPage] = useState<EditablePageData>(DEFAULT_PAGE_RETURNS);

  useEffect(() => {
    fetch(apiUrl("/content/page_returns"))
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setPage(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const sections = page.sections && page.sections.length > 0 ? page.sections : DEFAULT_PAGE_RETURNS.sections;
  const whatsapp = page.contactInfo?.whatsapp || DEFAULT_PAGE_RETURNS.contactInfo?.whatsapp || "9995757612";
  const instagram = page.contactInfo?.instagram || DEFAULT_PAGE_RETURNS.contactInfo?.instagram || "@izhablooms";

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-5 sm:py-10">
        <PageTitle
          title={page.title || DEFAULT_PAGE_RETURNS.title}
          sub={page.sub || DEFAULT_PAGE_RETURNS.sub}
        />

        <div
          className={`${card} mx-auto mt-6 w-full space-y-7 p-4 sm:mt-10 sm:space-y-9 sm:p-8 md:p-10`}
        >
          {page.intro && (
            <p className="text-sm leading-7 text-[#6f6565] sm:text-[15px]">
              {page.intro}
            </p>
          )}

          {/* Dynamic Sections */}
          {sections.map((section, index) => (
            <section key={section.id || index} className="space-y-3">
              <h2 className="text-base font-semibold tracking-wide text-[#332B2B] sm:text-lg">
                {section.title}
              </h2>

              {section.description && (
                <p className="text-sm leading-7 text-[#6f6565] sm:text-[15px]">
                  {section.description}
                </p>
              )}

              {section.contentType === "bullets" && (
                <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-[#6f6565] sm:text-[15px]">
                  {section.items.map((item, i) => (
                    <li key={i} className="pl-1">
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {section.contentType === "numbers" && (
                <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-[#6f6565] sm:text-[15px]">
                  {section.items.map((item, i) => (
                    <li key={i} className="pl-1">
                      {item}
                    </li>
                  ))}
                </ol>
              )}

              {section.contentType === "paragraph" && (
                <div className="space-y-2 text-sm leading-7 text-[#6f6565] sm:text-[15px]">
                  {section.items.map((item, i) => (
                    <p key={i}>{item}</p>
                  ))}
                </div>
              )}
            </section>
          ))}

          {/* Contact Section */}
          <section className="space-y-4 border-t border-[#eee4e1] pt-6 sm:pt-8">
            <h2 className="text-base font-semibold tracking-wide text-[#332B2B] sm:text-lg">
              Contact Us for Return & Exchange
            </h2>

            <p className="text-sm leading-7 text-[#6f6565] sm:text-[15px]">
              For any return or exchange request, please reach out to us:
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {whatsapp && (
                <a
                  href={`https://wa.me/91${whatsapp.replace(/\D/g, "")}`}
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
                      {whatsapp}
                    </span>
                  </span>
                </a>
              )}

              {instagram && (
                <a
                  href={`https://www.instagram.com/${instagram.replace("@", "")}/`}
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
                      {instagram}
                    </span>
                  </span>
                </a>
              )}
            </div>

            <p className="text-sm leading-7 text-[#6f6565]">
              Our team will guide you through the process.
            </p>
          </section>

          {/* Thank You Message */}
          {page.closingMessage && (
            <div className="border-t border-[#eee4e1] pt-6 text-center sm:pt-8">
              <p className="text-sm leading-7 text-[#6f6565] sm:text-[15px]">
                {page.closingMessage}
              </p>
              <p className="mt-3 text-2xl" aria-label="Flower">
                🌸
              </p>
            </div>
          )}

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
