"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Search, Trash2, X } from "lucide-react";
import { KEYS, inr, useStored } from "@/lib/izha-store";
import { DEFAULT_ORDERS, type DemoOrder, type OrderStatus } from "@/lib/demo-store";
import AdminShell, { inputCls, outlineBtn } from "@/components/admin/AdminShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import Pagination from "@/components/izha/Pagination";
import { serif } from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";

const CRIMSON = "#B20947";
const PAGE_SIZE = 10;

/** Pointer (hand) cursor on every button, select and date input inside this page. */
const CURSOR_FIX =
  "[&_button:not(:disabled)]:cursor-pointer [&_select]:cursor-pointer [&_input[type=date]]:cursor-pointer";

/** Status changes made in Order Details that the server has not confirmed yet. */
const STATUS_OVERRIDE_KEY = "izha_order_status_overrides";

/**
 * IDs of deleted orders. An ID stays hidden only while the server still returns it,
 * so a new order that reuses an old ID is never hidden by mistake.
 */
const DELETED_KEY = "izha_deleted_orders";

/** Finds the admin token, whichever key it was saved under. */
function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("izha_admin_token") ||
    localStorage.getItem(KEYS.token) ||
    localStorage.getItem("izha_token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token")
  );
}

function readStatusOverrides(): Record<string, OrderStatus> {
  try {
    const raw = localStorage.getItem(STATUS_OVERRIDE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStatusOverrides(map: Record<string, OrderStatus>) {
  try {
    localStorage.setItem(STATUS_OVERRIDE_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable */
  }
}

function readDeleted(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDeleted(ids: string[]) {
  try {
    localStorage.setItem(DELETED_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable */
  }
}

/** Ask the server to delete an order. Returns true only if the server confirmed. */
async function deleteOnServer(id: string): Promise<boolean> {
  try {
    const token = getAdminToken();
    const res = await fetch(apiUrl(`/orders/${encodeURIComponent(id)}`), {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.ok;
  } catch {
    return false;
  }
}

const STATUSES: ("All" | OrderStatus)[] = [
  "All",
  "Pending",
  "Order Placed",
  "Confirmed",
  "Processing",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const BADGE: Record<string, string> = {
  Pending: "bg-[#FFF5F7] text-[#B20947]",
  "Order Placed": "bg-[#FFF5F7] text-[#B20947]",
  Confirmed: "bg-[#F9E3E9] text-[#8F3057]",
  Processing: "bg-[#FFF5F7] text-[#B20947]",
  Packed: "bg-[#F9E3E9] text-[#8F3057]",
  Shipped: "bg-[#eef4ff] text-[#2b529a]",
  "Out for Delivery": "bg-[#fef9ee] text-[#8f6213]",
  Delivered: "bg-[#eef7f0] text-[#3a6b42]",
  Cancelled: "bg-[#f3efef] text-[#6f6565]",
  Failed: "bg-[#fcedea] text-[#b33927]",
};

/** Local date as YYYY-MM-DD (same format the <input type="date"> gives). */
function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Turns an order's createdAt text into YYYY-MM-DD.
 * Handles ISO strings, "13 Nov 2026, 10:44 AM" and "13/11/2026" (day first).
 * Returns "" if the text cannot be understood.
 */
function orderDateKey(createdAt: string): string {
  if (!createdAt) return "";
  const t = Date.parse(createdAt);
  if (!Number.isNaN(t)) {
    return ymd(new Date(t));
  }
  const cleaned = createdAt.replace(/(\bat\b|\bIST\b|,.*)/gi, "").trim();
  const t2 = Date.parse(cleaned);
  if (!Number.isNaN(t2)) {
    return ymd(new Date(t2));
  }
  const dmy = createdAt.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return "";
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
    <div className="h-full rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 transition-colors hover:border-[#B20947]/40 sm:p-6">
      <p className="m-0 text-[10px] uppercase tracking-[0.15em] text-black/50 sm:text-[11px] sm:tracking-[0.25em]">
        {label}
      </p>
      <p
        className={`${serif} lining-nums mb-0 mt-3 break-words font-medium leading-none sm:mt-4 ${value.startsWith("₹") ? "text-[24px] sm:text-[34px]" : "text-[32px] sm:text-[46px]"
          }`}
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

export default function AdminOrdersPage() {
  const [allOrders, setOrders] = useState<DemoOrder[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEYS.orders);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((o: any) => !String(o.id).startsWith("IZB-100")) : [];
    } catch {
      return [];
    }
  });
  const [statusFilter, setStatusFilter] = useState<"All" | OrderStatus>("All");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);

  // IDs of deleted orders (loaded from this browser on mount)
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  // Order waiting for delete confirmation (null = alert box closed)
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setDeletedIds(readDeleted());
  }, []);

  // All orders from server and storage
  const orders = allOrders;

  const loadOrders = async () => {
    const token = getAdminToken();
    try {
      const res = await fetch(apiUrl(`/orders?admin=true&_=${Date.now()}`), {
        cache: "no-store",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-admin-request": "true",
        },
      });
      const data = await res.json().catch(() => null);
      console.log("ADMIN ORDERS:", res.status, data);

      const list = Array.isArray(data?.orders)
        ? data.orders
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : null;

      if (!res.ok || !list) {
        setLoadError(`Could not load orders (status ${res.status}). ${data?.message || ""}`);
        return;
      }
      setLoadError(null);

      // Status changes made in Order Details that the server has not confirmed yet
      const overrides = readStatusOverrides();
      let overridesChanged = false;

      const mapped: DemoOrder[] = list.map((bo: any) => {
        const id = bo.orderNumber || bo.id || bo._id;
        let status = bo.status || "Pending";
        if (overrides[id]) {
          if (overrides[id] === bo.status) {
            delete overrides[id];
            overridesChanged = true;
          } else {
            status = overrides[id];
          }
        }

        const d = bo.createdAt ? new Date(bo.createdAt) : null;
        const formattedDate =
          d && !isNaN(d.getTime())
            ? d.toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }) + " IST"
            : "Recent";

        return {
          id,
          createdAt: formattedDate,
          rawCreatedAt: bo.createdAt,
          customerId: bo.customerEmail || bo.customerPhone || "customer",
          customerName: bo.customerName || "Customer",
          customerPhone: bo.customerPhone || "",
          customerEmail: bo.customerEmail || "",
          address: bo.shippingAddress?.line || bo.shippingAddress?.address || "",
          city: bo.shippingAddress?.city || "Kerala",
          state: bo.shippingAddress?.state || "Kerala",
          pincode: bo.shippingAddress?.pincode || "",
          items: Array.isArray(bo.items) ? bo.items : [],
          subtotal: Number(bo.subtotal) || 0,
          discount: Number(bo.discount) || 0,
          shipping: Number(bo.shippingFee) || 0,
          total: Number(bo.total) || 0,
          paymentMethod: bo.paymentMethod || "COD",
          paymentStatus: bo.paymentStatus || "Pending",
          status,
          source: "Direct",
        } as DemoOrder;
      });

      if (overridesChanged) writeStatusOverrides(overrides);

      // Keep an ID hidden only while the server still returns it (delete failed).
      // If the server no longer has it, remove it from the hidden list.
      const serverIds = new Set(mapped.map((o) => o.id));
      const hidden = readDeleted();
      const stillHidden = hidden.filter((id) => serverIds.has(id));
      if (stillHidden.length !== hidden.length) {
        writeDeleted(stillHidden);
        setDeletedIds(stillHidden);
      }

      setOrders(mapped);
      try {
        localStorage.setItem(KEYS.orders, JSON.stringify(mapped));
      } catch (_) { }
    } catch (err) {
      console.error("Admin orders load failed:", err);
      setLoadError("Could not reach the server.");
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 8000);
    window.addEventListener("izha-store-sync", loadOrders);
    window.addEventListener("storage", loadOrders);
    return () => {
      clearInterval(interval);
      window.removeEventListener("izha-store-sync", loadOrders);
      window.removeEventListener("storage", loadOrders);
    };
  }, []);

  /** Runs after the person presses Delete in the alert box. */
  const confirmDelete = async () => {
    if (!confirmId || deleting) return;
    const id = confirmId;
    setDeleting(true);

    // Hide it at once, so the list changes without waiting for the server
    const next = readDeleted().includes(id) ? readDeleted() : [...readDeleted(), id];
    writeDeleted(next);
    setDeletedIds(next);

    const overrides = readStatusOverrides();
    if (overrides[id]) {
      delete overrides[id];
      writeStatusOverrides(overrides);
    }

    setOrders((prev) => prev.filter((o) => o.id !== id));

    // Tell the server too. If it confirms, the ID no longer needs to stay hidden.
    const ok = await deleteOnServer(id);
    if (ok) {
      const cleaned = readDeleted().filter((x) => x !== id);
      writeDeleted(cleaned);
      setDeletedIds(cleaned);
    }

    setDeleting(false);
    setConfirmId(null);
  };

  const dateFilterOn = fromDate !== "" || toDate !== "";

  // Quick presets run on click (never during render), so the build stays safe.
  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setFromDate(ymd(start));
    setToDate(ymd(end));
  };

  const clearDates = () => {
    setFromDate("");
    setToDate("");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "All") {
        if (statusFilter === "Pending") {
          const normStatus = (o.status || "").toLowerCase();
          const isPendingOrder =
            normStatus === "pending" ||
            normStatus === "order placed" ||
            normStatus === "confirmed" ||
            normStatus === "processing" ||
            normStatus === "packed" ||
            (normStatus !== "delivered" && normStatus !== "cancelled" && normStatus !== "failed");
          if (!isPendingOrder) return false;
        } else if (o.status !== statusFilter) {
          return false;
        }
      }

      if (dateFilterOn) {
        const key = orderDateKey(o.rawCreatedAt || o.createdAt);
        if (!key) return false;
        if (fromDate && key < fromDate) return false;
        if (toDate && key > toDate) return false;
      }

      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.pincode.includes(q)
      );
    });
  }, [orders, statusFilter, search, fromDate, toDate, dateFilterOn]);

  const filteredTotal = filtered.reduce((sum, o) => sum + o.total, 0);

  // Go back to page 1 when the search or any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, fromDate, toDate]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Keep the page number valid (for example after the list gets shorter)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  return (
    <AdminShell title="Orders">
      <div className={`${CURSOR_FIX} w-full min-w-0`}>
        {/* Heading block */}
        <h2
          className={`${serif} mb-2 mt-0 break-words font-medium leading-tight`}
          style={{ color: CRIMSON, fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
        >
          Orders
        </h2>
        <p className="mb-6 mt-0 text-[14px] text-black/60 sm:text-[15px] md:mb-10">
          Click any order to view full payment, delivery, and product details, or click a customer name
        </p>

        {/* Load error (shows the real reason if orders cannot be loaded) */}
        {loadError && (
          <div className="mb-4 rounded-sm border border-[#B20947]/40 bg-[#FFF5F7] p-3 text-[13px] text-[#B20947]">
            {loadError}
          </div>
        )}

        {/* Counts: two per row on phones */}
        <section aria-label="Order counts" className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatCard label="Orders" value={String(orders.length)} note="All orders" />
          <StatCard label="Showing" value={String(filtered.length)} note="Matching your filters" />
        </section>

        {/* Total value: full width on phones because the amount is wide */}
        <section aria-label="Order value" className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4">
          <StatCard label="Total value" value={inr(filteredTotal)} note="Of the orders showing" />
        </section>

        {/* Filters */}
        <div className="mt-4 sm:mt-6">
          <Panel title="Search & filter" note="By order ID, customer, city, PIN, status or date">
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
                  placeholder="Search by order ID, customer, city or PIN..."
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors sm:px-3.5 sm:text-[12px] ${statusFilter === s
                      ? "border-[#B20947] bg-[#F8EAE4] text-[#B20947]"
                      : "border-[#E8B8C5] bg-[#FAF3E8] text-[#332B2B] hover:border-[#B20947]"
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Date filter */}
            <div className="mt-4 flex flex-col gap-3 border-t border-black/5 pt-4 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="grid grid-cols-2 gap-3 lg:flex lg:gap-3">
                <label className="block min-w-0">
                  <span className="mb-1 flex items-center gap-1 text-[12px] font-medium text-[#332B2B]">
                    <CalendarDays size={13} /> From
                  </span>
                  <input
                    type="date"
                    className={`${inputCls} !py-2 text-[13px]`}
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1 flex items-center gap-1 text-[12px] font-medium text-[#332B2B]">
                    <CalendarDays size={13} /> To
                  </span>
                  <input
                    type="date"
                    className={`${inputCls} !py-2 text-[13px]`}
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
                <button type="button" onClick={() => setPreset(1)} className={`${outlineBtn} justify-center`}>
                  Today
                </button>
                <button type="button" onClick={() => setPreset(7)} className={`${outlineBtn} justify-center`}>
                  Last 7 days
                </button>
                <button type="button" onClick={() => setPreset(30)} className={`${outlineBtn} justify-center`}>
                  Last 30 days
                </button>
                {dateFilterOn && (
                  <button type="button" onClick={clearDates} className={`${outlineBtn} justify-center gap-1.5`}>
                    <X size={13} /> Clear dates
                  </button>
                )}
              </div>
            </div>
          </Panel>
        </div>

        {/* Order list */}
        <div className="mt-3 sm:mt-4">
          <Panel
            title="All orders"
            note={`${filtered.length} of ${orders.length} ${orders.length === 1 ? "order" : "orders"}`}
          >
            {filtered.length === 0 ? (
              <p className="m-0 text-[14px] text-black/55">No orders found for these filters.</p>
            ) : (
              <>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {paginatedOrders.map((ord) => (
                    <li
                      key={ord.id}
                      className="flex min-w-0 flex-col gap-4 rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/orders/details?id=${encodeURIComponent(ord.id)}`}
                            className="lining-nums min-w-0 break-all text-[15px] font-semibold underline underline-offset-4 sm:text-[16px]"
                            style={{ color: CRIMSON }}
                          >
                            {ord.id}
                          </Link>
                          <span
                            className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${BADGE[ord.status] ?? "bg-[#FFF5F7] text-[#332B2B]"
                              }`}
                          >
                            {ord.status}
                          </span>
                        </div>

                        <p className="m-0 mt-2 break-words text-[14px] text-[#332B2B]">
                          Customer:{" "}
                          <Link
                            href={`/admin/customers/details?id=${encodeURIComponent(ord.customerId)}`}
                            className="font-semibold underline decoration-[#E8B8C5] underline-offset-4 hover:text-[#8F3057]"
                            style={{ color: CRIMSON }}
                          >
                            {ord.customerName}
                          </Link>{" "}
                          <span className="lining-nums block text-black/55 sm:inline">
                            <span className="hidden sm:inline">· </span>+91 {ord.customerPhone}
                          </span>
                        </p>

                        <p className="lining-nums m-0 mt-1 break-words text-[13px] leading-relaxed text-black/55">
                          When: {ord.createdAt} · Where: {ord.city}, {ord.state} ({ord.pincode}) ·{" "}
                          {ord.items.length} {ord.items.length === 1 ? "item" : "items"} ·{" "}
                          {ord.paymentMethod} ({ord.paymentStatus})
                        </p>
                      </div>

                      <div className="flex w-full flex-col gap-3 border-t border-black/5 pt-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:border-t-0 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <p className="lining-nums m-0 text-[18px] font-semibold text-[#332B2B]">
                            {inr(ord.total)}
                          </p>
                          {ord.couponCode && (
                            <p className="m-0 text-[11px] text-[#5f7a62]">Coupon: {ord.couponCode}</p>
                          )}
                        </div>
                        <Link
                          href={`/admin/orders/details?id=${encodeURIComponent(ord.id)}`}
                          className={`${outlineBtn} w-full shrink-0 cursor-pointer justify-center gap-1.5 sm:w-auto`}
                        >
                          Order Details <ArrowRight size={14} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmId(ord.id)}
                          aria-label={`Delete order ${ord.id}`}
                          title="Delete order"
                          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm border border-[#B20947]/40 px-3 py-2 text-[12px] font-semibold text-[#B20947] transition-colors hover:bg-[#B20947] hover:text-white"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

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
      </div>

      {/* Delete confirmation alert box */}
      <ConfirmDialog
        open={confirmId !== null}
        title="Delete this order?"
        message={
          <>
            Order <strong className="lining-nums">{confirmId}</strong> will be permanently removed.
            This cannot be undone.
          </>
        }
        confirmLabel="Delete Order"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </AdminShell>
  );
}