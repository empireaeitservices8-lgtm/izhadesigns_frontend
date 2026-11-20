// Call trackEvent() from the CUSTOMER site to record visits and funnel steps.
// The admin Reports page reads these events.
import { apiUrl } from "@/lib/api-config";

export const VISIT_EVENTS_KEY = "izha-visit-events";

export type StageType =
  | "visit"
  | "product_view"
  | "add_to_cart"
  | "checkout_start"
  | "order_placed";

export const STAGES: { type: StageType; label: string }[] = [
  { type: "visit", label: "Visited site" },
  { type: "product_view", label: "Viewed a product" },
  { type: "add_to_cart", label: "Added to cart" },
  { type: "checkout_start", label: "Started checkout" },
  { type: "order_placed", label: "Placed order" },
];

export type VisitEvent = {
  id: string;
  sessionId: string;
  type: StageType;
  at: string; // ISO date
  page?: string;
  productName?: string;
  customerName?: string;
};

function getActiveUserIdentifier(): string {
  if (typeof window === "undefined") return "guest";
  try {
    const rawUser = localStorage.getItem("izha_user");
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u) {
        return (u.id || u.email || u.phone || "user").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      }
    }
  } catch (_) {}
  return "guest";
}

export function resetSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("izha-session-id");
    sessionStorage.removeItem("izha-session-user");
  } catch (_) {}
}

export function sessionId(): string {
  if (typeof window === "undefined") return "s-unknown";
  try {
    const currentUser = getActiveUserIdentifier();
    const storedUser = sessionStorage.getItem("izha-session-user");
    let id = sessionStorage.getItem("izha-session-id");

    // If user changed (e.g. logged in or logged out), reset session so journeys are never blended
    if (!id || storedUser !== currentUser) {
      id = `s-${currentUser}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("izha-session-id", id);
      sessionStorage.setItem("izha-session-user", currentUser);
    }
    return id;
  } catch {
    return "s-unknown";
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("izha-account-change", () => {
    resetSession();
  });
}

export function readEvents(): VisitEvent[] {
  try {
    const raw = localStorage.getItem(VISIT_EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeEvents(list: VisitEvent[]) {
  try {
    localStorage.setItem(VISIT_EVENTS_KEY, JSON.stringify(list.slice(-5000)));
    window.dispatchEvent(new Event("izha-visit-events-changed"));
  } catch {
    /* storage full or blocked: ignore */
  }
}

export function trackEvent(
  type: StageType,
  meta: Partial<Pick<VisitEvent, "page" | "productName" | "customerName">> = {}
) {
  if (typeof window === "undefined") return;

  let customerName = meta.customerName;
  if (!customerName) {
    try {
      const rawUser = localStorage.getItem("izha_user");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u && (u.name || u.email || u.phone)) {
          customerName = u.name || u.email || u.phone;
        }
      }
    } catch (_) {}
  }

  const list = readEvents();
  const event: VisitEvent = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sessionId: sessionId(),
    type,
    at: new Date().toISOString(),
    page: meta.page ?? window.location.pathname,
    productName: meta.productName,
    customerName,
  };
  list.push(event);
  writeEvents(list);

  try {
    fetch(apiUrl("/visits"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }).catch(() => {});
  } catch {
    // Ignore network errors
  }
}