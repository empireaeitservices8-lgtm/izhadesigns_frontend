"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { type Category } from "@/lib/categories";
import { KEYS, useStored } from "@/lib/izha-store";
import {
  DEFAULT_ABOUT,
  DEFAULT_CATEGORIES,
  DEFAULT_HERO_SLIDES,
  DEFAULT_INSTAGRAM_POSTS,
  type AboutContent,
  type AboutPoint,
  type HeroSlide,
  type InstagramPost,
} from "@/lib/demo-store";
import AdminShell, { inputCls, outlineBtn } from "@/components/admin/AdminShell";
import AlertBox from "@/components/izha/AlertBox";
import { serif, solidBtn } from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";

const CRIMSON = "#B20947";

/**
 * Client-side canvas image compressor.
 * Downscales images to reasonable max dimensions and JPEG quality (~60-120KB),
 * preventing localStorage quota crashes and request body size errors.
 */
const compressImageFile = (file: File, maxDim = 1200, quality = 0.82): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof window === "undefined") {
        resolve(typeof e.target?.result === "string" ? e.target.result : "");
        return;
      }
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(typeof e.target?.result === "string" ? e.target.result : "");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => {
        resolve(typeof e.target?.result === "string" ? e.target.result : "");
      };
      if (typeof e.target?.result === "string") {
        img.src = e.target.result;
      } else {
        resolve("");
      }
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
};

/* ---------- Layout pieces (same structure as the dashboard) ---------- */

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
      {note && <p className="mb-0 mt-2 text-[11px] text-black/45 sm:mt-3 sm:text-[12px]">{note}</p>}
    </div>
  );
}

function Panel({
  title,
  note,
  action,
  className = "",
  children,
}: {
  title: string;
  note?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 sm:p-6 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className={`${serif} m-0 text-[22px] font-medium leading-tight sm:text-[28px]`} style={{ color: CRIMSON }}>
            {title}
          </h2>
          {note && <p className="mb-0 mt-1 text-[12px] text-black/45">{note}</p>}
        </div>
        {action && <div className="shrink-0 [&>button]:w-full [&>button]:justify-center sm:[&>button]:w-auto">{action}</div>}
      </div>
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

export default function AdminHomepagePage() {
  const [slides, setSlides] = useStored<HeroSlide[]>(
    KEYS.heroSlides,
    DEFAULT_HERO_SLIDES
  );
  const [categories, setCategories] = useStored<Category[]>(
    KEYS.categories,
    DEFAULT_CATEGORIES
  );
  const [instagramPosts, setInstagramPosts] = useStored<InstagramPost[]>(
    KEYS.instagramPosts,
    DEFAULT_INSTAGRAM_POSTS
  );
  const [about, setAbout] = useStored<AboutContent>(
    KEYS.about,
    DEFAULT_ABOUT
  );
  const [savedBanner, setSavedBanner] = useState(false);

  const saveKeyContent = async (key: string, data: any) => {
    try {
      const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
      const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      await fetch(apiUrl(`/content/${key}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({ data }),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("izha-store-sync", { detail: key }));
      }
    } catch (_) {}
  };

  const updateSlide = (idx: number, patch: Partial<HeroSlide>) => {
    setSlides((prev) => {
      const next = prev.map((s, i) => (i === idx ? { ...s, ...patch } : s));
      return next;
    });
  };

  const addSlide = () => {
    setSlides((prev) => {
      const next = [
        ...prev,
        {
          id: `slide-${Date.now()}`,
          image: "/images/hero5.png",
          imageAlt: "New Izha Blooms banner",
          imagePosition: "right center",
          eyebrow: "New Collection",
          title: "Elegance in Every Thread",
          text: "Crafted in soft pastel hues for every occasion.",
          cta: "Explore Now",
          href: "/collections",
          textColor: "#3A1426",
          accentColor: "#8F3057",
        },
      ];
      saveKeyContent("heroSlides", next);
      return next;
    });
  };

  const removeSlide = (idx: number) => {
    if (slides.length <= 1) return;
    setSlides((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      saveKeyContent("heroSlides", next);
      return next;
    });
  };

  const updateCategory = (idx: number, patch: Partial<Category>) => {
    setCategories((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const addCategory = () => {
    setCategories((prev) => {
      const next = [
        ...prev,
        {
          id: `cat-${Date.now()}`,
          name: "New Category",
          href: "/collections/kurtas",
          image: "/images/kurtas1.jpg",
        },
      ];
      saveKeyContent("categories", next);
      return next;
    });
  };

  const removeCategory = (idx: number) => {
    if (categories.length <= 1) return;
    setCategories((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      saveKeyContent("categories", next);
      return next;
    });
  };

  const uploadToSlide = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file, 1600, 0.82);
    if (compressed) {
      setSlides((prev) => {
        const next = prev.map((s, i) => (i === idx ? { ...s, image: compressed } : s));
        saveKeyContent("heroSlides", next);
        return next;
      });
    }
  };

  const uploadToCategory = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file, 800, 0.82);
    if (compressed) {
      setCategories((prev) => {
        const next = prev.map((c, i) => (i === idx ? { ...c, image: compressed } : c));
        saveKeyContent("categories", next);
        return next;
      });
    }
  };

  const updateInstagramPost = (idx: number, patch: Partial<InstagramPost>) => {
    setInstagramPosts((prev) =>
      prev.map((post, i) => (i === idx ? { ...post, ...patch } : post))
    );
  };

  const addInstagramPost = () => {
    setInstagramPosts((prev) => {
      const next = [
        ...prev,
        {
          id: `ig-${Date.now()}`,
          image: "/images/inst6.jpg",
          alt: "Izha Blooms showcase look",
          postUrl: "https://www.instagram.com/izhablooms/",
        },
      ];
      saveKeyContent("instagramPosts", next);
      return next;
    });
  };

  const removeInstagramPost = (idx: number) => {
    if (instagramPosts.length <= 1) return;
    setInstagramPosts((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      saveKeyContent("instagramPosts", next);
      return next;
    });
  };

  const uploadToInstagramPost = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file, 800, 0.82);
    if (compressed) {
      setInstagramPosts((prev) => {
        const next = prev.map((post, i) => (i === idx ? { ...post, image: compressed } : post));
        saveKeyContent("instagramPosts", next);
        return next;
      });
    }
  };

  const updateAbout = (patch: Partial<AboutContent>) => {
    setAbout((prev) => ({ ...(prev ?? DEFAULT_ABOUT), ...patch }));
  };

  const uploadToAboutMain = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file, 1200, 0.82);
    if (compressed) {
      setAbout((prev) => {
        const next = { ...(prev ?? DEFAULT_ABOUT), mainImage: compressed };
        saveKeyContent("about", next);
        return next;
      });
    }
  };

  const uploadToAboutSmall = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file, 800, 0.82);
    if (compressed) {
      setAbout((prev) => {
        const next = { ...(prev ?? DEFAULT_ABOUT), smallImage: compressed };
        saveKeyContent("about", next);
        return next;
      });
    }
  };

  const updateParagraph = (idx: number, val: string) => {
    const current = about?.paragraphs ?? DEFAULT_ABOUT.paragraphs;
    const next = [...current];
    next[idx] = val;
    updateAbout({ paragraphs: next });
  };

  const addParagraph = () => {
    const current = about?.paragraphs ?? DEFAULT_ABOUT.paragraphs;
    updateAbout({ paragraphs: [...current, ""] });
  };

  const removeParagraph = (idx: number) => {
    const current = about?.paragraphs ?? DEFAULT_ABOUT.paragraphs;
    if (current.length <= 1) return;
    updateAbout({ paragraphs: current.filter((_, i) => i !== idx) });
  };

  const updatePoint = (idx: number, patch: Partial<AboutPoint>) => {
    const current = about?.points ?? DEFAULT_ABOUT.points;
    const next = current.map((pt, i) => (i === idx ? { ...pt, ...patch } : pt));
    updateAbout({ points: next });
  };

  const addPoint = () => {
    const current = about?.points ?? DEFAULT_ABOUT.points;
    updateAbout({
      points: [
        ...current,
        { title: "New Feature Point", text: "Describe this feature or promise." },
      ],
    });
  };

  const removePoint = (idx: number) => {
    const current = about?.points ?? DEFAULT_ABOUT.points;
    if (current.length <= 1) return;
    updateAbout({ points: current.filter((_, i) => i !== idx) });
  };

  useEffect(() => {
    fetch(apiUrl("/content/heroSlides"))
      .then((r) => r.json())
      .then((d) => {
        const val = Array.isArray(d?.data) ? d.data : Array.isArray(d?.value) ? d.value : null;
        if (d?.success && val && val.length > 0) setSlides(val);
      })
      .catch(() => {});
    fetch(apiUrl("/content/categories"))
      .then((r) => r.json())
      .then((d) => {
        const val = Array.isArray(d?.data) ? d.data : Array.isArray(d?.value) ? d.value : null;
        if (d?.success && val && val.length > 0) setCategories(val);
      })
      .catch(() => {});
    fetch(apiUrl("/content/about"))
      .then((r) => r.json())
      .then((d) => {
        const val = d?.data || d?.value;
        if (d?.success && val && typeof val === "object") setAbout(val);
      })
      .catch(() => {});
    fetch(apiUrl("/content/instagramPosts"))
      .then((r) => r.json())
      .then((d) => {
        const val = Array.isArray(d?.data) ? d.data : Array.isArray(d?.value) ? d.value : null;
        if (d?.success && val && val.length > 0) setInstagramPosts(val);
      })
      .catch(() => {});
  }, [setSlides, setCategories, setAbout, setInstagramPosts]);

  const triggerSaved = async () => {
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);

    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      await Promise.all([
        fetch(apiUrl("/content/heroSlides"), {
          method: "PUT",
          headers,
          body: JSON.stringify({ data: slides }),
        }),
        fetch(apiUrl("/content/categories"), {
          method: "PUT",
          headers,
          body: JSON.stringify({ data: categories }),
        }),
        fetch(apiUrl("/content/about"), {
          method: "PUT",
          headers,
          body: JSON.stringify({ data: about }),
        }),
        fetch(apiUrl("/content/instagramPosts"), {
          method: "PUT",
          headers,
          body: JSON.stringify({ data: instagramPosts }),
        }),
      ]);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("izha-store-sync", { detail: KEYS.heroSlides }));
        window.dispatchEvent(new CustomEvent("izha-store-sync", { detail: KEYS.categories }));
        window.dispatchEvent(new CustomEvent("izha-store-sync", { detail: KEYS.about }));
        window.dispatchEvent(new CustomEvent("izha-store-sync", { detail: KEYS.instagramPosts }));
      }
    } catch (_) {}
  };

  const resetDefaults = () => {
    setSlides(DEFAULT_HERO_SLIDES);
    setCategories(DEFAULT_CATEGORIES);
    setInstagramPosts(DEFAULT_INSTAGRAM_POSTS);
    setAbout(DEFAULT_ABOUT);
    triggerSaved();
  };

  return (
    <AdminShell
      title="Home Hero, Categories, About & Instagram"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {savedBanner && (
            <div className="flex items-center gap-1.5 rounded-lg border border-[#B9D8BF] bg-[#EEF7F0] px-3 py-1.5 text-[12px] font-medium text-[#2B4E31]">
              <Check size={14} className="text-[#3A6B42]" />
              Saved &amp; Live!
            </div>
          )}
          <button type="button" onClick={resetDefaults} className={`${outlineBtn} gap-1.5`}>
            <RotateCcw size={14} /> Reset Defaults
          </button>
          <button type="button" onClick={triggerSaved} className={`${solidBtn} gap-1.5`}>
            {savedBanner && <Check size={15} />}
            {savedBanner ? "Changes Live!" : "Save All Changes"}
          </button>
        </div>
      }
    >
      {/* Heading block */}
      <h2
        className={`${serif} mb-2 mt-0 break-words font-medium leading-tight`}
        style={{ color: CRIMSON, fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
      >
        Home Hero, Categories, About &amp; Instagram
      </h2>
      <p className="mb-6 mt-0 text-[14px] text-black/60 sm:text-[15px] md:mb-10">
        Edit homepage Hero Banners, Shop by Category, About Section &amp; Instagram Gallery pictures — changes reflect live on Home
      </p>

      {/* Counts: four per row on larger screens */}
      <section aria-label="Homepage counts" className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="Hero slides" value={String(slides.length)} note="Banner slides" />
        <StatCard label="Categories" value={String(categories.length)} note="Category cards" />
        <StatCard label="About Section" value="Custom" note="Photos & Story" />
        <StatCard
          label="Instagram"
          value={String(instagramPosts.length)}
          note="Gallery photos"
        />
      </section>

      {/* Section 1: Central Hero Carousel Banners */}
      <div className="mt-4 sm:mt-6">
        <Panel
          title="1. Central Hero Banner Slides"
          note="Update banner photo, eyebrow, headline, paragraph, CTA label and destination route."
          action={
            <button type="button" onClick={addSlide} className={`${outlineBtn} gap-1.5`}>
              <Plus size={14} /> Add Banner Slide
            </button>
          }
        >
          <div className="space-y-3 sm:space-y-4">
            {slides.map((slide, idx) => (
              <div
                key={slide.id ?? idx}
                className="grid min-w-0 gap-4 rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-4 sm:gap-5 sm:p-5 lg:grid-cols-[260px_1fr]"
              >
                <div className="min-w-0">
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-sm border border-[#E8B8C5] bg-[#F5EBDD]">
                    <Image
                      src={slide.image}
                      alt={slide.imageAlt}
                      fill
                      unoptimized={slide.image.startsWith("data:")}
                      sizes="(min-width: 1024px) 260px, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className={`${outlineBtn} flex-1 cursor-pointer justify-center gap-1.5`}>
                      <Upload size={14} /> Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => uploadToSlide(idx, e)}
                        className="sr-only"
                      />
                    </label>
                    {slides.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlide(idx)}
                        aria-label={`Remove slide ${idx + 1}`}
                        className="rounded-lg border border-[#F9E3E9] bg-[#FFF5F7] px-3 py-2 text-[#B20947] hover:bg-[#F9E3E9]"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid min-w-0 gap-3.5 sm:grid-cols-2">
                  <label className="block min-w-0">
                    <span className="mb-1 block text-[12px] font-medium text-[#332B2B]">
                      Eyebrow Tag
                    </span>
                    <input
                      className={inputCls}
                      value={slide.eyebrow}
                      onChange={(e) => updateSlide(idx, { eyebrow: e.target.value })}
                    />
                  </label>

                  <label className="block min-w-0">
                    <span className="mb-1 block text-[12px] font-medium text-[#332B2B]">
                      Banner Headline
                    </span>
                    <input
                      className={inputCls}
                      value={slide.title}
                      onChange={(e) => updateSlide(idx, { title: e.target.value })}
                    />
                  </label>

                  <label className="block min-w-0 sm:col-span-2">
                    <span className="mb-1 block text-[12px] font-medium text-[#332B2B]">
                      Description Text
                    </span>
                    <input
                      className={inputCls}
                      value={slide.text}
                      onChange={(e) => updateSlide(idx, { text: e.target.value })}
                    />
                  </label>

                  <label className="block min-w-0">
                    <span className="mb-1 block text-[12px] font-medium text-[#332B2B]">
                      Button Text
                    </span>
                    <input
                      className={inputCls}
                      value={slide.cta}
                      onChange={(e) => updateSlide(idx, { cta: e.target.value })}
                    />
                  </label>

                  <label className="block min-w-0">
                    <span className="mb-1 block text-[12px] font-medium text-[#332B2B]">
                      Button Link
                    </span>
                    <input
                      className={inputCls}
                      value={slide.href}
                      onChange={(e) => updateSlide(idx, { href: e.target.value })}
                    />
                  </label>

                  <label className="block min-w-0 sm:col-span-2">
                    <span className="mb-1 block text-[12px] font-medium text-[#332B2B]">
                      Image Path / Data URL
                    </span>
                    <input
                      className={inputCls}
                      value={slide.image}
                      onChange={(e) => updateSlide(idx, { image: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Section 2: Shop by Category Cards */}
      <div className="mt-3 sm:mt-4">
        <Panel
          title="2. Shop by Category Cards"
          note="Edit category titles, destination links, and upload or update category arch images."
          action={
            <button type="button" onClick={addCategory} className={`${outlineBtn} gap-1.5`}>
              <Plus size={14} /> Add Category
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                className="flex min-w-0 flex-col justify-between rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-4"
              >
                <div className="flex flex-col gap-3.5 min-[420px]:flex-row">
                  <div className="relative h-28 w-20 shrink-0 self-center overflow-hidden rounded-t-full border border-[#E8B8C5] bg-[#FAF3E8] min-[420px]:self-start">
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      unoptimized={cat.image.startsWith("data:")}
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="block">
                      <span className="block text-[11px] font-medium text-black/55">Name</span>
                      <input
                        className={`${inputCls} !py-1.5 text-[13px]`}
                        value={cat.name}
                        onChange={(e) => updateCategory(idx, { name: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] font-medium text-black/55">Link</span>
                      <input
                        className={`${inputCls} !py-1.5 text-[12px]`}
                        value={cat.href}
                        onChange={(e) => updateCategory(idx, { href: e.target.value })}
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
                  <input
                    className={`${inputCls} !py-1.5 text-[12px]`}
                    value={cat.image}
                    onChange={(e) => updateCategory(idx, { image: e.target.value })}
                    placeholder="/images/..."
                  />
                  <div className="flex gap-2">
                    <label className={`${outlineBtn} flex-1 cursor-pointer justify-center gap-1.5`}>
                      <Upload size={13} /> Change Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => uploadToCategory(idx, e)}
                        className="sr-only"
                      />
                    </label>
                    {categories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCategory(idx)}
                        aria-label={`Delete ${cat.name}`}
                        className="rounded-lg border border-[#F9E3E9] bg-[#FFF5F7] px-3 text-[#B20947] hover:bg-[#F9E3E9]"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Section 3: About Us Section (Story, Images & Key Highlights) */}
      <div className="mt-3 sm:mt-4">
        <Panel
          title="3. About Section (Story, Photos & Key Highlights)"
          note="Update the large and small arch photos, headline, story paragraphs, key brand pillars, tagline and destination button."
        >
          <div className="space-y-6">
            {/* Photos: Primary Arch & Accent Arch */}
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#B20947]">
                About Section Photos
              </h3>
              <p className="mt-0.5 text-[11px] text-black/50">
                The homepage features two overlapping arched frames: a large primary arch on the left and a smaller overlapping arch on the bottom right.
              </p>

              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {/* Primary Large Arch Image */}
                <div className="rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-4">
                  <span className="block text-[12px] font-semibold text-[#332B2B]">
                    Primary Arch Image (Large Left)
                  </span>
                  <div className="mt-3 flex gap-3.5">
                    <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-t-full border border-[#E8B8C5] bg-[#FAF3E8]">
                      <Image
                        src={about.mainImage || DEFAULT_ABOUT.mainImage}
                        alt={about.mainImageAlt || "Primary about image"}
                        fill
                        unoptimized={(about.mainImage || "").startsWith("data:")}
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <label className="block">
                        <span className="block text-[11px] font-medium text-black/55">
                          Image Path / Data URL
                        </span>
                        <input
                          className={`${inputCls} !py-1.5 text-[12px]`}
                          value={about.mainImage}
                          onChange={(e) => updateAbout({ mainImage: e.target.value })}
                          placeholder="/images/about4.jpg"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[11px] font-medium text-black/55">
                          Alt Text
                        </span>
                        <input
                          className={`${inputCls} !py-1.5 text-[12px]`}
                          value={about.mainImageAlt}
                          onChange={(e) => updateAbout({ mainImageAlt: e.target.value })}
                        />
                      </label>
                    </div>
                  </div>
                  <label className={`${outlineBtn} mt-3 w-full cursor-pointer justify-center gap-1.5`}>
                    <Upload size={13} /> Upload Primary Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={uploadToAboutMain}
                      className="sr-only"
                    />
                  </label>
                </div>

                {/* Accent Small Arch Image */}
                <div className="rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-4">
                  <span className="block text-[12px] font-semibold text-[#332B2B]">
                    Accent Arch Image (Small Overlapping)
                  </span>
                  <div className="mt-3 flex gap-3.5">
                    <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-t-full border border-[#E8B8C5] bg-[#FAF3E8]">
                      <Image
                        src={about.smallImage || DEFAULT_ABOUT.smallImage}
                        alt={about.smallImageAlt || "Accent about image"}
                        fill
                        unoptimized={(about.smallImage || "").startsWith("data:")}
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <label className="block">
                        <span className="block text-[11px] font-medium text-black/55">
                          Image Path / Data URL
                        </span>
                        <input
                          className={`${inputCls} !py-1.5 text-[12px]`}
                          value={about.smallImage}
                          onChange={(e) => updateAbout({ smallImage: e.target.value })}
                          placeholder="/images/about3.png"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[11px] font-medium text-black/55">
                          Alt Text
                        </span>
                        <input
                          className={`${inputCls} !py-1.5 text-[12px]`}
                          value={about.smallImageAlt}
                          onChange={(e) => updateAbout({ smallImageAlt: e.target.value })}
                        />
                      </label>
                    </div>
                  </div>
                  <label className={`${outlineBtn} mt-3 w-full cursor-pointer justify-center gap-1.5`}>
                    <Upload size={13} /> Upload Accent Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={uploadToAboutSmall}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Headlines & Action */}
            <div className="border-t border-black/10 pt-4">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#B20947]">
                Headlines &amp; Button
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-[11px] font-medium text-black/55">
                    Main Heading
                  </span>
                  <input
                    className={`${inputCls} !py-2 text-[14px]`}
                    value={about.heading}
                    onChange={(e) => updateAbout({ heading: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-black/55">
                    Italic Tagline
                  </span>
                  <input
                    className={`${inputCls} !py-2 text-[13px]`}
                    value={about.tagline}
                    onChange={(e) => updateAbout({ tagline: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-black/55">
                    Subtext / Callout
                  </span>
                  <input
                    className={`${inputCls} !py-2 text-[13px]`}
                    value={about.subtext}
                    onChange={(e) => updateAbout({ subtext: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-black/55">
                    Button Label
                  </span>
                  <input
                    className={`${inputCls} !py-2 text-[13px]`}
                    value={about.buttonText}
                    onChange={(e) => updateAbout({ buttonText: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-black/55">
                    Button Destination Link
                  </span>
                  <input
                    className={`${inputCls} !py-2 text-[13px]`}
                    value={about.buttonHref}
                    onChange={(e) => updateAbout({ buttonHref: e.target.value })}
                  />
                </label>
              </div>
            </div>

            {/* Story Paragraphs */}
            <div className="border-t border-black/10 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#B20947]">
                    Story Paragraphs
                  </h3>
                  <p className="mt-0.5 text-[11px] text-black/50">
                    Paragraphs displayed directly beneath the main heading.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addParagraph}
                  className={`${outlineBtn} gap-1 !py-1 text-[11px]`}
                >
                  <Plus size={12} /> Add Paragraph
                </button>
              </div>

              <div className="mt-3 space-y-2.5">
                {(about.paragraphs ?? DEFAULT_ABOUT.paragraphs).map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-2.5"
                  >
                    <span className="mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8B8C5] text-[10px] font-semibold text-[#B20947]">
                      {idx + 1}
                    </span>
                    <textarea
                      rows={2}
                      className={`${inputCls} !py-1.5 text-[13px]`}
                      value={p}
                      onChange={(e) => updateParagraph(idx, e.target.value)}
                    />
                    {(about.paragraphs ?? DEFAULT_ABOUT.paragraphs).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeParagraph(idx)}
                        aria-label={`Remove paragraph ${idx + 1}`}
                        className="mt-1 rounded-lg border border-[#F9E3E9] bg-[#FFF5F7] p-2 text-[#B20947] hover:bg-[#F9E3E9]"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Brand Key Highlights / Feature Points */}
            <div className="border-t border-black/10 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#B20947]">
                    Brand Pillars / Key Highlights
                  </h3>
                  <p className="mt-0.5 text-[11px] text-black/50">
                    The bullet points separated by subtle lines on the homepage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPoint}
                  className={`${outlineBtn} gap-1 !py-1 text-[11px]`}
                >
                  <Plus size={12} /> Add Highlight Point
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(about.points ?? DEFAULT_ABOUT.points).map((pt, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#B20947]">
                          Point {idx + 1}
                        </span>
                        {(about.points ?? DEFAULT_ABOUT.points).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePoint(idx)}
                            aria-label={`Remove point ${idx + 1}`}
                            className="rounded border border-[#F9E3E9] bg-[#FFF5F7] p-1 text-[#B20947] hover:bg-[#F9E3E9]"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <label className="block">
                        <span className="block text-[11px] font-medium text-black/55">Title</span>
                        <input
                          className={`${inputCls} !py-1.5 text-[13px] font-medium`}
                          value={pt.title}
                          onChange={(e) => updatePoint(idx, { title: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[11px] font-medium text-black/55">Description</span>
                        <textarea
                          rows={2}
                          className={`${inputCls} !py-1.5 text-[12px]`}
                          value={pt.text}
                          onChange={(e) => updatePoint(idx, { text: e.target.value })}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Section 4: Instagram Home Section Pictures */}
      <div className="mt-3 sm:mt-4">
        <Panel
          title="4. Instagram Gallery Pictures (Home Section)"
          note="Upload photos, update image paths, alt descriptions & post links shown in “A Glimpse Into Our World”."
          action={
            <button type="button" onClick={addInstagramPost} className={`${outlineBtn} gap-1.5`}>
              <Plus size={14} /> Add Instagram Photo
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {instagramPosts.map((post, idx) => (
              <div
                key={post.id ?? idx}
                className="flex min-w-0 flex-col justify-between rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-4"
              >
                <div className="flex flex-col gap-3.5 min-[420px]:flex-row">
                  <div className="relative h-24 w-24 shrink-0 self-center overflow-hidden rounded-sm border border-[#E8B8C5] bg-[#FAF3E8] min-[420px]:self-start">
                    <Image
                      src={post.image}
                      alt={post.alt}
                      fill
                      unoptimized={post.image.startsWith("data:")}
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="block">
                      <span className="block text-[11px] font-medium text-black/55">
                        Alt Text / Caption
                      </span>
                      <input
                        className={`${inputCls} !py-1.5 text-[12px]`}
                        value={post.alt}
                        onChange={(e) => updateInstagramPost(idx, { alt: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] font-medium text-black/55">
                        Instagram Post Link
                      </span>
                      <input
                        className={`${inputCls} !py-1.5 text-[12px]`}
                        value={post.postUrl}
                        onChange={(e) => updateInstagramPost(idx, { postUrl: e.target.value })}
                        placeholder="https://www.instagram.com/..."
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-black/55">
                      Image Path / Data URL
                    </span>
                    <input
                      className={`${inputCls} !py-1.5 text-[12px]`}
                      value={post.image}
                      onChange={(e) => updateInstagramPost(idx, { image: e.target.value })}
                      placeholder="/images/inst6.jpg"
                    />
                  </label>
                  <div className="flex gap-2">
                    <label className={`${outlineBtn} flex-1 cursor-pointer justify-center gap-1.5`}>
                      <Upload size={13} /> Upload Picture
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => uploadToInstagramPost(idx, e)}
                        className="sr-only"
                      />
                    </label>
                    {instagramPosts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInstagramPost(idx)}
                        aria-label={`Remove Instagram photo ${idx + 1}`}
                        className="rounded-lg border border-[#F9E3E9] bg-[#FFF5F7] px-3 text-[#B20947] hover:bg-[#F9E3E9]"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Bottom Save Bar with contextual AlertBox */}
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#E8CFD2] bg-[#FAF1E4] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
            {savedBanner ? (
              <AlertBox
                variant="success"
                message="All homepage sections (Hero, Categories, About & Instagram) are saved and live on the storefront."
                onClose={() => setSavedBanner(false)}
              />
            ) : (
              <p className="text-[13px] text-[#6f6565]">
                Ready to publish? Click save to sync all changes directly to the homepage storefront.
              </p>
            )}
          </div>
          <button type="button" onClick={triggerSaved} className={`${solidBtn} gap-1.5 shrink-0`}>
            {savedBanner && <Check size={15} />}
            {savedBanner ? "Changes Live!" : "Save All Changes"}
          </button>
        </div>
    </AdminShell>
  );
}