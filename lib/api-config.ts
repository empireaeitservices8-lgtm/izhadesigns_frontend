/**
 * Centralized API Configuration for Izha Designs
 * 
 * Provides unified URL generation for all backend requests,
 * ensuring requests reach the Render backend in production
 * and the local Express backend (port 5000) during development.
 */

export function getApiBaseUrl(): string {
  // 1. Explicit NEXT_PUBLIC_API_URL from environment variable
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    const clean = envUrl.replace(/\/+$/, "");
    return clean.endsWith("/api") ? clean : `${clean}/api`;
  }

  // 2. Browser runtime: if running on production (Vercel or custom domain), use Render backend
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return "https://izhadesigns-backend.onrender.com/api";
    }
  }

  // 3. Fallback: Local Express backend
  return "http://127.0.0.1:5000/api";
}

/**
 * Builds an absolute API URL for any given endpoint.
 * Prevents duplicate '/api' segments.
 *
 * Examples:
 *   apiUrl("/api/products")               => "https://izhadesigns-backend.onrender.com/api/products"
 *   apiUrl("/products")                   => "https://izhadesigns-backend.onrender.com/api/products"
 *   apiUrl("/api/orders?admin=true")      => "https://izhadesigns-backend.onrender.com/api/orders?admin=true"
 *   apiUrl("/api/products/p123")          => "https://izhadesigns-backend.onrender.com/api/products/p123"
 */
export function apiUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const base = getApiBaseUrl();
  // Strip leading slashes and any leading 'api/' or 'api'
  const clean = endpoint.replace(/^\/+/, "").replace(/^api\/?/i, "");
  return clean ? `${base}/${clean}` : base;
}

/**
 * Unified auth headers helper that retrieves either admin or customer JWT token.
 */
export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    ...customHeaders,
  };

  if (typeof window !== "undefined") {
    const adminToken = localStorage.getItem("izha_admin_token");
    const userToken = localStorage.getItem("izha_auth_token") || localStorage.getItem("token");
    const token = adminToken || userToken;
    if (token && !headers["Authorization"] && !headers["authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}
