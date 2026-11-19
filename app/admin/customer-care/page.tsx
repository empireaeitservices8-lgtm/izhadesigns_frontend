
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  HelpCircle,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";
import { KEYS, useStored } from "@/lib/izha-store";
import {
  DEFAULT_CUSTOMER_CARE,
  type CustomerCareSettings,
  type FaqItem,
} from "@/lib/demo-store";
import AdminShell, {
  inputCls,
  outlineBtn,
} from "@/components/admin/AdminShell";
import AlertBox from "@/components/izha/AlertBox";
import { serif, solidBtn } from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";

const CRIMSON = "#B20947";

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="h-full rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 transition-colors hover:border-[#B20947]/40 sm:p-6">
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

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            className={`${serif} m-0 flex items-center gap-2 break-words text-[22px] font-medium leading-tight sm:text-[28px]`}
            style={{ color: CRIMSON }}
          >
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-[13px] text-[#6f6565]">
              {subtitle}
            </p>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

type TabKey = "faqs" | "shipping" | "returns" | "privacy" | "terms";

export default function AdminCustomerCarePage() {
  const [care, setCare] = useStored<CustomerCareSettings>(
    KEYS.customerCare,
    DEFAULT_CUSTOMER_CARE
  );

  const [activeTab, setActiveTab] = useState<TabKey>("faqs");
  const [savedBanner, setSavedBanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync from backend TiDB Cloud on load
  useEffect(() => {
    fetch(apiUrl("/content/customerCare"))
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setCare(data.data);
        }
      })
      .catch(() => {});
  }, [setCare]);

  // Save customer care settings
  const handleSave = async () => {
    setIsSaving(true);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(KEYS.token)
        : null;

    try {
      await fetch(apiUrl("/content/customerCare"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ data: care }),
      });
    } catch {
      // Offline fallback already updated in localStorage
    } finally {
      setIsSaving(false);
    }
  };

  // Reset customer care settings
  const handleReset = () => {
    if (
      confirm(
        "Reset all customer care policies and FAQ data to factory defaults?"
      )
    ) {
      setCare(DEFAULT_CUSTOMER_CARE);
      handleSave();
    }
  };

  /* ----- FAQs Handlers ----- */

  const updateFaqs = (
    patch: Partial<CustomerCareSettings["faqs"]>
  ) => {
    setCare((prev) => ({
      ...prev,
      faqs: { ...prev.faqs, ...patch },
    }));
  };

  const updateFaqItem = (
    idx: number,
    patch: Partial<FaqItem>
  ) => {
    const next = care.faqs.items.map((item, i) =>
      i === idx ? { ...item, ...patch } : item
    );

    updateFaqs({ items: next });
  };

  const addFaqItem = () => {
    updateFaqs({
      items: [
        ...care.faqs.items,
        {
          q: "New Question",
          a: "Provide clear and concise answer here.",
        },
      ],
    });
  };

  const removeFaqItem = (idx: number) => {
    if (care.faqs.items.length <= 1) return;

    updateFaqs({
      items: care.faqs.items.filter((_, i) => i !== idx),
    });
  };

  /* ----- Shipping & Delivery Handlers ----- */

  const updateShipping = (
    patch: Partial<CustomerCareSettings["shipping"]>
  ) => {
    setCare((prev) => ({
      ...prev,
      shipping: { ...prev.shipping, ...patch },
    }));
  };

  /* ----- Returns & Exchange Handlers ----- */

  const updateReturns = (
    patch: Partial<CustomerCareSettings["returns"]>
  ) => {
    setCare((prev) => ({
      ...prev,
      returns: { ...prev.returns, ...patch },
    }));
  };

  /* ----- Privacy Policy Handlers ----- */

  const updatePrivacy = (
    patch: Partial<CustomerCareSettings["privacy"]>
  ) => {
    setCare((prev) => ({
      ...prev,
      privacy: { ...prev.privacy, ...patch },
    }));
  };

  /* ----- Terms & Conditions Handlers ----- */

  const updateTerms = (
    patch: Partial<CustomerCareSettings["terms"]>
  ) => {
    setCare((prev) => ({
      ...prev,
      terms: { ...prev.terms, ...patch },
    }));
  };

  // Customer Care Tabs (Size Guide removed)
  const tabs: {
    key: TabKey;
    label: string;
    icon: any;
    liveHref: string;
  }[] = [
    {
      key: "faqs",
      label: "FAQs",
      icon: HelpCircle,
      liveHref: "/faqs",
    },
    {
      key: "shipping",
      label: "Shipping & Delivery",
      icon: Truck,
      liveHref: "/shipping-policy",
    },
    {
      key: "returns",
      label: "Returns & Exchange",
      icon: RotateCcw,
      liveHref: "/returns",
    },
    {
      key: "privacy",
      label: "Privacy Policy",
      icon: ShieldCheck,
      liveHref: "/privacy-policy",
    },
    {
      key: "terms",
      label: "Terms & Conditions",
      icon: ShieldAlert,
      liveHref: "/terms",
    },
  ];

  return (
    <AdminShell
      title="Customer Care & Policies"
      subtitle="Manage FAQs, shipping guidelines, exchange policies and legal terms."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className={outlineBtn}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset Defaults
          </button>

          {savedBanner && (
            <div className="flex items-center gap-1.5 rounded-lg border border-[#B9D8BF] bg-[#EEF7F0] px-3 py-1.5 text-[12px] font-medium text-[#2B4E31]">
              <Check className="h-3.5 w-3.5 text-[#3A6B42]" />
              Saved Live
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={solidBtn}
          >
            <Check className="mr-1.5 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      }
    >
      {/* Overview Stat Cards */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="FAQ Items"
          value={care.faqs.items.length.toString()}
          note="Questions in FAQ directory"
        />

        <StatCard
          label="Dispatch Time"
          value="24-48h"
          note={care.shipping.dispatchTime.slice(0, 26) + "..."}
        />

        <StatCard
          label="Exchange Window"
          value="7 Days"
          note="Standard exchange limit"
        />
      </div>

      {/* Navigation Tabs */}

      <div className="mt-8 flex flex-wrap gap-2 border-b border-[#E8CFD2] pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-[#B20947] text-white shadow-sm"
                  : "bg-[#FAF1E4] text-[#332B2B] hover:bg-[#EFE2CE]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Saved Notification */}

      {savedBanner && (
        <div className="mt-4">
          <AlertBox
            variant="success"
            title="Customer Care Policies Saved"
            message="Your FAQs and customer care policies have been successfully updated and synced live."
            onClose={() => setSavedBanner(false)}
          />
        </div>
      )}

      {/* TAB CONTENT: 1. FAQs */}

      {activeTab === "faqs" && (
        <div className="mt-6 space-y-6">
          <Panel
            title="FAQs Header"
            subtitle="Configure what customers see on the /faqs page."
            action={
              <Link
                href="/faqs"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#B20947] hover:underline"
              >
                <span>View Live Page</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Page Title
                </label>

                <input
                  type="text"
                  value={care.faqs.title}
                  onChange={(e) =>
                    updateFaqs({ title: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Page Subtitle
                </label>

                <input
                  type="text"
                  value={care.faqs.sub}
                  onChange={(e) =>
                    updateFaqs({ sub: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>
            </div>
          </Panel>

          <Panel
            title="Questions & Answers Directory"
            subtitle="Add, edit or remove questions displayed on the storefront FAQ page."
            action={
              <button
                type="button"
                onClick={addFaqItem}
                className={outlineBtn}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add FAQ
              </button>
            }
          >
            <div className="space-y-4">
              {care.faqs.items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-[#E8CFD2] bg-white p-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFF5F7] text-[11px] font-bold text-[#B20947]">
                      Q{idx + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeFaqItem(idx)}
                      disabled={care.faqs.items.length <= 1}
                      className="text-[#999] hover:text-[#B20947] disabled:opacity-40"
                      title="Delete question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2 space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
                        Question
                      </label>

                      <input
                        type="text"
                        value={item.q}
                        onChange={(e) =>
                          updateFaqItem(idx, { q: e.target.value })
                        }
                        className={`${inputCls} mt-1 font-medium`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
                        Answer
                      </label>

                      <textarea
                        rows={2}
                        value={item.a}
                        onChange={(e) =>
                          updateFaqItem(idx, { a: e.target.value })
                        }
                        className={`${inputCls} mt-1`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* TAB CONTENT: 2. Shipping & Delivery */}

      {activeTab === "shipping" && (
        <div className="mt-6 space-y-6">
          <Panel
            title="Shipping & Delivery Policy"
            subtitle="Configure delivery timelines and information on /shipping-policy."
            action={
              <Link
                href="/shipping-policy"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#B20947] hover:underline"
              >
                <span>View Live Page</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Page Title
                </label>

                <input
                  type="text"
                  value={care.shipping.title}
                  onChange={(e) =>
                    updateShipping({ title: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Page Subtitle
                </label>

                <input
                  type="text"
                  value={care.shipping.sub}
                  onChange={(e) =>
                    updateShipping({ sub: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Dispatch Time Details
                </label>

                <input
                  type="text"
                  value={care.shipping.dispatchTime}
                  onChange={(e) =>
                    updateShipping({ dispatchTime: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Kerala Delivery Timeline
                </label>

                <input
                  type="text"
                  value={care.shipping.keralaDelivery}
                  onChange={(e) =>
                    updateShipping({ keralaDelivery: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Rest of India Delivery Timeline
                </label>

                <input
                  type="text"
                  value={care.shipping.restOfIndiaDelivery}
                  onChange={(e) =>
                    updateShipping({
                      restOfIndiaDelivery: e.target.value,
                    })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Additional Shipping Notes / Tracking Information
                </label>

                <textarea
                  rows={3}
                  value={care.shipping.notes}
                  onChange={(e) =>
                    updateShipping({ notes: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* TAB CONTENT: 3. Returns & Exchange */}

      {activeTab === "returns" && (
        <div className="mt-6 space-y-6">
          <Panel
            title="Returns & Exchange Policy"
            subtitle="Configure return window, exchange rules and contact channels on /returns."
            action={
              <Link
                href="/returns"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#B20947] hover:underline"
              >
                <span>View Live Page</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Page Title
                </label>

                <input
                  type="text"
                  value={care.returns.title}
                  onChange={(e) =>
                    updateReturns({ title: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Page Subtitle
                </label>

                <input
                  type="text"
                  value={care.returns.sub}
                  onChange={(e) =>
                    updateReturns({ sub: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Exchange Policy Details (e.g. 7-Day Exchange)
                </label>

                <textarea
                  rows={2}
                  value={care.returns.exchangePolicy}
                  onChange={(e) =>
                    updateReturns({
                      exchangePolicy: e.target.value,
                    })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                    Support WhatsApp / Phone
                  </label>

                  <input
                    type="text"
                    value={care.returns.supportPhone}
                    onChange={(e) =>
                      updateReturns({ supportPhone: e.target.value })
                    }
                    className={`${inputCls} mt-1`}
                  />
                </div>

                <div>
                  <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                    Support Email
                  </label>

                  <input
                    type="email"
                    value={care.returns.supportEmail}
                    onChange={(e) =>
                      updateReturns({ supportEmail: e.target.value })
                    }
                    className={`${inputCls} mt-1`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Coordination Notes & Instructions
                </label>

                <textarea
                  rows={3}
                  value={care.returns.notes}
                  onChange={(e) =>
                    updateReturns({ notes: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* TAB CONTENT: 4. Privacy Policy */}

      {activeTab === "privacy" && (
        <div className="mt-6 space-y-6">
          <Panel
            title="Privacy Policy Content"
            subtitle="Configure privacy disclosures and contact email on /privacy-policy."
            action={
              <Link
                href="/privacy-policy"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#B20947] hover:underline"
              >
                <span>View Live Page</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Page Title
                </label>

                <input
                  type="text"
                  value={care.privacy.title}
                  onChange={(e) =>
                    updatePrivacy({ title: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Page Subtitle
                </label>

                <input
                  type="text"
                  value={care.privacy.sub}
                  onChange={(e) =>
                    updatePrivacy({ sub: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Privacy Policy Description
                </label>

                <textarea
                  rows={5}
                  value={care.privacy.content}
                  onChange={(e) =>
                    updatePrivacy({ content: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Privacy Inquiries Email
                </label>

                <input
                  type="email"
                  value={care.privacy.contactEmail}
                  onChange={(e) =>
                    updatePrivacy({ contactEmail: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* TAB CONTENT: 5. Terms & Conditions */}

      {activeTab === "terms" && (
        <div className="mt-6 space-y-6">
          <Panel
            title="Terms & Conditions Content"
            subtitle="Configure store terms, intellectual property rules and pricing disclosures on /terms."
            action={
              <Link
                href="/terms"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#B20947] hover:underline"
              >
                <span>View Live Page</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Page Title
                </label>

                <input
                  type="text"
                  value={care.terms.title}
                  onChange={(e) =>
                    updateTerms({ title: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Page Subtitle
                </label>

                <input
                  type="text"
                  value={care.terms.sub}
                  onChange={(e) =>
                    updateTerms({ sub: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Brand, Design & Ownership Terms
                </label>

                <textarea
                  rows={4}
                  value={care.terms.content}
                  onChange={(e) =>
                    updateTerms({ content: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Pricing, Taxes & Coupon Conditions
                </label>

                <textarea
                  rows={3}
                  value={care.terms.pricingTerms}
                  onChange={(e) =>
                    updateTerms({ pricingTerms: e.target.value })
                  }
                  className={`${inputCls} mt-1`}
                />
              </div>
            </div>
          </Panel>
        </div>
      )}
    </AdminShell>
  );
}
