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
export const DELETED_COUPONS_KEY = "izha_deleted_coupons";

export function readDeletedCoupons(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_COUPONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordDeletedCoupon(idOrCode: string) {
  if (typeof window === "undefined") return;
  const current = readDeletedCoupons();
  const next = current.includes(idOrCode) ? current : [...current, idOrCode];
  try {
    localStorage.setItem(DELETED_COUPONS_KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: DELETED_COUPONS_KEY }));
}

/** Resolves an account-specific storage key for the shopping cart */
export function getAccountCartKey(): string {
  if (typeof window === "undefined") return "cart_guest";

  try {
    // 1. Check active admin session
    const adminToken = localStorage.getItem("izha_admin_token");
    const adminUserRaw = localStorage.getItem("izha_admin_user");
    if (adminToken && adminUserRaw) {
      const adminUser = JSON.parse(adminUserRaw);
      const adminId = adminUser.id || adminUser.email || "admin";
      return `cart_admin_${adminId}`;
    }

    // 2. Check standard authenticated user
    const token = localStorage.getItem(KEYS.token);
    const userRaw = localStorage.getItem(KEYS.user);
    if (token && userRaw) {
      const user = JSON.parse(userRaw);
      const isAdm =
        user.role === "admin" ||
        user.role === "SUPER_ADMIN" ||
        user.role === "SECONDARY_ADMIN" ||
        user.isAdmin === true;
      if (isAdm) {
        const adminId = user.id || user.email || "admin";
        return `cart_admin_${adminId}`;
      } else {
        const customerId = user.id || user.email || user.phone || "customer";
        return `cart_customer_${customerId}`;
      }
    }
  } catch (_) {}

  return "cart_guest";
}

/** Resolves an account-specific storage key for customer saved addresses */
export function getAccountAddressKey(user?: AppUser | null): string | null {
  if (!user) return null;
  const isAdm =
    user.role === "admin" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "SECONDARY_ADMIN" ||
    user.isAdmin === true;
  if (isAdm) return null; // Admins do not have customer saved addresses
  const customerId = user.id || user.email || user.phone || "customer";
  return `addresses_customer_${customerId}`;
}

/** Direct helper to retrieve the active account's cart */
export function getStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getAccountCartKey();
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Direct helper to save the active account's cart */
export function saveStoredCart(cart: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const key = getAccountCartKey();
    localStorage.setItem(key, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: KEYS.cart }));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: key }));
  } catch (_) {}
}

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

/** localStorage-backed state. `ready` turns true after the first read.
 * Automatically scopes cart to the authenticated account ID. */
export function useStored<T>(key: string, initial: T) {
  const getActiveKey = () => (key === KEYS.cart ? getAccountCartKey() : key);

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
      if (key === KEYS.coupons && Array.isArray(parsed)) {
        const deletedCoupons = readDeletedCoupons();
        if (deletedCoupons.length > 0) {
          return parsed.filter(
            (c: any) => c && !deletedCoupons.includes(String(c.id)) && !deletedCoupons.includes(String(c.code))
          ) as unknown as T;
        }
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
    let currentKey = getActiveKey();

    const read = () => {
      if (!active) return;
      currentKey = getActiveKey();
      try {
        const raw = localStorage.getItem(currentKey);
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
      if (
        e.key === currentKey ||
        e.key === key ||
        (key === KEYS.cart && (e.key?.startsWith("cart_") || e.key === KEYS.user || e.key === KEYS.token))
      ) {
        read();
      }
    };

    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (
        detail === currentKey ||
        detail === key ||
        (key === KEYS.cart && (detail?.startsWith("cart_") || detail === KEYS.user || detail === KEYS.token))
      ) {
        read();
      }
    };

    const onAccountChange = () => {
      // Immediate reload when account switches / logs in / logs out
      lastRaw.current = null;
      read();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(SYNC_EVENT, onSync);
    window.addEventListener("izha-account-change", onAccountChange);

    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SYNC_EVENT, onSync);
      window.removeEventListener("izha-account-change", onAccountChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    const targetKey = getActiveKey();
    try {
      const raw = value === null ? null : JSON.stringify(value);
      if (raw === lastRaw.current) return; // nothing new to save
      lastRaw.current = raw;
      if (raw === null) localStorage.removeItem(targetKey);
      else localStorage.setItem(targetKey, raw);
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: key }));
      if (targetKey !== key) {
        window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: targetKey }));
      }
    } catch (err: any) {
      if (err?.name === "QuotaExceededError" || err?.code === 22 || err?.number === -2147024882) {
        try {
          // Prune non-essential large catalog cache to ensure user cart, token & order flow work
          localStorage.removeItem(KEYS.adminProducts);
          const raw = value === null ? null : JSON.stringify(value);
          if (raw !== null) {
            localStorage.setItem(targetKey, raw);
            window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: key }));
            if (targetKey !== key) {
              window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: targetKey }));
            }
          }
        } catch (_) {}
      }
    }
  }, [key, value, ready]);

  return [value, setValue, ready] as const;
}