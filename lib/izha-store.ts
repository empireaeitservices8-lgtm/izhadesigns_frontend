"use client";

import { useEffect, useRef, useState } from "react";

export type CartItem = {
  id: string;
  name: string;
  image: string;
  size: string;
  price: number;
  oldPrice?: number;
  qty: number;
};

export type WishItem = {
  id: string;
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  inStock?: boolean; // defaults to true
  soldOutSizes?: string[];
};

export type AppUser = {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role?: "admin" | "customer" | "SUPER_ADMIN" | "SECONDARY_ADMIN" | "CUSTOMER";
  legacyRole?: string;
  isAdmin?: boolean;
  is_super_admin?: boolean;
  can_manage_admins?: boolean;
  is_active?: boolean;
};

export type Address = {
  id: string;
  label: string;
  name: string;
  phone: string;
  line: string;
  city: string;
  state?: string;
  pincode: string;
  isDefault: boolean;
};

export const KEYS = {
  cart: "izha_cart",
  wish: "izha_wishlist",
  user: "izha_user",
  token: "izha_token",
  addresses: "izha_addresses",
  heroSlides: "izha_admin_hero_slides",
  categories: "izha_admin_categories",
  instagramPosts: "izha_admin_instagram_posts",
  about: "izha_admin_about",
  adminProducts: "izha_admin_products",
  coupons: "izha_admin_coupons",
  offers: "izha_admin_offers",
  orders: "izha_admin_orders",
  customers: "izha_admin_customers",
  customerCare: "izha_admin_customer_care",
  adminProfile: "izha_admin_profile",
  deliverySettings: "izha_delivery_settings",
  newTagDurationDays: "izha_new_tag_days",
} as const;

export const SIZES = ["XS", "S", "M", "L", "XL"];

export const DELETED_PRODUCTS_KEY = "izha_deleted_products";

export function readDeletedProducts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_PRODUCTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeDeletedProducts(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(ids));
  } catch {}
}

export function recordDeletedProduct(id: string) {
  if (typeof window === "undefined") return;
  const current = readDeletedProducts();
  const next = current.includes(id) ? current : [...current, id];
  writeDeletedProducts(next);
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: DELETED_PRODUCTS_KEY }));
}

export const inr = (n: number) =>
  "₹" + new Intl.NumberFormat("en-IN").format(n);

/** Browsers only fire "storage" in OTHER tabs, so every hook announces its own
 *  writes with this event. That keeps the Navbar badge, the Wishlist page and
 *  the product hearts in step inside the same tab. */
const SYNC_EVENT = "izha-store-sync";

/** localStorage-backed state. `ready` turns true after the first read. */
export function useStored<T>(key: string, initial: T) {
  const sanitize = (raw: string | null): T => {
    if (!raw) return initial;
    try {
      const parsed = JSON.parse(raw);
      if (key === KEYS.adminProducts && Array.isArray(parsed)) {
        const deleted = readDeletedProducts();
        return parsed.filter(
          (p: any) => p && p.id && !deleted.includes(String(p.id)) && !/^p\d{1,2}$/.test(String(p.id))
        ) as unknown as T;
      }
      return (parsed !== undefined ? parsed : initial) as T;
    } catch {
      return initial;
    }
  };

  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const lastRaw = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const read = () => {
      if (!active) return;
      try {
        const raw = localStorage.getItem(key);
        if (raw === lastRaw.current) return;
        lastRaw.current = raw;
        setValue(sanitize(raw));
      } catch {
        setValue(initial);
      }
    };
    read();
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) read();
    };
    const onSync = (e: Event) => {
      if ((e as CustomEvent<string>).detail === key) read();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(SYNC_EVENT, onSync);
    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SYNC_EVENT, onSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      const raw = value === null ? null : JSON.stringify(value);
      if (raw === lastRaw.current) return; // nothing new to save
      lastRaw.current = raw;
      if (raw === null) localStorage.removeItem(key);
      else localStorage.setItem(key, raw);
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: key }));
    } catch (err: any) {
      if (err?.name === "QuotaExceededError" || err?.code === 22 || err?.number === -2147024882) {
        try {
          // Prune non-essential large catalog cache to ensure user cart, token & order flow work
          localStorage.removeItem(KEYS.adminProducts);
          const raw = value === null ? null : JSON.stringify(value);
          if (raw !== null) {
            localStorage.setItem(key, raw);
            window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: key }));
          }
        } catch (_) {}
      }
    }
  }, [key, value, ready]);

  return [value, setValue, ready] as const;
}