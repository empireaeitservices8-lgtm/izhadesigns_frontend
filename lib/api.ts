"use client";

import { KEYS } from "@/lib/izha-store";
import { apiUrl, getApiBaseUrl, getAuthHeaders } from "@/lib/api-config";

export { apiUrl, getApiBaseUrl, getAuthHeaders };

function getHeaders(customHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (typeof window !== "undefined") {
    const adminToken = localStorage.getItem("izha_admin_token");
    const userToken = localStorage.getItem(KEYS.token) || localStorage.getItem("token");
    const token = adminToken || userToken;
    if (token && !headers["Authorization"] && !headers["authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}

async function request<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  try {
    const url = apiUrl(endpoint);
    const res = await fetch(url, {
      ...options,
      headers: getHeaders(options.headers as Record<string, string>),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        message: json?.message || `Request failed with status ${res.status}`,
      };
    }

    return { success: true, ...json, data: json };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error connecting to backend";
    return {
      success: false,
      message: msg,
    };
  }
}

export const api = {
  // Auth
  auth: {
    register: (payload: { name: string; email?: string; phone?: string; password: string; role?: string }) =>
      request<{ token: string; user: unknown }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    login: (payload: { identifier: string; password: string }) =>
      request<{ token: string; user: unknown }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    me: () => request<{ user: unknown; addresses: unknown[] }>("/auth/me"),

    updateProfile: (payload: { name?: string; phone?: string }) =>
      request<{ user: unknown }>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),

    getAddresses: () => request<{ addresses: unknown[] }>("/auth/addresses"),

    addAddress: (address: unknown) =>
      request<{ id: string }>("/auth/addresses", {
        method: "POST",
        body: JSON.stringify(address),
      }),
  },

  // Products
  products: {
    getAll: (params?: { category?: string; search?: string; sort?: string; isNew?: boolean; limit?: number; page?: number }) => {
      const q = new URLSearchParams();
      if (params?.category) q.set("category", params.category);
      if (params?.search) q.set("search", params.search);
      if (params?.sort) q.set("sort", params.sort);
      if (params?.isNew !== undefined) q.set("isNew", String(params.isNew));
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.page) q.set("page", String(params.page));
      const qs = q.toString();
      return request<{ products: unknown[]; total: number }>(`/products${qs ? `?${qs}` : ""}`);
    },

    getById: (id: string) => request<{ product: unknown }>(`/products/${id}`),

    create: (product: unknown) =>
      request<{ product: unknown }>("/products", {
        method: "POST",
        body: JSON.stringify(product),
      }),

    update: (id: string, product: unknown) =>
      request<{ product: unknown }>(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(product),
      }),

    delete: (id: string) =>
      request(`/products/${id}`, {
        method: "DELETE",
      }),
  },

  // Orders
  orders: {
    getAll: (params?: { search?: string; email?: string; phone?: string }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set("search", params.search);
      if (params?.email) q.set("email", params.email);
      if (params?.phone) q.set("phone", params.phone);
      const qs = q.toString();
      return request<{ orders: unknown[] }>(`/orders${qs ? `?${qs}` : ""}`);
    },

    getById: (id: string) => request<{ order: unknown }>(`/orders/${id}`),

    create: (order: unknown) =>
      request<{ order: unknown }>("/orders", {
        method: "POST",
        body: JSON.stringify(order),
      }),

    updateStatus: (id: string, payload: { status?: string; trackingNumber?: string; paymentStatus?: string }) =>
      request<{ order: unknown }>(`/orders/${id}/status`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
  },

  // Coupons
  coupons: {
    getAll: () => request<{ coupons: unknown[] }>("/coupons"),

    validate: (payload: { code: string; subtotal: number; isFirstOrder?: boolean }) =>
      request<{ coupon: unknown; discount: number }>("/coupons/validate", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    create: (coupon: unknown) =>
      request<{ coupon: unknown }>("/coupons", {
        method: "POST",
        body: JSON.stringify(coupon),
      }),

    update: (id: string, coupon: unknown) =>
      request<{ coupon: unknown }>(`/coupons/${id}`, {
        method: "PUT",
        body: JSON.stringify(coupon),
      }),

    delete: (id: string) =>
      request(`/coupons/${id}`, {
        method: "DELETE",
      }),
  },

  // Reviews
  reviews: {
    getAll: (productId?: string) =>
      request<{ reviews: unknown[] }>(`/reviews${productId ? `?productId=${productId}` : ""}`),

    submit: (review: { productId?: string; name: string; place?: string; rating: number; text: string }) =>
      request<{ review: unknown }>("/reviews", {
        method: "POST",
        body: JSON.stringify(review),
      }),
  },

  // Content (Home & Instagram, About, Categories, etc.)
  content: {
    get: <T = unknown>(key: string) => request<{ key: string; data: T }>(`/content/${key}`),

    update: (key: string, data: unknown) =>
      request(`/content/${key}`, {
        method: "PUT",
        body: JSON.stringify({ data }),
      }),
  },

  // Admin stats
  admin: {
    getStats: () =>
      request<{
        stats: {
          totalOrders: number;
          totalRevenue: number;
          pendingOrders: number;
          totalProducts: number;
          totalCustomers: number;
          recentOrders: unknown[];
        };
      }>("/admin/stats"),
  },
};

