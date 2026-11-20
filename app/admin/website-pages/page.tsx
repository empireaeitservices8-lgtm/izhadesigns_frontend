"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import WebsitePagesManager from "@/components/admin/WebsitePagesManager";
import { serif } from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";
import { DEFAULT_PAGES_LIST, type EditablePageData } from "@/lib/pages-content";

const CRIMSON = "#B20947";

function StatCard({
  label,
  value,
  note,
  className = "",
}: {
  label: string;
  value: string;
  note?: string;
  className?: string;
}) {
  return (
    <div
      className={`h-full rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 transition-colors hover:border-[#B20947]/40 sm:p-6 ${className}`}
    >
      <p className="m-0 text-[10px] uppercase tracking-[0.15em] text-black/50 sm:text-[11px] sm:tracking-[0.25em]">
        {label}
      </p>
      <p
        className={`${serif} lining-nums mb-0 mt-3 break-words text-[32px] font-medium leading-none sm:mt-4 sm:text-[46px]`}
        style={{ color: CRIMSON }}
      >
        {value}
      </p>
      {note && (
        <p className="mb-0 mt-2 text-[11px] text-black/45 sm:mt-3 sm:text-[12px]">
          {note}
        </p>
      )}
    </div>
  );
}

export default function AdminWebsitePagesPage() {
  const [pagesCount, setPagesCount] = useState({
    total: 5,
    published: 5,
    draft: 0,
  });

  useEffect(() => {
    fetch(apiUrl("/content/pages/all"))
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && json?.pages) {
          let pub = 0;
          let draft = 0;
          DEFAULT_PAGES_LIST.forEach((p) => {
            const dbEntry = json.pages[`page_${p.slug}`];
            const status = dbEntry?.data?.status || p.status;
            if (status === "Draft") draft++;
            else pub++;
          });
          setPagesCount({ total: 5, published: pub, draft });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <AdminShell
      title="Website Pages Management"
      subtitle="Manage, edit, customize, and publish content for FAQs, Shipping & Delivery, Returns & Exchange, Privacy Policy, and Terms & Conditions."
    >
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 sm:gap-4">
        <StatCard
          label="Total Pages"
          value={String(pagesCount.total)}
          note="Official customer policy & info pages"
        />
        <StatCard
          label="Published Pages"
          value={String(pagesCount.published)}
          note="Live on the storefront"
        />
        <StatCard
          label="Drafts"
          value={String(pagesCount.draft)}
          note="Unpublished or in progress"
        />
      </div>

      {/* Pages Management Section */}
      <div className="mt-4 sm:mt-6">
        <WebsitePagesManager />
      </div>
    </AdminShell>
  );
}
