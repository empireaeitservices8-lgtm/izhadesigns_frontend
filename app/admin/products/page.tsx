"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Edit3, ExternalLink, Eye, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { KEYS, inr, useStored } from "@/lib/izha-store";
import { isProductNew, type CategoryName, type CategorySlug } from "@/lib/products";
import {
  ALL_CLOTH_SIZES,
  DEFAULT_ADMIN_PRODUCTS,
  type AdminProduct,
} from "@/lib/demo-store";
import AdminShell, {
  card,
  inputCls,
  outlineBtn,
} from "@/components/admin/AdminShell";
import AlertBox from "@/components/izha/AlertBox";
import Pagination from "@/components/izha/Pagination";
import { sortSizes, type SizeChartRow } from "@/lib/sizes";
import {
  focusRing,
  serif,
  solidBtn,
} from "@/components/izha/ui";

const CRIMSON = "#B20947";
const LOW_STOCK = 5;

/**
 * IDs of deleted products. They stay in this list for good, so a deleted
 * product never comes back on refresh, even if the server still returns it.
 */
const DELETED_PRODUCTS_KEY = "izha_deleted_products";

function readDeletedProducts(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_PRODUCTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDeletedProducts(ids: string[]) {
  try {
    localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable */
  }
}

/** Ask the server to delete a product. Returns true only if the server confirmed. */
async function deleteProductOnServer(id: string): Promise<boolean> {
  try {
    const token = typeof window !== "undefined"
      ? (localStorage.getItem("izha_admin_token") || localStorage.getItem(KEYS.token))
      : null;
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Pointer (hand) cursor on every button, select, checkbox and file upload area inside this page. */
const CURSOR_FIX =
  "[&_button:not(:disabled)]:cursor-pointer [&_select]:cursor-pointer [&_input[type=checkbox]]:cursor-pointer [&_input[type=file]]:cursor-pointer [&_label:has(input[type=file])]:cursor-pointer";

const CATEGORY_OPTIONS: { name: CategoryName; slug: CategorySlug }[] = [
  { name: "Dresses", slug: "dresses" },
  { name: "Kurtas", slug: "kurtas" },
  { name: "Kurta Sets", slug: "kurta-sets" },
  { name: "Tops", slug: "tops" },
  { name: "Maternity Wear", slug: "maternity-wear" },
];

type ProductFormState = {
  id?: string;
  name: string;
  category: CategoryName;
  color: string;
  price: string;
  mrp: string;
  stock: string;
  sizes: string[];
  soldOutSizes: string[];
  sizeChart: SizeChartRow[];
  images: string[];
  description: string;
  fabric: string;
  craft: string;
  fit: string;
  care: string;
  isNew: boolean;
  newDays: string;
};

const EMPTY_FORM: ProductFormState = {
  name: "",
  category: "Kurtas",
  color: "Dusty Rose",
  price: "1499",
  mrp: "2199",
  stock: "15",
  sizes: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
  soldOutSizes: [],
  sizeChart: [],
  images: [],
  description: "",
  fabric: "100% Breathable Pure Cotton",
  craft: "Handcrafted embroidery & fine finishing",
  fit: "Comfort straight fit",
  care: "Gentle cold hand wash",
  isNew: true,
  newDays: "30",
};

/** Returns the time a product was added (ms). Used to show the newest product first. */
const getAddedTime = (p: AdminProduct): number => {
  const fromDate = p.createdAt ? Date.parse(p.createdAt) : NaN;
  if (Number.isFinite(fromDate)) return fromDate;
  const match = /^p(\d{10,})$/.exec(String(p.id));
  if (match) return Number(match[1]);
  return 0;
};

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
  title: string;
  note?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 sm:p-6 ${className}`}>
      <h2 className={`${serif} m-0 text-[24px] font-medium sm:text-[28px]`} style={{ color: CRIMSON }}>
        {title}
      </h2>
      {note && <p className="mb-0 mt-1 text-[12px] text-black/45">{note}</p>}
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

export default function AdminProductsPage() {
  const [storedProducts, setProducts] = useStored<AdminProduct[]>(
    KEYS.adminProducts,
    []
  );
  const [newTagDuration, setNewTagDuration] = useStored<number>(
    KEYS.newTagDurationDays,
    30
  );

  // IDs of deleted products (loaded from this browser on mount)
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  useEffect(() => {
    setDeletedIds(readDeletedProducts());
  }, []);

  // Deleted products are always hidden, whether they come from the server, storage or the demo data
  const products = useMemo(
    () => storedProducts.filter((p) => !deletedIds.includes(p.id) && !/^p\d{1,2}$/.test(p.id)),
    [storedProducts, deletedIds]
  );

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState<"all" | "low_and_out" | "low" | "out" | "in">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [customSize, setCustomSize] = useState("");
  const [incBust, setIncBust] = useState("2");
  const [incWaist, setIncWaist] = useState("2");
  const [incHip, setIncHip] = useState("2");
  const [chartError, setChartError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "info"; text: string } | null>(null);
  // Product waiting for the admin's delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.products) && data.products.length > 0) {
          const deleted = readDeletedProducts();

          // The server still has some products we deleted: ask it to delete them again
          for (const p of data.products) {
            if (deleted.includes(p.id)) void deleteProductOnServer(p.id);
          }

          const mapped: AdminProduct[] = data.products
            .filter((p: any) => !deleted.includes(p.id))
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              categorySlug: p.categorySlug,
              price: p.price,
              mrp: p.mrp,
              stock: p.stock !== undefined ? Number(p.stock) : 15,
              color: "Dusty Rose",
              sizes: p.sizes || [],
              soldOutSizes: p.soldOutSizes || [],
              sizeChart: p.sizeChart || [],
              image: p.image,
              gallery: p.gallery || [p.image],
              isNew: p.isNew,
              newDays: p.newDays || 30,
              createdAt: p.createdAt,
              popularity: p.popularity,
              description: p.description,
              fabric: p.fabric,
              craft: p.craft,
              fit: p.fit,
              care: p.care,
              reviews: [],
            }));
          setProducts((current) => {
            const serverIds = new Set(mapped.map((p) => p.id));
            const localOnly = (current || []).filter(
              (p) => !serverIds.has(p.id) && !deleted.includes(p.id) && String(p.id).startsWith("p17")
            );
            const merged = [...localOnly, ...mapped];
            try {
              localStorage.setItem(KEYS.adminProducts, JSON.stringify(merged));
            } catch (_) { }
            return merged;
          });
        }
      })
      .catch(() => { });
  }, [setProducts]);

  // Close the delete confirmation with the Escape key
  useEffect(() => {
    if (!deleteTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeleteTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteTarget]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = products.filter((p) => {
      if (catFilter !== "All" && p.category !== catFilter) return false;
      if (stockFilter === "low_and_out" && p.stock > 5) return false;
      if (stockFilter === "low" && (p.stock <= 0 || p.stock >= 5)) return false;
      if (stockFilter === "out" && p.stock > 0) return false;
      if (stockFilter === "in" && p.stock <= 5) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
    // Newest added product first, the previous one second, and so on
    return [...matched].sort((a, b) => getAddedTime(b) - getAddedTime(a));
  }, [products, search, catFilter, stockFilter]);

  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 on filter, stock filter, or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, catFilter, stockFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const stats = useMemo(() => {
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length;
    const outOfStock = products.filter((p) => p.stock <= 0).length;
    return { lowStock, outOfStock };
  }, [products]);

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      newDays: String(newTagDuration || 30),
      isNew: true,
    });
    setCustomSize("");
    setChartError("");
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (p: AdminProduct) => {
    const pImages = Array.isArray(p.gallery) && p.gallery.length > 0
      ? p.gallery
      : p.image
        ? [p.image]
        : [];
    setForm({
      id: p.id,
      name: p.name,
      category: p.category,
      color: p.color,
      price: String(p.price),
      mrp: String(p.mrp),
      stock: String(p.stock),
      sizes: [...p.sizes],
      soldOutSizes: [...(p.soldOutSizes ?? [])],
      sizeChart: [...((p as unknown as { sizeChart?: SizeChartRow[] }).sizeChart ?? [])],
      images: pImages.slice(0, 5),
      description: p.description,
      fabric: p.fabric,
      craft: p.craft,
      fit: p.fit,
      care: p.care,
      isNew: Boolean(p.isNew),
      newDays: String(p.newDays || newTagDuration || 30),
    });
    setCustomSize("");
    setChartError("");
    setFormError("");
    setModalOpen(true);
  };

  /**
   * Compresses an image file on the client side using HTML5 Canvas.
   * Keeps max dimension at 1000px and 0.82 JPEG quality, yielding ~70KB per photo
   * instead of 4MB. This prevents localStorage QuotaExceededError and guarantees instant storefront sync!
   */
  const compressImageFile = (file: File, maxDim = 1000, quality = 0.82): Promise<string> => {
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
          const compressed = canvas.toDataURL("image/jpeg", quality);
          resolve(compressed);
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

  const handleImageFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = 5 - form.images.length;
    if (remaining <= 0) return;
    const toRead = files.slice(0, remaining);

    const promises = toRead.map((file) => compressImageFile(file));

    Promise.all(promises).then((results) => {
      const valid = results.filter(Boolean);
      if (valid.length > 0) {
        setForm((f) => ({
          ...f,
          images: [...f.images, ...valid].slice(0, 5),
        }));
      }
    });
    e.target.value = "";
  };

  const removeImageAt = (index: number) => {
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== index),
    }));
  };

  const makeCoverImage = (index: number) => {
    setForm((f) => {
      const target = f.images[index];
      if (!target) return f;
      const rest = f.images.filter((_, i) => i !== index);
      return {
        ...f,
        images: [target, ...rest],
      };
    });
  };

  const addSize = (sizeLabel: string) => {
    const clean = sizeLabel.trim().toUpperCase();
    if (!clean) return;
    setForm((f) =>
      f.sizes.includes(clean) ? f : { ...f, sizes: sortSizes([...f.sizes, clean]) }
    );
  };

  const setChartCell = (size: string, field: "bust" | "waist" | "hip", value: string) => {
    setForm((f) => {
      const exists = f.sizeChart.some((r) => r.size === size);
      const rows = exists
        ? f.sizeChart.map((r) => (r.size === size ? { ...r, [field]: value } : r))
        : [...f.sizeChart, { size, bust: "", waist: "", hip: "", [field]: value }];
      return { ...f, sizeChart: rows };
    });
  };

  /** Uses the first size's measurements and adds the increments for every next size. */
  const autoFillChart = () => {
    const first = form.sizes[0];
    const row = form.sizeChart.find((r) => r.size === first);
    const b = Number(row?.bust);
    const w = Number(row?.waist);
    const h = Number(row?.hip);
    if (![b, w, h].every((n) => Number.isFinite(n) && n > 0)) {
      return setChartError(`Enter bust, waist and hip for the first size (${first ?? "-"}) as numbers, then click again.`);
    }
    const ib = Number(incBust);
    const iw = Number(incWaist);
    const ih = Number(incHip);
    if (![ib, iw, ih].every((n) => Number.isFinite(n) && n >= 0)) {
      return setChartError("Enter how many inches each next size adds (0 or more).");
    }
    const fmt = (n: number) => String(Number(n.toFixed(1)));
    setChartError("");
    setForm((f) => ({
      ...f,
      sizeChart: f.sizes.map((s, i) => ({
        size: s,
        bust: fmt(b + i * ib),
        waist: fmt(w + i * iw),
        hip: fmt(h + i * ih),
      })),
    }));
  };

  const removeSize = (sizeLabel: string) => {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.filter((s) => s !== sizeLabel),
      soldOutSizes: f.soldOutSizes.filter((s) => s !== sizeLabel),
      sizeChart: f.sizeChart.filter((r) => r.size !== sizeLabel),
    }));
  };

  const toggleSoldOutSize = (sizeLabel: string) => {
    setForm((f) => ({
      ...f,
      soldOutSizes: f.soldOutSizes.includes(sizeLabel)
        ? f.soldOutSizes.filter((s) => s !== sizeLabel)
        : [...f.soldOutSizes, sizeLabel],
    }));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(form.price);
    const mrp = Number(form.mrp);
    const stock = Number(form.stock);

    if (form.name.trim().length < 2) return setFormError("Enter a product title.");
    if (!Number.isFinite(price) || price <= 0) return setFormError("Enter a valid selling price.");
    if (!Number.isFinite(mrp) || mrp < price) return setFormError("MRP must be equal to or greater than selling price.");
    if (!Number.isFinite(stock) || stock < 0) return setFormError("Stock cannot be negative.");
    if (form.sizes.length === 0) return setFormError("Keep or add at least one size.");

    if (form.images.length === 0) return setFormError("Please upload at least 1 cloth image (you can upload 4 or 5 images).");

    const catSlug =
      CATEGORY_OPTIONS.find((c) => c.name === form.category)?.slug ?? "kurtas";

    // Size measurements: keep only sizes that still exist and rows the admin filled in.
    const chart: SizeChartRow[] = [];
    for (const s of form.sizes) {
      const r = form.sizeChart.find((x) => x.size === s);
      if (r && (r.bust.trim() || r.waist.trim() || r.hip.trim())) {
        chart.push({ size: s, bust: r.bust.trim(), waist: r.waist.trim(), hip: r.hip.trim() });
      }
    }

    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);
    const primaryImage = form.images[0];
    const durationDays = Number(form.newDays) > 0 ? Number(form.newDays) : (newTagDuration || 30);

    setIsSubmitting(true);
    setFormError("");

    try {
      if (form.id) {
        const updatedProductData = {
          id: form.id,
          name: form.name.trim(),
          category: form.category,
          categorySlug: catSlug,
          color: form.color.trim() || "Dusty Rose",
          price,
          mrp,
          stock,
          sizes: form.sizes,
          soldOutSizes: form.soldOutSizes,
          sizeChart: chart,
          image: primaryImage,
          gallery: form.images,
          description: form.description.trim(),
          fabric: form.fabric.trim(),
          craft: form.craft.trim(),
          fit: form.fit.trim(),
          care: form.care.trim(),
          isNew: form.isNew,
          newDays: durationDays,
        };

        const res = await fetch(`/api/products/${encodeURIComponent(form.id)}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(updatedProductData),
        });

        let data: any = null;
        try {
          data = await res.json();
        } catch (_) {
          data = null;
        }

        if (!res.ok || !data?.success) {
          throw new Error(data?.message || `Failed to update product (Server responded with HTTP ${res.status}).`);
        }

        const savedProd: AdminProduct = {
          ...updatedProductData,
          ...(data.product || {}),
        };

        setProducts((prev) => {
          const next = prev.map((p) => (p.id === form.id ? { ...p, ...savedProd } : p));
          try {
            localStorage.setItem(KEYS.adminProducts, JSON.stringify(next));
            window.dispatchEvent(new CustomEvent("izha-store-sync", { detail: KEYS.adminProducts }));
          } catch (_) { }
          return next;
        });
      } else {
        const newProdData = {
          id: `p${Date.now()}`,
          name: form.name.trim(),
          category: form.category,
          categorySlug: catSlug,
          color: form.color.trim() || "Dusty Rose",
          price,
          mrp,
          stock,
          soldCount: 0,
          sizes: form.sizes,
          soldOutSizes: form.soldOutSizes,
          sizeChart: chart,
          image: primaryImage,
          gallery: form.images,
          isNew: form.isNew,
          newDays: durationDays,
          createdAt: new Date().toISOString(),
          popularity: 85,
          description:
            form.description.trim() ||
            "Thoughtfully crafted by Izha Blooms for everyday elegance and effortless comfort.",
          fabric: form.fabric.trim() || "100% Pure Cotton",
          craft: form.craft.trim() || "Hand-finished detailing",
          fit: form.fit.trim() || "Comfort fit",
          care: form.care.trim() || "Gentle cold wash",
          reviews: [],
        };

        const res = await fetch("/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(newProdData),
        });

        let data: any = null;
        try {
          data = await res.json();
        } catch (_) {
          data = null;
        }

        if (!res.ok || !data?.success) {
          throw new Error(data?.message || `Failed to create product (Server responded with HTTP ${res.status}).`);
        }

        const savedProd: AdminProduct = {
          ...newProdData,
          ...(data.product || {}),
        };

        setProducts((prev) => {
          const next = [savedProd, ...prev.filter((p) => p.id !== savedProd.id)];
          try {
            localStorage.setItem(KEYS.adminProducts, JSON.stringify(next));
            window.dispatchEvent(new CustomEvent("izha-store-sync", { detail: KEYS.adminProducts }));
          } catch (_) { }
          return next;
        });

        setCurrentPage(1);
      }

      setNotice({
        type: "success",
        text: form.id
          ? `"${form.name.trim()}" updated successfully.`
          : `"${form.name.trim()}" added to the catalog.`,
      });
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to save product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStock = (id: string, delta: number) => {
    let newStock = 0;
    setProducts((prev) => {
      const target = prev.find((p) => p.id === id);
      if (!target) return prev;
      newStock = Math.max(0, Math.floor(target.stock + delta));
      const next = prev.map((p) =>
        p.id === id ? { ...p, stock: newStock } : p
      );
      try {
        localStorage.setItem(KEYS.adminProducts, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("izha-store-sync", { detail: KEYS.adminProducts }));
      } catch (_) { }
      return next;
    });

    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);
    fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ stock: newStock }),
    }).catch(() => { });
  };

  const deleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);

    // Remember the deletion first. It is never removed from this list,
    // so the product stays deleted after a refresh.
    const current = readDeletedProducts();
    const nextIds = current.includes(id) ? current : [...current, id];
    writeDeletedProducts(nextIds);
    setDeletedIds(nextIds);

    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(KEYS.adminProducts, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("izha-store-sync", { detail: KEYS.adminProducts }));
      } catch (_) { }
      return next;
    });
    if (target) {
      setNotice({ type: "info", text: `"${target.name}" removed from catalog.` });
    }

    // Tell the server too (if this fails, the product is still hidden here and retried on the next load)
    void deleteProductOnServer(id);
  };

  /** Runs when the admin clicks "Delete" inside the confirmation box. */
  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteProduct(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <AdminShell
      title="Products & Inventory"
      actions={
        <button type="button" onClick={openCreate} className={`${solidBtn} cursor-pointer gap-1.5`}>
          <Plus size={16} /> Add Product
        </button>
      }
    >
      <div className={`${CURSOR_FIX} w-full min-w-0`}>
        {/* Heading block */}
        <h2
          className={`${serif} mb-2 mt-0 break-words font-medium leading-tight`}
          style={{ color: CRIMSON, fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
        >
          Products &amp; Inventory
        </h2>
        <p className="mb-6 mt-0 text-[14px] text-black/60 sm:text-[15px] md:mb-10">
          Add, edit, delete products, manage stock, colours, and sizes (XS–XXXL or number sizes like 34, 36, 38)
        </p>

        {/* Counts: two per row on phones */}
        <section aria-label="Product counts" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => { setStockFilter("all"); setCatFilter("All"); setSearch(""); }}
            className="text-left cursor-pointer focus:outline-none"
            title="Click to view all products"
          >
            <StatCard label="Products" value={String(products.length)} note="Catalog styles" />
          </button>
          <button
            type="button"
            onClick={() => { setStockFilter("all"); }}
            className="text-left cursor-pointer focus:outline-none"
            title="Click to reset stock filter"
          >
            <StatCard label="Showing" value={String(filtered.length)} note="Matching your filters" />
          </button>
          <button
            type="button"
            onClick={() => { setStockFilter("low"); }}
            className="text-left cursor-pointer focus:outline-none"
            title="Click to filter low stock (< 5)"
          >
            <StatCard label="Low stock" value={String(stats.lowStock)} note={`${LOW_STOCK} or fewer left`} />
          </button>
          <button
            type="button"
            onClick={() => { setStockFilter("out"); }}
            className="text-left cursor-pointer focus:outline-none"
            title="Click to filter out of stock (0)"
          >
            <StatCard label="Out of stock" value={String(stats.outOfStock)} note="Needs restocking" />
          </button>
        </section>

        {/* New Arrival Tag Duration Setting */}
        <div className="mt-4 flex flex-col gap-3 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-3.5 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B20947]/10 text-[#B20947] text-[13px] font-bold">
              ★
            </span>
            <div className="min-w-0">
              <p className="m-0 text-[13px] font-semibold text-[#332B2B]">
                New Arrival Badge Display Duration
              </p>
              <p className="m-0 text-[11px] text-[#6f6565]">
                Decide how many days products display the &ldquo;NEW&rdquo; badge on the storefront before it automatically expires.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[#332B2B]">Duration:</span>
            <input
              type="number"
              min="1"
              max="365"
              value={newTagDuration}
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value) || 1);
                setNewTagDuration(val);
              }}
              className={`${inputCls} !w-20 !py-1 text-center font-semibold text-[#B20947]`}
            />
            <span className="text-[12px] text-[#6f6565]">days</span>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 sm:mt-6">
          <Panel title="Search & filter" note="By name, category, shade or stock level">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
              <div className="relative w-full lg:min-w-[220px] lg:flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F3057]"
                />
                <input
                  className={`${inputCls} !pl-10`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products by name, category or shade..."
                />
              </div>

              {/* Stock status filter dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="stockFilterSelect" className="text-[12px] font-semibold uppercase tracking-wider text-[#332B2B] shrink-0">
                  Stock:
                </label>
                <select
                  id="stockFilterSelect"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as any)}
                  className={`${inputCls} !w-auto cursor-pointer font-medium text-[12px] sm:text-[13px] bg-white border-[#E8B8C5] text-[#332B2B]`}
                >
                  <option value="all">All Stock Levels ({products.length})</option>
                  <option value="low_and_out">
                    Out of Stock &amp; Low Stock (≤ 5 units) ({products.filter((p) => p.stock <= 5).length})
                  </option>
                  <option value="out">
                    Out of Stock (0 units) ({stats.outOfStock})
                  </option>
                  <option value="low">
                    Low Stock (&lt; 5 units) ({products.filter((p) => p.stock > 0 && p.stock < 5).length})
                  </option>
                  <option value="in">
                    In Stock (&gt; 5 units) ({products.filter((p) => p.stock > 5).length})
                  </option>
                </select>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {["All", ...CATEGORY_OPTIONS.map((c) => c.name)].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatFilter(cat)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors sm:px-3.5 sm:text-[12px] ${catFilter === cat
                      ? "border-[#B20947] bg-[#F8EAE4] text-[#B20947]"
                      : "border-[#E8B8C5] bg-[#FAF3E8] text-[#332B2B] hover:border-[#B20947]"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* Product list */}
        <div className="mt-3 sm:mt-4">
          <Panel title="All products" note={`${filtered.length} ${filtered.length === 1 ? "style" : "styles"}`}>
            {/* Action alert box in necessary area */}
            {notice && (
              <AlertBox
                variant={notice.type}
                message={notice.text}
                onClose={() => setNotice(null)}
                className="mb-4"
              />
            )}

            {filtered.length === 0 ? (
              <p className="m-0 text-[14px] text-black/55">No products found.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {paginatedProducts.map((p) => {
                    const discount = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
                    return (
                      <div
                        key={p.id}
                        className="flex min-w-0 flex-col justify-between rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-3.5 sm:p-4"
                      >
                        <div className="flex gap-3.5">
                          <Link
                            href={`/product/${encodeURIComponent(p.id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/img relative h-24 w-20 shrink-0 overflow-hidden rounded-sm border border-[#E8B8C5] bg-[#FFF5F7] transition-all hover:border-[#B20947]"
                            title="Click to view product details page"
                          >
                            <Image
                              src={p.image}
                              alt={p.name}
                              fill
                              sizes="80px"
                              unoptimized={p.image.startsWith("data:")}
                              className="object-cover transition-transform group-hover/img:scale-105"
                            />
                            {Array.isArray(p.gallery) && p.gallery.length > 1 && (
                              <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white backdrop-blur-xs">
                                {p.gallery.length} photos
                              </span>
                            )}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="m-0 break-words text-[10px] font-semibold uppercase tracking-[0.15em] text-[#B5607A]">
                                {p.category} · {p.color}
                              </p>
                              {isProductNew(p, newTagDuration) && (
                                <span className="rounded bg-[#B20947] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                                  New
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/product/${encodeURIComponent(p.id)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/title block cursor-pointer"
                              title="Click to view product details page"
                            >
                              <h3 className="m-0 mt-1 line-clamp-2 break-words text-[15px] font-semibold text-[#332B2B] group-hover/title:text-[#B20947] transition-colors">
                                {p.name}
                              </h3>
                            </Link>
                            <p className="lining-nums m-0 mt-1 flex flex-wrap items-baseline gap-1.5 text-[14px] font-semibold text-[#332B2B]">
                              {inr(p.price)}
                              <span className="text-[12px] font-normal text-[#9b9090] line-through">
                                {inr(p.mrp)}
                              </span>
                              {discount > 0 && (
                                <span className="rounded bg-[#F9E3E9] px-1.5 py-0.5 text-[10px] text-[#B20947]">
                                  {discount}% OFF
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Sizes */}
                        <div className="mt-3 border-t border-black/5 pt-3">
                          <p className="m-0 text-[10px] font-medium uppercase tracking-[0.15em] text-black/50">
                            Active Sizes ({p.sizes.length})
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {p.sizes.map((s) => (
                              <span
                                key={s}
                                className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${(p.soldOutSizes ?? []).includes(s)
                                  ? "border-[#e3d9d9] text-[#9b9090] line-through"
                                  : "border-[#E8B8C5] bg-[#EFE2CE] text-[#332B2B]"
                                  }`}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Stock + Actions */}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-black/55">Stock:</span>
                            <button
                              type="button"
                              onClick={() => updateStock(p.id, -1)}
                              aria-label={`Decrease stock of ${p.name}`}
                              className="h-8 w-8 rounded-full border border-[#E8B8C5] bg-[#FAF3E8] text-[13px] font-semibold hover:bg-[#EFE2CE] sm:h-7 sm:w-7"
                            >
                              -
                            </button>
                            <span
                              className={`lining-nums min-w-6 text-center text-[13px] font-semibold ${p.stock === 0
                                ? "text-[#B20947]"
                                : p.stock <= 5
                                  ? "text-[#b5607a]"
                                  : "text-[#3a6b42]"
                                }`}
                            >
                              {p.stock}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateStock(p.id, 1)}
                              aria-label={`Increase stock of ${p.name}`}
                              className="h-8 w-8 rounded-full border border-[#E8B8C5] bg-[#FAF3E8] text-[13px] font-semibold hover:bg-[#EFE2CE] sm:h-7 sm:w-7"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/product/${encodeURIComponent(p.id)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`View ${p.name} details page`}
                              className={`inline-flex items-center gap-1 rounded-lg border border-[#E8B8C5] bg-[#FAF3E8] px-2.5 py-1.5 text-[12px] font-medium text-[#332B2B] hover:border-[#B20947] hover:text-[#B20947] ${focusRing}`}
                              title="View live product details page"
                            >
                              <ExternalLink size={13} /> View
                            </Link>
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              aria-label={`Edit ${p.name}`}
                              className={`inline-flex items-center gap-1 rounded-lg border border-[#E8B8C5] bg-[#FAF3E8] px-2.5 py-1.5 text-[12px] font-medium text-[#332B2B] hover:border-[#B20947] hover:text-[#B20947] ${focusRing}`}
                            >
                              <Edit3 size={13} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(p)}
                              aria-label={`Delete ${p.name}`}
                              className={`inline-flex items-center gap-1 rounded-lg border border-[#F9E3E9] bg-[#FFF5F7] px-2.5 py-1.5 text-[12px] font-medium text-[#B20947] hover:bg-[#F9E3E9] ${focusRing}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filtered.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </Panel>
        </div>

        {/* Delete confirmation alert box */}
        {deleteTarget && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-[#382B2B]/55 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setDeleteTarget(null);
            }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
              aria-describedby="delete-dialog-desc"
              className={`${card} relative w-full max-w-sm p-5 shadow-2xl sm:p-6`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F9E3E9] text-[#B20947]">
                <Trash2 size={20} />
              </span>
              <h2
                id="delete-dialog-title"
                className={`${serif} mb-0 mt-3 text-[24px] font-medium text-[#332B2B]`}
              >
                Delete this product?
              </h2>
              <p id="delete-dialog-desc" className="mb-0 mt-2 break-words text-[13px] text-[#6f6565]">
                &ldquo;{deleteTarget.name}&rdquo; will be permanently removed from the catalog and the
                storefront. This action cannot be undone.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className={`${outlineBtn} w-full sm:w-auto`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#B20947] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#8F0738] sm:w-auto ${focusRing}`}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Modal */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[#382B2B]/55 p-2 backdrop-blur-sm sm:p-6"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setModalOpen(false);
            }}
          >
            <form
              onSubmit={handleSaveProduct}
              className={`${card} relative my-2 w-full max-w-2xl p-4 shadow-2xl sm:my-4 sm:p-7`}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close product modal"
                className="absolute right-3 top-3 rounded-full p-2 text-[#332B2B] hover:bg-[#FFF5F7] hover:text-[#B20947] sm:right-4 sm:top-4"
              >
                <X size={20} />
              </button>

              <p className="pr-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B5607A]">
                {form.id ? "Update Product" : "Create New Clothing Product"}
              </p>
              <h2 className={`${serif} mt-1 break-words pr-10 text-[24px] font-medium text-[#332B2B] sm:text-[28px]`}>
                {form.id ? form.name : "Add Clothing Piece"}
              </h2>

              {formError && (
                <AlertBox
                  variant="error"
                  message={formError}
                  onClose={() => setFormError("")}
                  className="mt-3"
                />
              )}

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-[13px] font-medium text-[#332B2B]">
                    Product Name *
                  </span>
                  <input
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Dusty Rose Embroidered Kurta"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[13px] font-medium text-[#332B2B]">
                    Collection Category
                  </span>
                  <select
                    className={inputCls}
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as CategoryName })
                    }
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.slug} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[13px] font-medium text-[#332B2B]">
                    Colour / Shade
                  </span>
                  <input
                    className={inputCls}
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="Dusty Rose / Ivory"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[13px] font-medium text-[#332B2B]">
                    Selling Price (₹) *
                  </span>
                  <input
                    type="number"
                    className={inputCls}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[13px] font-medium text-[#332B2B]">
                    Original Price / MRP (₹) *
                  </span>
                  <input
                    type="number"
                    className={inputCls}
                    value={form.mrp}
                    onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[13px] font-medium text-[#332B2B]">
                    Stock Quantity *
                  </span>
                  <input
                    type="number"
                    className={inputCls}
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </label>

                {/* Multi-image upload: 4 to 5 images */}
                <div className="block sm:col-span-2">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-[#332B2B]">
                      Product Images (Upload 4 or 5 images) *
                    </span>
                    <span className="rounded bg-[#FAF1E4] px-2 py-0.5 text-[11px] font-medium text-[#B20947] border border-[#DFCBB3]">
                      {form.images.length} / 5 photos uploaded
                    </span>
                  </div>
                  <p className="mb-3 text-[12px] text-[#6f6565]">
                    Add 4 or 5 cloth photos. The 1st image is the primary cover image shown on product cards; all images appear in the customer gallery.
                  </p>

                  {form.images.length > 0 && (
                    <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                      {form.images.map((img, idx) => (
                        <div
                          key={idx}
                          className={`group relative flex h-full flex-col overflow-hidden rounded-xl border-2 bg-white transition-all ${idx === 0 ? "border-[#B20947] shadow-sm" : "border-[#DFCBB3]"
                            }`}
                        >
                          {/* Fixed 3:4 frame: every photo is cropped to the same size */}
                          <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-[#FAF1E4]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img}
                              alt={`Cloth photo ${idx + 1}`}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            {/* Badge */}
                            <div className="absolute left-1.5 top-1.5">
                              {idx === 0 ? (
                                <span className="rounded bg-[#B20947] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                                  Cover
                                </span>
                              ) : (
                                <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-xs">
                                  Photo {idx + 1}
                                </span>
                              )}
                            </div>
                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => removeImageAt(idx)}
                              className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1.5 text-white hover:bg-[#B20947] transition-colors sm:p-1"
                              title="Remove photo"
                              aria-label={`Remove photo ${idx + 1}`}
                            >
                              <X size={12} />
                            </button>
                          </div>
                          {/* Footer action: same height and centred text in every card */}
                          <div className="flex h-10 shrink-0 items-center justify-center border-t border-[#DFCBB3]/50 bg-[#FAF1E4]/50 px-1.5 text-center">
                            {idx === 0 ? (
                              <span className="text-[11px] font-semibold leading-none text-[#B20947]">
                                Main Image
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => makeCoverImage(idx)}
                                className="text-[11px] font-medium leading-none text-[#332B2B] hover:text-[#B20947] transition-colors"
                              >
                                Make Cover
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Add more slot if fewer than 5 images (stretches to the same height as the photo cards) */}
                      {form.images.length < 5 && (
                        <label className="flex h-full min-h-[200px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#DFCBB3] bg-[#FAF1E4] p-3 text-center transition-colors hover:border-[#B20947] hover:bg-[#FDF6ED]">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF5F7] text-[#B20947]">
                            <Plus size={18} />
                          </div>
                          <span className="text-[12px] font-semibold text-[#332B2B]">
                            + Add Photo
                          </span>
                          <span className="text-[10px] text-[#6f6565]">
                            ({5 - form.images.length} left)
                          </span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageFiles}
                            className="sr-only"
                          />
                        </label>
                      )}
                    </div>
                  )}
                  {/* Empty state: full dropzone */}
                  {form.images.length === 0 && (
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#DFCBB3] bg-[#FAF1E4] p-5 text-center cursor-pointer transition-colors hover:border-[#B20947] hover:bg-[#FDF6ED] sm:p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF5F7] text-[#B20947]">
                        <Upload size={22} />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#332B2B]">
                          Click to select cloth images from folder
                        </p>
                        <p className="text-[12px] text-[#6f6565]">
                          You can select 4 or 5 photos at once (JPG, PNG, WebP)
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageFiles}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>

                {/* New Arrival Checkbox & Duration */}
                <div className="rounded-xl border border-[#DFCBB3] bg-[#FAF1E4] p-3.5 sm:col-span-2 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.isNew}
                        onChange={(e) => setForm({ ...form, isNew: e.target.checked })}
                        className="h-5 w-5 shrink-0 accent-[#B20947] rounded cursor-pointer"
                      />
                      <div>
                        <span className="block text-[14px] font-semibold text-[#332B2B]">
                          Mark as New Arrival
                        </span>
                        <span className="block text-[12px] text-[#6f6565]">
                          Displays the &ldquo;NEW&rdquo; badge on product cards and lists this product in New Arrivals collection.
                        </span>
                      </div>
                    </label>

                    {form.isNew && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t border-[#DFCBB3]/50 sm:border-t-0">
                        <label className="text-[13px] font-medium text-[#332B2B] sm:whitespace-nowrap">
                          Show &ldquo;NEW&rdquo; tag for:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={form.newDays}
                            onChange={(e) => setForm({ ...form, newDays: e.target.value })}
                            className={`${inputCls} !w-20 !py-1 text-center font-semibold text-[#B20947]`}
                          />
                          <span className="text-[13px] text-[#6f6565]">days</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Size measurements shown to customers in the Size Guide */}
                <div className="min-w-0 rounded-xl border border-[#DFCBB3] bg-[#EFE2CE] p-3.5 sm:col-span-2 sm:p-4">
                  <p className="text-[13px] font-semibold text-[#332B2B]">
                    Sizes &amp; measurements (shown in the customer Size Guide)
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#6f6565]">
                    Every row is a size the customer can pick. Remove a size with × (for example XS) or add a new one
                    (for example 34 or 4XL). Type bust, waist and hip in inches for the first size, set how much each next
                    size adds, then click &ldquo;Fill remaining sizes&rdquo;. You can still edit any box by hand. Leave all
                    measurement boxes empty to use the default chart.
                  </p>

                  {/* Add a size */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#6f6565]">
                      Add size:
                    </span>
                    {ALL_CLOTH_SIZES.filter((s) => !form.sizes.includes(s)).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addSize(s)}
                        className="rounded-full border border-[#E8B8C5] bg-[#FAF3E8] px-2.5 py-1 text-[11px] font-semibold text-[#332B2B] hover:border-[#B20947] hover:text-[#B20947]"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      className={`${inputCls} w-full sm:max-w-[200px] !py-2 text-[13px]`}
                      value={customSize}
                      onChange={(e) => setCustomSize(e.target.value)}
                      placeholder="New size (e.g. 34, 4XL)"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        addSize(customSize);
                        setCustomSize("");
                      }}
                      className={`${outlineBtn} w-full sm:w-auto`}
                    >
                      + Add Size
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <span className="w-full pb-0 text-[12px] text-[#6f6565] sm:w-auto sm:pb-2">
                      Each next size adds (inches):
                    </span>
                    <label className="block">
                      <span className="block text-[11px] text-[#6f6565]">Bust</span>
                      <input
                        type="number"
                        step="0.5"
                        className={`${inputCls} !w-20 !py-2 text-[13px]`}
                        value={incBust}
                        onChange={(e) => setIncBust(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] text-[#6f6565]">Waist</span>
                      <input
                        type="number"
                        step="0.5"
                        className={`${inputCls} !w-20 !py-2 text-[13px]`}
                        value={incWaist}
                        onChange={(e) => setIncWaist(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] text-[#6f6565]">Hip</span>
                      <input
                        type="number"
                        step="0.5"
                        className={`${inputCls} !w-20 !py-2 text-[13px]`}
                        value={incHip}
                        onChange={(e) => setIncHip(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={autoFillChart}
                      className={`${outlineBtn} w-full sm:w-auto`}
                    >
                      Fill remaining sizes
                    </button>
                  </div>
                  {chartError && (
                    <p className="mt-1.5 text-[12px] font-medium text-[#B20947]">{chartError}</p>
                  )}

                  <div className="mt-3 max-w-full overflow-x-auto rounded-lg border border-[#DFCBB3] bg-[#FAF3E8]">
                    <table className="w-full min-w-[430px] text-left text-[13px] sm:min-w-[560px]">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-[0.1em] text-[#6f6565]">
                          <th className="px-2 py-2 font-medium sm:px-3">Size</th>
                          <th className="px-1.5 py-2 font-medium sm:px-2">Bust</th>
                          <th className="px-1.5 py-2 font-medium sm:px-2">Waist</th>
                          <th className="px-1.5 py-2 font-medium sm:px-2">Hip</th>
                          <th className="px-1.5 py-2 font-medium sm:px-2">Sold out</th>
                          <th className="px-1.5 py-2 font-medium sm:px-2">
                            <span className="sr-only">Remove</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.sizes.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-4 text-center text-[12px] text-[#6f6565]">
                              No sizes yet. Add at least one size above.
                            </td>
                          </tr>
                        )}
                        {form.sizes.map((s) => {
                          const row = form.sizeChart.find((r) => r.size === s);
                          return (
                            <tr key={s} className="border-t border-[#DFCBB3]">
                              <td className="px-2 py-1.5 font-semibold text-[#332B2B] sm:px-3">{s}</td>
                              {(["bust", "waist", "hip"] as const).map((field) => (
                                <td key={field} className="px-1.5 py-1.5 sm:px-2">
                                  <input
                                    inputMode="decimal"
                                    className={`${inputCls} !w-16 !px-2 !py-1.5 text-[13px] sm:!w-20 sm:!px-3`}
                                    value={row?.[field] ?? ""}
                                    onChange={(e) => setChartCell(s, field, e.target.value)}
                                    placeholder="in"
                                  />
                                </td>
                              ))}
                              <td className="px-1.5 py-1.5 sm:px-2">
                                <input
                                  type="checkbox"
                                  checked={form.soldOutSizes.includes(s)}
                                  onChange={() => toggleSoldOutSize(s)}
                                  aria-label={`Mark size ${s} as sold out`}
                                  className="h-4 w-4 accent-[#B20947]"
                                />
                              </td>
                              <td className="px-1.5 py-1.5 sm:px-2">
                                <button
                                  type="button"
                                  onClick={() => removeSize(s)}
                                  aria-label={`Remove size ${s}`}
                                  className="rounded-full border border-[#F9E3E9] bg-[#FFF5F7] p-1.5 text-[#B20947] hover:bg-[#F9E3E9]"
                                >
                                  <X size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-[13px] font-medium text-[#332B2B]">
                    Product Description
                  </span>
                  <textarea
                    rows={2}
                    className={inputCls}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the embroidery, silhouette, and occasion..."
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[13px] font-medium text-[#332B2B]">Fabric</span>
                  <input
                    className={inputCls}
                    value={form.fabric}
                    onChange={(e) => setForm({ ...form, fabric: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[13px] font-medium text-[#332B2B]">Fit</span>
                  <input
                    className={inputCls}
                    value={form.fit}
                    onChange={(e) => setForm({ ...form, fit: e.target.value })}
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className={`${outlineBtn} w-full sm:w-auto`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${solidBtn} w-full sm:w-auto ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""}`}
                >
                  {isSubmitting ? "Uploading & Saving..." : form.id ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminShell>
  );
}