"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, MessageSquare, Plus, Search, Star, Trash2, Upload, X } from "lucide-react";
import { KEYS } from "@/lib/izha-store";
import type { AdminProduct } from "@/lib/demo-store";
import AdminShell, { inputCls, outlineBtn } from "@/components/admin/AdminShell";
import AlertBox from "@/components/izha/AlertBox";
import { serif, solidBtn } from "@/components/izha/ui";

const CRIMSON = "#B20947";

type ReviewView = {
  id: string;
  productId: string;
  name: string;
  place: string;
  rating: number;
  comment: string;
  date: string;
  image: string;
  featured: boolean;
};

/** Most reviews the admin can show on the landing page at once. */
const MAX_HOME_REVIEWS = 6;

const clampRating = (v: unknown) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, n));
};

/** Data URLs and remote links can't go through the Next image optimizer. */
const skipOptimizer = (src: string) => src.startsWith("data:") || /^https?:\/\//i.test(src);

/* eslint-disable @typescript-eslint/no-explicit-any */
function readReview(r: any): ReviewView {
  return {
    id: String(r.id),
    productId: String(r.product_id ?? r.productId ?? ""),
    name: String(r.name ?? "Customer"),
    place: String(r.place ?? ""),
    rating: clampRating(r.rating),
    comment: String(r.text ?? r.comment ?? ""),
    date: String(r.date ?? "Recent"),
    image: String(r.image ?? ""),
    featured: Boolean(r.featured),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Shrinks the chosen photo so it stays small. */
function compressImage(file: File, maxSide = 480, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("This file is not a valid image."));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process the image."));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={n <= value ? "fill-[#E5A93C] text-[#E5A93C]" : "text-[#d9cfcf]"}
        />
      ))}
    </span>
  );
}

/* ---------- Layout pieces (same structure as the dashboard) ---------- */

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
    <div className="h-full min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 transition-colors hover:border-[#B20947]/40 sm:p-6">
      <p className="m-0 text-[10px] uppercase tracking-[0.15em] text-black/50 sm:text-[11px] sm:tracking-[0.25em]">
        {label}
      </p>
      <p
        className={`${serif} lining-nums mb-0 mt-3 break-words text-[28px] font-medium leading-none sm:mt-4 sm:text-[46px]`}
        style={{ color: CRIMSON }}
      >
        {value}
      </p>
      {note && <p className="mb-0 mt-2 text-[11px] text-black/45 sm:mt-3 sm:text-[12px]">{note}</p>}
    </div>
  );
}

function Panel({
  title,
  note,
  className = "",
  children,
}: {
  title: React.ReactNode;
  note?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 sm:p-6 ${className}`}>
      <h2
        className={`${serif} m-0 flex items-center gap-2 break-words text-[20px] font-medium sm:text-[28px]`}
        style={{ color: CRIMSON }}
      >
        {title}
      </h2>
      {note && <p className="mb-0 mt-1 text-[12px] text-black/45">{note}</p>}
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

export default function AdminReviewsPage() {
  // Live data only: products and reviews both come from the database
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [allReviews, setAllReviews] = useState<ReviewView[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(
    null
  );

  // add-review form
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [image, setImage] = useState("");
  const [saving, setSaving] = useState(false);

  const noticeRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // Bring every message into view (useful on phones, where the form is far from the top)
  useEffect(() => {
    if (notice) noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [notice]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      const data = await res.json();
      if (data?.success && Array.isArray(data.products)) {
        setProducts(data.products as AdminProduct[]);
      }
    } catch {
      setNotice({ type: "error", text: "Could not load products." });
    }
  }, []);

  const loadReviews = useCallback(async () => {
    try {
      const res = await fetch("/api/reviews", { cache: "no-store" });
      const data = await res.json();
      if (data?.success && Array.isArray(data.reviews)) {
        setAllReviews(data.reviews.map(readReview));
      }
    } catch {
      setNotice({ type: "error", text: "Could not load reviews." });
    }
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([loadProducts(), loadReviews()]).finally(() => {
      if (alive) setLoading(false);
    });

    const onSync = (e: Event) => {
      if ((e as CustomEvent<string>).detail === KEYS.adminProducts) {
        loadProducts();
      }
    };
    const onFocus = () => {
      loadProducts();
      loadReviews();
    };
    window.addEventListener("izha-store-sync", onSync);
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      window.removeEventListener("izha-store-sync", onSync);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadProducts, loadReviews]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [products, search]);

  const countByProduct = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of allReviews) m.set(r.productId, (m.get(r.productId) || 0) + 1);
    return m;
  }, [allReviews]);

  // Use the picked product if it still exists, otherwise the first one in the list
  const activeId = products.some((p) => p.id === selectedId)
    ? selectedId
    : filteredProducts[0]?.id || "";
  const product = products.find((p) => p.id === activeId);
  const reviews = product ? allReviews.filter((r) => r.productId === product.id) : [];

  // Only count reviews that belong to products that still exist
  const productIds = useMemo(() => new Set(products.map((p) => p.id)), [products]);
  const liveReviews = allReviews.filter((r) => productIds.has(r.productId));
  const featuredCount = liveReviews.filter((r) => r.featured).length;
  const totalReviews = liveReviews.length;

  const avg =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "–";

  const pickProduct = (id: string) => {
    setSelectedId(id);
    setNotice(null);
    // On phones the reviews panel sits below the list, so scroll down to it
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };

  const removeReview = async (review: ReviewView) => {
    if (!window.confirm("Remove this review permanently?")) return;
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(review.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAllReviews((prev) => prev.filter((r) => r.id !== review.id));
      setNotice({ type: "info", text: "Review removed." });
    } catch {
      setNotice({ type: "error", text: "Could not remove the review. Please try again." });
    }
  };

  const toggleFeatured = async (review: ReviewView) => {
    const turningOn = !review.featured;
    if (turningOn && featuredCount >= MAX_HOME_REVIEWS) {
      return setNotice({
        type: "error",
        text: `You can show up to ${MAX_HOME_REVIEWS} reviews on the landing page. Hide one first.`,
      });
    }
    // Update the screen first, then save; undo if saving fails
    setAllReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, featured: turningOn } : r)));
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(review.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: turningOn }),
      });
      if (!res.ok) throw new Error();
      setNotice({
        type: "success",
        text: turningOn
          ? "Review will now show on the landing page."
          : "Review hidden from the landing page.",
      });
    } catch {
      setAllReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, featured: !turningOn } : r)));
      setNotice({ type: "error", text: "Could not update the review. Please try again." });
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return setNotice({ type: "error", text: "Please choose an image file (JPG, PNG or WebP)." });
    }
    try {
      setImage(await compressImage(file));
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Could not add the image.",
      });
    }
  };

  const addReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || saving) return;
    if (name.trim().length < 2) {
      return setNotice({ type: "error", text: "Enter the reviewer name." });
    }
    if (comment.trim().length < 5) {
      return setNotice({ type: "error", text: "Write a review comment (at least 5 characters)." });
    }

    setSaving(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          name: name.trim(),
          place: place.trim() || "Kerala",
          rating: clampRating(rating),
          text: comment.trim(),
          image,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error();

      await loadReviews();
      setName("");
      setPlace("");
      setComment("");
      setRating(5);
      setImage("");
      setNotice({ type: "success", text: `Review added to "${product.name}".` });
    } catch {
      setNotice({ type: "error", text: "Could not save the review. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Customer Reviews"
      actions={
        <Link
          href="/admin/customers"
          className="inline-flex cursor-pointer items-center gap-1.5 px-2 py-1.5 text-[13px] font-semibold text-[#B20947] transition-colors hover:underline"
        >
        </Link>
      }
    >
      {/* Back to Customers navigation */}
      <div className="mb-4">
        <Link
          href="/admin/customers"
          className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#B20947] transition-colors hover:underline sm:text-[13px]"
        >
          <ArrowLeft size={16} />
          Back to Customers
        </Link>
      </div>

      {/* Heading block */}
      <h2
        className={`${serif} mb-2 mt-0 break-words font-medium leading-tight`}
        style={{ color: CRIMSON, fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
      >
        Product Reviews
      </h2>
      <p className="mb-6 mt-0 text-[14px] text-black/60 sm:text-[15px] md:mb-10">
        Add or remove customer reviews, and choose which ones appear on the landing page
      </p>

      {/* Counts: two per row on phones */}
      <section aria-label="Review counts" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Products" value={String(products.length)} note="Catalog styles" />
        <StatCard label="Reviews" value={String(totalReviews)} note="Across all products" />
        <StatCard label="Average rating" value={avg} note="Selected product" />
        <StatCard
          label="On landing page"
          value={`${featuredCount}/${MAX_HOME_REVIEWS}`}
          note="Shown on Home"
        />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
        {/* Product picker */}
        <Panel title="Products" note="Pick one to manage its reviews" className="lg:sticky lg:top-4">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F3057]"
            />
            <input
              className={`${inputCls} !pl-10`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
            />
          </div>

          <ul className="m-0 mt-3 max-h-[288px] list-none space-y-2 overflow-y-auto p-0 pr-1 lg:max-h-[560px]">
            {filteredProducts.map((p) => {
              const count = countByProduct.get(p.id) || 0;
              const active = p.id === activeId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => pickProduct(p.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-sm border p-2 text-left transition ${
                      active
                        ? "border-[#B20947] bg-[#FFF5F7]"
                        : "border-[#E8CFD2] bg-[#FFFBF5] hover:bg-[#FAF3E8]"
                    }`}
                  >
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.name}
                        width={44}
                        height={56}
                        unoptimized={skipOptimizer(p.image)}
                        className="h-14 w-11 shrink-0 rounded-sm object-cover"
                      />
                    ) : (
                      <span className="h-14 w-11 shrink-0 rounded-sm bg-[#F6DADD]" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-[#332B2B]">
                        {p.name}
                      </span>
                      <span className="lining-nums text-[12px] text-black/55">
                        {count} review{count === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {loading && (
              <li className="p-3 text-center text-[13px] text-black/55">Loading products...</li>
            )}
            {!loading && filteredProducts.length === 0 && (
              <li className="p-3 text-center text-[13px] text-black/55">No products found.</li>
            )}
          </ul>
        </Panel>

        {/* Reviews for selected product */}
        <div ref={detailRef} className="min-w-0 scroll-mt-4 space-y-3 sm:space-y-4">
          <div ref={noticeRef} className="scroll-mt-4">
            {notice && (
              <AlertBox
                variant={notice.type}
                message={notice.text}
                onClose={() => setNotice(null)}
              />
            )}
          </div>

          {!product ? (
            <Panel title="Reviews">
              <p className="m-0 text-[14px] text-black/55">
                {loading ? "Loading..." : "Select a product to manage its reviews."}
              </p>
            </Panel>
          ) : (
            <>
              {/* Selected product */}
              <Panel
                title={product.name}
                note={`${reviews.length} review${reviews.length === 1 ? "" : "s"} · Average ${avg} / 5`}
              >
                <p className="lining-nums m-0 inline-block rounded-full bg-[#FFF5F7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B20947]">
                  On landing page: {featuredCount} / {MAX_HOME_REVIEWS}
                </p>
              </Panel>

              {/* Add review */}
              <Panel
                title={
                  <>
                    <Plus size={18} /> Add a review
                  </>
                }
              >
                <form onSubmit={addReview} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block min-w-0">
                      <span className="mb-1 block text-[13px] font-medium text-[#332B2B]">
                        Reviewer name
                      </span>
                      <input
                        className={inputCls}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Anjali R."
                        maxLength={60}
                      />
                    </label>

                    <label className="block min-w-0">
                      <span className="mb-1 block text-[13px] font-medium text-[#332B2B]">
                        City / place (optional)
                      </span>
                      <input
                        className={inputCls}
                        value={place}
                        onChange={(e) => setPlace(e.target.value)}
                        placeholder="e.g. Kochi"
                        maxLength={60}
                      />
                    </label>
                  </div>

                  <div>
                    <span className="mb-1 block text-[13px] font-medium text-[#332B2B]">Rating</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(n)}
                          aria-label={`${n} star${n > 1 ? "s" : ""}`}
                          className="cursor-pointer p-1.5 transition-transform hover:scale-110"
                        >
                          <Star
                            size={28}
                            className={
                              n <= rating ? "fill-[#E5A93C] text-[#E5A93C]" : "text-[#d9cfcf]"
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-[#332B2B]">Review</span>
                    <textarea
                      className={`${inputCls} min-h-[90px] resize-y`}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Write the review text..."
                      maxLength={600}
                    />
                  </label>

                  {/* Photo */}
                  <div>
                    <span className="mb-1 block text-[13px] font-medium text-[#332B2B]">
                      Photo (optional)
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      {image ? (
                        <div className="relative h-20 w-20 overflow-hidden rounded-sm border border-[#E8B8C5] bg-[#FAF3E8]">
                          <Image
                            src={image}
                            alt="Review photo preview"
                            fill
                            unoptimized
                            sizes="80px"
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setImage("")}
                            aria-label="Remove photo"
                            className="absolute right-1 top-1 cursor-pointer rounded-full bg-white/90 p-0.5 text-[#B20947]"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : null}
                      <label className={`${outlineBtn} cursor-pointer gap-1.5`}>
                        <Upload size={14} /> {image ? "Change photo" : "Upload photo"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImage}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className={`${solidBtn} w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto`}
                  >
                    {saving ? "Saving..." : "Add Review"}
                  </button>
                </form>
              </Panel>

              {/* Review list */}
              <Panel
                title={
                  <>
                    <MessageSquare size={18} /> Reviews ({reviews.length})
                  </>
                }
              >
                {reviews.length === 0 ? (
                  <p className="m-0 text-[14px] text-black/55">No reviews for this product yet.</p>
                ) : (
                  <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {reviews.map((r) => (
                      <li
                        key={r.id}
                        className="flex min-w-0 flex-col gap-3 rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-3 sm:flex-row sm:items-start sm:justify-between sm:p-5"
                      >
                        <div className="flex min-w-0 flex-1 gap-3">
                          {r.image && (
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm border border-[#E8B8C5] bg-[#FAF3E8] sm:h-16 sm:w-16">
                              <Image
                                src={r.image}
                                alt={`Photo by ${r.name}`}
                                fill
                                unoptimized={skipOptimizer(r.image)}
                                sizes="64px"
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="break-words text-[14px] font-semibold text-[#332B2B]">
                                {r.name}
                              </span>
                              <Stars value={r.rating} />
                              {r.date && (
                                <span className="lining-nums text-[12px] text-black/55">{r.date}</span>
                              )}
                              {r.featured && (
                                <span className="inline-block shrink-0 rounded-full bg-[#eef7f0] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#3a6b42]">
                                  On landing page
                                </span>
                              )}
                            </div>
                            {r.place && <p className="m-0 text-[12px] text-[#8F3057]">{r.place}</p>}
                            <p className="m-0 mt-1.5 break-words text-[14px] leading-relaxed text-[#332B2B]">
                              {r.comment}
                            </p>
                          </div>
                        </div>

                        <div className="flex w-full shrink-0 items-center gap-2 border-t border-black/5 pt-3 sm:w-auto sm:border-t-0 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => toggleFeatured(r)}
                            className={`${outlineBtn} flex-1 cursor-pointer justify-center gap-1.5 sm:flex-none`}
                          >
                            {r.featured ? <EyeOff size={14} /> : <Eye size={14} />}
                            {r.featured ? "Hide from Home" : "Show on Home"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeReview(r)}
                            aria-label={`Delete review by ${r.name}`}
                            className={`${outlineBtn} shrink-0 cursor-pointer !p-2 text-[#B20947]`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}