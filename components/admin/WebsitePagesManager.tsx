"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  HelpCircle,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { apiUrl } from "@/lib/api-config";
import { inputCls, outlineBtn } from "@/components/admin/AdminShell";
import AlertBox from "@/components/izha/AlertBox";
import { card, serif, solidBtn } from "@/components/izha/ui";
import {
  DEFAULT_PAGES_LIST,
  DEFAULT_PAGES_MAP,
  type ContentBlockType,
  type EditablePageData,
  type FaqItem,
  type PageSection,
} from "@/lib/pages-content";

const CRIMSON = "#B20947";

export default function WebsitePagesManager() {
  const [pages, setPages] = useState<EditablePageData[]>(DEFAULT_PAGES_LIST);
  const [loading, setLoading] = useState(false);
  const [activeEditingSlug, setActiveEditingSlug] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditablePageData | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all pages from backend on mount
  const loadPages = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/content/pages/all"));
      const json = await res.json();
      if (json?.success && json?.pages) {
        setPages((prev) =>
          prev.map((p) => {
            const dbEntry = json.pages[`page_${p.slug}`];
            if (dbEntry && dbEntry.data) {
              return {
                ...p,
                ...dbEntry.data,
                lastUpdated: dbEntry.updatedAt || p.lastUpdated,
              };
            }
            return p;
          })
        );
      }
    } catch (_) {
      // Fallback gracefully to default definitions
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  // Open editor for a page
  const handleOpenEdit = (page: EditablePageData) => {
    setActiveEditingSlug(page.slug);
    // Deep clone to prevent direct state mutation before saving
    setEditingData(JSON.parse(JSON.stringify(page)));
    setActiveTab("edit");
    setSaveStatus(null);
  };

  // Close editor
  const handleCloseEdit = () => {
    setActiveEditingSlug(null);
    setEditingData(null);
    setSaveStatus(null);
  };

  // Save handler (draft or published)
  const handleSave = async (statusToSet: "Published" | "Draft") => {
    if (!editingData) return;

    setIsSaving(true);
    setSaveStatus(null);

    const updated: EditablePageData = {
      ...editingData,
      status: statusToSet,
      lastUpdated: new Date().toISOString(),
    };

    try {
      const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
      const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem("izha_token") : null);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl(`/content/page_${updated.slug}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({ data: updated }),
      });

      const json = await res.json();
      if (json?.success) {
        setEditingData(updated);
        // Update local pages state
        setPages((prev) =>
          prev.map((p) => (p.slug === updated.slug ? updated : p))
        );
        setSaveStatus({
          type: "success",
          message: `${updated.name} successfully saved as ${statusToSet}!`,
        });
      } else {
        throw new Error(json?.message || "Failed to save content");
      }
    } catch (err: any) {
      setSaveStatus({
        type: "error",
        message: err?.message || "Error saving page content. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /* ---------- Section Manipulation Helpers ---------- */
  const addSection = () => {
    if (!editingData) return;
    const newSec: PageSection = {
      id: `sec-${Date.now()}`,
      title: `New Section ${editingData.sections.length + 1}`,
      contentType: "paragraph",
      items: ["Enter paragraph content here..."],
    };
    setEditingData({
      ...editingData,
      sections: [...editingData.sections, newSec],
    });
  };

  const updateSection = (idx: number, patch: Partial<PageSection>) => {
    if (!editingData) return;
    const next = editingData.sections.map((s, i) =>
      i === idx ? { ...s, ...patch } : s
    );
    setEditingData({ ...editingData, sections: next });
  };

  const removeSection = (idx: number) => {
    if (!editingData) return;
    const next = editingData.sections.filter((_, i) => i !== idx);
    setEditingData({ ...editingData, sections: next });
  };

  const moveSection = (idx: number, direction: "up" | "down") => {
    if (!editingData) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= editingData.sections.length) return;
    const next = [...editingData.sections];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    setEditingData({ ...editingData, sections: next });
  };

  const addSectionItem = (secIdx: number) => {
    if (!editingData) return;
    const sec = editingData.sections[secIdx];
    const newItems = [...sec.items, "New bullet point / paragraph item"];
    updateSection(secIdx, { items: newItems });
  };

  const updateSectionItem = (secIdx: number, itemIdx: number, val: string) => {
    if (!editingData) return;
    const sec = editingData.sections[secIdx];
    const newItems = sec.items.map((it, i) => (i === itemIdx ? val : it));
    updateSection(secIdx, { items: newItems });
  };

  const removeSectionItem = (secIdx: number, itemIdx: number) => {
    if (!editingData) return;
    const sec = editingData.sections[secIdx];
    if (sec.items.length <= 1) return;
    const newItems = sec.items.filter((_, i) => i !== itemIdx);
    updateSection(secIdx, { items: newItems });
  };

  /* ---------- FAQ Item Helpers ---------- */
  const addFaq = () => {
    if (!editingData) return;
    const newFaq: FaqItem = {
      id: `faq-${Date.now()}`,
      q: "New Frequently Asked Question",
      a: "Detailed answer explaining store policy or guidelines.",
    };
    const faqs = editingData.faqs || [];
    setEditingData({ ...editingData, faqs: [...faqs, newFaq] });
  };

  const updateFaq = (idx: number, patch: Partial<FaqItem>) => {
    if (!editingData || !editingData.faqs) return;
    const next = editingData.faqs.map((f, i) =>
      i === idx ? { ...f, ...patch } : f
    );
    setEditingData({ ...editingData, faqs: next });
  };

  const removeFaq = (idx: number) => {
    if (!editingData || !editingData.faqs) return;
    const next = editingData.faqs.filter((_, i) => i !== idx);
    setEditingData({ ...editingData, faqs: next });
  };

  const moveFaq = (idx: number, direction: "up" | "down") => {
    if (!editingData || !editingData.faqs) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= editingData.faqs.length) return;
    const next = [...editingData.faqs];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    setEditingData({ ...editingData, faqs: next });
  };

  return (
    <section className="min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            className={`${serif} m-0 flex items-center gap-2 break-words text-[22px] font-medium leading-tight sm:text-[28px]`}
            style={{ color: CRIMSON }}
          >
            <Globe className="h-6 w-6 text-[#B20947]" /> Website Pages Management
          </h2>
          <p className="mb-0 mt-1 text-[12px] text-black/55 sm:text-[13px]">
            Manage, customize, and publish content for all 5 official customer policy and information pages.
          </p>
        </div>
        <button
          type="button"
          onClick={loadPages}
          disabled={loading}
          className={`${outlineBtn} gap-1.5 text-xs`}
          title="Reload pages from database"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Pages Table / Grid */}
      <div className="mt-5 overflow-hidden rounded-xl border border-[#E8CFD2] bg-white/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E8CFD2] bg-[#FAF1E4]/80 text-[11px] font-semibold uppercase tracking-wider text-black/60">
                <th className="px-4 py-3 sm:px-6">Page Name & Route</th>
                <th className="px-4 py-3 sm:px-6">Status</th>
                <th className="px-4 py-3 sm:px-6">Sections / Content</th>
                <th className="px-4 py-3 sm:px-6">Last Updated</th>
                <th className="px-4 py-3 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8CFD2]/60 text-[13px]">
              {pages.map((page) => {
                const isPublished = page.status === "Published";
                const itemCount =
                  page.slug === "faqs"
                    ? `${(page.faqs || []).length} FAQs`
                    : `${page.sections.length} Sections`;

                return (
                  <tr
                    key={page.slug}
                    className="transition-colors hover:bg-[#FAF1E4]/30"
                  >
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="font-semibold text-[#332B2B]">
                        {page.name}
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5 text-xs text-[#8F3057]">
                        <code>{page.urlPath}</code>
                        <Link
                          href={page.urlPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          title="Open live public page"
                        >
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          isPublished
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                            : "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isPublished ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        {page.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-black/60 sm:px-6">
                      {itemCount}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-black/50 sm:px-6">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        {page.lastUpdated
                          ? new Date(page.lastUpdated).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Default System Content"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right sm:px-6">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(page)}
                        className={`${outlineBtn} !py-1.5 text-xs font-medium gap-1.5`}
                      >
                        <Edit3 size={13} /> Edit Page
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Page Content Management Modal */}
      {activeEditingSlug && editingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs">
          <div className="flex h-full max-h-[92vh] w-full max-w-4xl flex-col rounded-xl border border-[#E8CFD2] bg-[#FAF1E4] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E8CFD2] bg-[#F5E8D6] px-4 py-3 sm:px-6">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B20947]">
                  Website Pages Editor
                </span>
                <h3 className={`${serif} text-lg font-medium text-[#332B2B] sm:text-xl`}>
                  Editing: {editingData.name} ({editingData.urlPath})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Editor / Preview Tabs */}
                <div className="flex rounded-lg border border-[#D8BFA8] bg-[#FAF3E8] p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                      activeTab === "edit"
                        ? "bg-[#B20947] text-white shadow-xs"
                        : "text-[#6f6565] hover:text-[#332B2B]"
                    }`}
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                      activeTab === "preview"
                        ? "bg-[#B20947] text-white shadow-xs"
                        : "text-[#6f6565] hover:text-[#332B2B]"
                    }`}
                  >
                    <Eye size={12} /> Live Preview
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  aria-label="Close Editor"
                  className="rounded-lg p-1.5 text-black/50 hover:bg-black/5 hover:text-black"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Save Status Notification Banner */}
            {saveStatus && (
              <div className="px-4 pt-3 sm:px-6">
                <AlertBox
                  variant={saveStatus.type}
                  message={saveStatus.message}
                  onClose={() => setSaveStatus(null)}
                />
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {activeTab === "edit" ? (
                <>
                  {/* Status & General Metadata */}
                  <div className="rounded-lg border border-[#E8CFD2] bg-white/70 p-4 space-y-4 shadow-xs">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="font-semibold text-sm text-[#332B2B]">
                        General Page Information
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-black/60">Status:</span>
                        <select
                          value={editingData.status}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              status: e.target.value as "Published" | "Draft",
                            })
                          }
                          aria-label="Page Publishing Status"
                          className="rounded-md border border-[#D8BFA8] bg-[#FAF3E8] px-2.5 py-1 text-xs font-medium text-[#332B2B]"
                        >
                          <option value="Published">Published (Live on Website)</option>
                          <option value="Draft">Draft (Offline)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="block text-[11px] font-medium text-black/60 mb-1">
                          Page Main Title (Heading 1)
                        </span>
                        <input
                          className={inputCls}
                          value={editingData.title}
                          onChange={(e) =>
                            setEditingData({ ...editingData, title: e.target.value })
                          }
                          placeholder="e.g. Frequently Asked Questions"
                        />
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="block text-[11px] font-medium text-black/60 mb-1">
                          Page Subtitle / Top Header Description
                        </span>
                        <textarea
                          rows={2}
                          className={inputCls}
                          value={editingData.sub}
                          onChange={(e) =>
                            setEditingData({ ...editingData, sub: e.target.value })
                          }
                          placeholder="Short introductory note under the page title"
                        />
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="block text-[11px] font-medium text-black/60 mb-1">
                          Introduction Paragraph (Optional)
                        </span>
                        <textarea
                          rows={2}
                          className={inputCls}
                          value={editingData.intro || ""}
                          onChange={(e) =>
                            setEditingData({ ...editingData, intro: e.target.value })
                          }
                          placeholder="Introductory paragraph above sections..."
                        />
                      </label>
                    </div>
                  </div>

                  {/* FAQ Items Section (Specific to FAQs page) */}
                  {editingData.slug === "faqs" && (
                    <div className="rounded-lg border border-[#E8CFD2] bg-white/70 p-4 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-sm text-[#332B2B]">
                            FAQ Questions & Answers (Q&A List)
                          </h4>
                          <p className="text-xs text-black/55">
                            Add, edit, reorder, or delete questions answered on the FAQs page.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addFaq}
                          className={`${outlineBtn} !py-1.5 text-xs gap-1`}
                        >
                          <Plus size={13} /> Add FAQ
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(editingData.faqs || []).map((faq, fIdx) => (
                          <div
                            key={faq.id || fIdx}
                            className="rounded-lg border border-[#E8CFD2] bg-[#FAF1E4]/50 p-3 sm:p-4 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B20947]">
                                Question #{fIdx + 1}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveFaq(fIdx, "up")}
                                  disabled={fIdx === 0}
                                  aria-label="Move FAQ up"
                                  className="rounded p-1 text-black/50 hover:bg-black/5 disabled:opacity-30"
                                >
                                  <ArrowUp size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveFaq(fIdx, "down")}
                                  disabled={fIdx === (editingData.faqs || []).length - 1}
                                  aria-label="Move FAQ down"
                                  className="rounded p-1 text-black/50 hover:bg-black/5 disabled:opacity-30"
                                >
                                  <ArrowDown size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeFaq(fIdx)}
                                  aria-label="Delete FAQ"
                                  className="rounded p-1 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            <label className="block">
                              <span className="block text-[11px] font-medium text-black/60 mb-0.5">
                                Question Heading
                              </span>
                              <input
                                className={`${inputCls} !py-1.5 text-xs sm:text-sm font-medium`}
                                value={faq.q}
                                onChange={(e) => updateFaq(fIdx, { q: e.target.value })}
                                placeholder="e.g. Where does Izha Blooms deliver?"
                              />
                            </label>

                            <label className="block">
                              <span className="block text-[11px] font-medium text-black/60 mb-0.5">
                                Answer Explanation
                              </span>
                              <textarea
                                rows={2}
                                className={`${inputCls} !py-1.5 text-xs sm:text-sm`}
                                value={faq.a}
                                onChange={(e) => updateFaq(fIdx, { a: e.target.value })}
                                placeholder="Write the complete answer..."
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Content Sections */}
                  <div className="rounded-lg border border-[#E8CFD2] bg-white/70 p-4 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-sm text-[#332B2B]">
                          Content Sections
                        </h4>
                        <p className="text-xs text-black/55">
                          Create policy clauses, delivery timelines, terms sections with headings, paragraphs, or lists.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addSection}
                        className={`${outlineBtn} !py-1.5 text-xs gap-1`}
                      >
                        <Plus size={13} /> Add Content Section
                      </button>
                    </div>

                    <div className="space-y-4">
                      {editingData.sections.map((section, sIdx) => (
                        <div
                          key={section.id || sIdx}
                          className="rounded-lg border border-[#E8CFD2] bg-[#FAF1E4]/50 p-4 space-y-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#E8CFD2]/60 pb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B20947]">
                              Section #{sIdx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              {/* Content Type Selector */}
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-black/60">Type:</span>
                                <select
                                  value={section.contentType}
                                  onChange={(e) =>
                                    updateSection(sIdx, {
                                      contentType: e.target.value as ContentBlockType,
                                    })
                                  }
                                  aria-label="Section format type"
                                  className="rounded border border-[#D8BFA8] bg-[#FAF3E8] px-2 py-0.5 text-xs text-[#332B2B]"
                                >
                                  <option value="paragraph">Paragraphs (Text Block)</option>
                                  <option value="bullets">Bullet Points (List)</option>
                                  <option value="numbers">Numbered List (Ordered)</option>
                                </select>
                              </div>

                              <button
                                type="button"
                                onClick={() => moveSection(sIdx, "up")}
                                disabled={sIdx === 0}
                                aria-label="Move section up"
                                className="rounded p-1 text-black/50 hover:bg-black/5 disabled:opacity-30"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSection(sIdx, "down")}
                                disabled={sIdx === editingData.sections.length - 1}
                                aria-label="Move section down"
                                className="rounded p-1 text-black/50 hover:bg-black/5 disabled:opacity-30"
                              >
                                <ArrowDown size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSection(sIdx)}
                                aria-label="Delete section"
                                className="rounded p-1 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <label className="block">
                            <span className="block text-[11px] font-medium text-black/60 mb-0.5">
                              Section Heading / Title
                            </span>
                            <input
                              className={`${inputCls} !py-1.5 text-xs sm:text-sm font-semibold`}
                              value={section.title}
                              onChange={(e) =>
                                updateSection(sIdx, { title: e.target.value })
                              }
                              placeholder="e.g. 1. Order Processing"
                            />
                          </label>

                          <label className="block">
                            <span className="block text-[11px] font-medium text-black/60 mb-0.5">
                              Introductory Description (Optional)
                            </span>
                            <textarea
                              rows={1}
                              className={`${inputCls} !py-1.5 text-xs sm:text-sm`}
                              value={section.description || ""}
                              onChange={(e) =>
                                updateSection(sIdx, { description: e.target.value })
                              }
                              placeholder="Optional brief description preceding the items..."
                            />
                          </label>

                          {/* Section Items Manager */}
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-medium text-black/60">
                                {section.contentType === "paragraph"
                                  ? "Paragraphs:"
                                  : section.contentType === "bullets"
                                  ? "Bullet Items:"
                                  : "Numbered Items:"}
                              </span>
                              <button
                                type="button"
                                onClick={() => addSectionItem(sIdx)}
                                className="text-[11px] font-semibold text-[#B20947] hover:underline"
                              >
                                + Add {section.contentType === "paragraph" ? "Paragraph" : "Item"}
                              </button>
                            </div>

                            <div className="space-y-2">
                              {section.items.map((item, itIdx) => (
                                <div key={itIdx} className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-black/40 w-4 shrink-0 text-center">
                                    {section.contentType === "numbers" ? `${itIdx + 1}.` : "•"}
                                  </span>
                                  {section.contentType === "paragraph" ? (
                                    <textarea
                                      rows={2}
                                      className={`${inputCls} !py-1.5 text-xs flex-1`}
                                      value={item}
                                      onChange={(e) =>
                                        updateSectionItem(sIdx, itIdx, e.target.value)
                                      }
                                    />
                                  ) : (
                                    <input
                                      className={`${inputCls} !py-1.5 text-xs flex-1`}
                                      value={item}
                                      onChange={(e) =>
                                        updateSectionItem(sIdx, itIdx, e.target.value)
                                      }
                                    />
                                  )}
                                  {section.items.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeSectionItem(sIdx, itIdx)}
                                      aria-label={`Remove item ${itIdx + 1}`}
                                      className="rounded p-1 text-red-500 hover:bg-red-50 shrink-0"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact Info & Footer Settings */}
                  <div className="rounded-lg border border-[#E8CFD2] bg-white/70 p-4 space-y-4 shadow-xs">
                    <h4 className="font-semibold text-sm text-[#332B2B]">
                      Support Contact & Footer Notes
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="block text-[11px] font-medium text-black/60 mb-1">
                          WhatsApp Support Number
                        </span>
                        <input
                          className={inputCls}
                          value={editingData.contactInfo?.whatsapp || ""}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              contactInfo: {
                                ...editingData.contactInfo,
                                whatsapp: e.target.value,
                              },
                            })
                          }
                          placeholder="9995757612"
                        />
                      </label>

                      <label className="block">
                        <span className="block text-[11px] font-medium text-black/60 mb-1">
                          Support Email Address
                        </span>
                        <input
                          className={inputCls}
                          value={editingData.contactInfo?.email || ""}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              contactInfo: {
                                ...editingData.contactInfo,
                                email: e.target.value,
                              },
                            })
                          }
                          placeholder="izhablooms@gmail.com"
                        />
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="block text-[11px] font-medium text-black/60 mb-1">
                          Instagram Username / Handle (Optional)
                        </span>
                        <input
                          className={inputCls}
                          value={editingData.contactInfo?.instagram || ""}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              contactInfo: {
                                ...editingData.contactInfo,
                                instagram: e.target.value,
                              },
                            })
                          }
                          placeholder="@izhablooms"
                        />
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="block text-[11px] font-medium text-black/60 mb-1">
                          Closing Message / Sign-off
                        </span>
                        <textarea
                          rows={2}
                          className={inputCls}
                          value={editingData.closingMessage || ""}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              closingMessage: e.target.value,
                            })
                          }
                          placeholder="Thank you message displayed at bottom of page..."
                        />
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                /* ---------- LIVE PREVIEW TAB ---------- */
                <div className="rounded-xl border border-[#E8CFD2] bg-[#FAF6F3] p-4 sm:p-8">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-[#FAF1E4] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#B20947] border border-[#E8CFD2]">
                    <Eye size={13} /> Live Storefront Preview ({editingData.status})
                  </div>

                  {/* Public Page Shell Simulation */}
                  <div className="mx-auto max-w-2xl space-y-6 text-center">
                    <h1 className={`${serif} text-2xl sm:text-3xl md:text-4xl font-medium text-[#332B2B]`}>
                      {editingData.title || "Page Title"}
                    </h1>
                    <p className="text-xs sm:text-sm text-[#6f6565] leading-relaxed max-w-xl mx-auto">
                      {editingData.sub || "Page Subtitle"}
                    </p>
                  </div>

                  <div className="mx-auto mt-6 max-w-2xl space-y-4 text-left">
                    {editingData.intro && (
                      <div className="rounded-xl border border-[#E8CFD2] bg-white p-4 text-sm text-[#6f6565] leading-relaxed">
                        {editingData.intro}
                      </div>
                    )}

                    {/* FAQ Items Preview */}
                    {editingData.slug === "faqs" &&
                      (editingData.faqs || []).map((faq, i) => (
                        <div
                          key={faq.id || i}
                          className="rounded-xl border border-[#E8CFD2] bg-white p-4 space-y-2"
                        >
                          <h3 className={`${serif} text-base sm:text-lg font-medium text-[#332B2B]`}>
                            {faq.q}
                          </h3>
                          <p className="text-xs sm:text-sm text-[#6f6565] leading-relaxed">
                            {faq.a}
                          </p>
                        </div>
                      ))}

                    {/* Sections Preview */}
                    {editingData.sections.map((sec, i) => (
                      <div
                        key={sec.id || i}
                        className="rounded-xl border border-[#E8CFD2] bg-white p-4 sm:p-6 space-y-2"
                      >
                        <h3 className="text-sm sm:text-base font-semibold text-[#332B2B]">
                          {sec.title}
                        </h3>
                        {sec.description && (
                          <p className="text-xs sm:text-sm text-[#6f6565] leading-relaxed">
                            {sec.description}
                          </p>
                        )}
                        {sec.contentType === "bullets" && (
                          <ul className="list-disc space-y-1.5 pl-5 text-xs sm:text-sm text-[#6f6565]">
                            {sec.items.map((it, idx) => (
                              <li key={idx}>{it}</li>
                            ))}
                          </ul>
                        )}
                        {sec.contentType === "numbers" && (
                          <ol className="list-decimal space-y-1.5 pl-5 text-xs sm:text-sm text-[#6f6565]">
                            {sec.items.map((it, idx) => (
                              <li key={idx}>{it}</li>
                            ))}
                          </ol>
                        )}
                        {sec.contentType === "paragraph" && (
                          <div className="space-y-1.5 text-xs sm:text-sm text-[#6f6565] leading-relaxed">
                            {sec.items.map((it, idx) => (
                              <p key={idx}>{it}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Contact & Footer Preview */}
                    {editingData.closingMessage && (
                      <p className="text-center text-xs italic text-[#887878] pt-2">
                        {editingData.closingMessage}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col gap-2 border-t border-[#E8CFD2] bg-[#F5E8D6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span className="text-xs text-black/50">
                {editingData.status === "Published"
                  ? "Page is currently LIVE on the public storefront."
                  : "Page is currently saved as DRAFT (not published)."}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className={`${outlineBtn} !py-2 text-xs`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSave("Draft")}
                  disabled={isSaving}
                  className={`${outlineBtn} !py-2 text-xs gap-1`}
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSave("Published")}
                  disabled={isSaving}
                  className={`${solidBtn} !py-2 text-xs gap-1.5`}
                >
                  <Check size={14} />
                  {isSaving ? "Publishing..." : "Publish Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
