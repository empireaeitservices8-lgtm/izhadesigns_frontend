"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Search, UserStar } from "lucide-react";
import { KEYS, inr } from "@/lib/izha-store";
import {
  type DemoCustomer,
  type DemoOrder,
} from "@/lib/demo-store";
import AdminShell, { inputCls, outlineBtn } from "@/components/admin/AdminShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import Pagination from "@/components/izha/Pagination";
import { serif } from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";

const CRIMSON = "#B20947";
const PAGE_SIZE = 10;

type StatusFilter = "All" | "Active" | "Inactive";

/** Pointer (hand) cursor on every button and select inside this page. */
const CURSOR_FIX = "[&_button:not(:disabled)]:cursor-pointer [&_select]:cursor-pointer";

const DELETE_BTN =
  "inline-flex cursor-pointer items-center justify-center rounded-sm border border-[#B20947]/40 bg-[#FFF5F7] px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#B20947] transition-colors hover:bg-[#F9E3E9]";

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

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<DemoCustomer[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEYS.customers);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Customer waiting for delete confirmation (null = alert box closed)
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null);

  const loadCustomers = useCallback(async () => {
    try {
      const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
      const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);
      const res = await fetch(apiUrl("/admin/customers"), {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-admin-request": "true",
        },
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.customers)) {
        setCustomers(data.customers);
        try {
          localStorage.setItem(KEYS.customers, JSON.stringify(data.customers));
        } catch (_) {}
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
    window.addEventListener("izha-store-sync", loadCustomers);
    return () => window.removeEventListener("izha-store-sync", loadCustomers);
  }, [loadCustomers]);

  const activeCount = useMemo(
    () => customers.filter((c) => (c.status ?? "Active") === "Active").length,
    [customers]
  );

  const toggleStatus = async (id: string) => {
    const cust = customers.find((c) => c.id === id);
    if (!cust) return;
    const newStatus = (cust.status ?? "Active") === "Active" ? "Inactive" : "Active";
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null;
      await fetch(apiUrl(`/admin/customers/${encodeURIComponent(id)}/status`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ active: newStatus === "Active" }),
      });
      window.dispatchEvent(new Event("izha-store-sync"));
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  /** Runs after the person presses Delete in the alert box. */
  const confirmDelete = async () => {
    if (!confirmTarget) return;
    const { id } = confirmTarget;
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setConfirmTarget(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null;
      await fetch(apiUrl(`/admin/customers/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      window.dispatchEvent(new Event("izha-store-sync"));
    } catch (err) {
      console.error("Failed to delete customer:", err);
    }
  };

  const statsMap = useMemo(() => {
    const map = new Map<string, { count: number; spent: number }>();
    for (const c of customers) {
      map.set(c.id, {
        count: c.ordersCount ?? (Array.isArray(c.orders) ? c.orders.length : 0),
        spent: c.totalSpent ?? 0,
      });
    }
    return map;
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter !== "All" && (c.status ?? "Active") !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      );
    });
  }, [customers, search, statusFilter]);

  // Go back to page 1 when the search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Keep the page number valid (for example after a delete makes the list shorter)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  return (
    <AdminShell
      title="Customers"
      actions={
        <>
          <Link
            href="/admin/reports"
            className={`${outlineBtn} cursor-pointer gap-2 !bg-[#FAF3E8] hover:!bg-[#F3E2CE]`}
          >
            <BarChart3 size={15} />
            Customer Track
          </Link>
          <Link
            href="/admin/reviews"
            className={`${outlineBtn} cursor-pointer gap-2 !bg-[#FAF3E8] hover:!bg-[#F3E2CE]`}
          >
            <UserStar size={15} />
            Customer Reviews
          </Link>
        </>
      }
    >
      <div className={`${CURSOR_FIX} w-full min-w-0`}>
        {/* Heading block */}
        <h2
          className={`${serif} mb-2 mt-0 break-words font-medium leading-tight`}
          style={{ color: CRIMSON, fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
        >
          Customers
        </h2>
        <p className="mb-4 mt-0 text-[14px] text-black/60 sm:text-[15px] md:mb-6">
          Click any customer name to view their complete profile, saved addresses &amp; order history
        </p>

        {/* Quick Navigation: Customer Track & Customer Reviews */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/admin/reports"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#B20947] transition-all hover:border-[#B20947]/50 hover:bg-[#F3E2CE]"
          >
            <BarChart3 size={16} />
            Customer Track
            <ArrowRight size={14} className="text-[#8F3057]" />
          </Link>
          <Link
            href="/admin/reviews"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#B20947] transition-all hover:border-[#B20947]/50 hover:bg-[#F3E2CE]"
          >
            <UserStar size={16} />
            Customer Reviews
            <ArrowRight size={14} className="text-[#8F3057]" />
          </Link>
        </div>

        {/* Counts: two per row on phones */}
        <section aria-label="Customer counts" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
          <StatCard label="Customers" value={String(customers.length)} note="Registered accounts" />
          <StatCard label="Active" value={String(activeCount)} note="Can log in and order" />
          <StatCard label="Showing" value={String(filtered.length)} note="Matching your filters" />
        </section>

        {/* Search */}
        <div className="mt-4 sm:mt-6">
          <Panel title="Search" note="By name, mobile, email or city">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F3057]"
              />
              <input
                className={`${inputCls} !pl-10`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers by name, mobile, email or city..."
              />
            </div>
            <select
              className={`${inputCls} mt-3 sm:max-w-[220px]`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filter customers by status"
            >
              <option value="All">All customers</option>
              <option value="Active">Active only</option>
              <option value="Inactive">Inactive only</option>
            </select>
          </Panel>
        </div>

        {/* Customer list */}
        <div className="mt-3 sm:mt-4">
          <Panel
            title="All customers"
            note={`${filtered.length} of ${customers.length} ${customers.length === 1 ? "customer" : "customers"}`}
          >
            {filtered.length === 0 ? (
              <p className="m-0 text-[14px] text-black/55">No customers found.</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {paginatedCustomers.map((cust) => {
                    const stat = statsMap.get(cust.id) ?? { count: 0, spent: 0 };
                    const isActive = (cust.status ?? "Active") === "Active";
                    return (
                      <div
                        key={cust.id}
                        className={`flex min-w-0 flex-col justify-between rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-4 sm:p-5 ${
                          isActive ? "" : "opacity-80"
                        }`}
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/admin/customers/details?id=${encodeURIComponent(cust.id)}`}
                            className={`${serif} block cursor-pointer break-words text-[22px] font-semibold underline decoration-[#E8B8C5] underline-offset-4 hover:opacity-80`}
                            style={{ color: CRIMSON }}
                          >
                            {cust.name}
                          </Link>
                          <span
                            className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                              isActive ? "bg-[#eef7f0] text-[#3a6b42]" : "bg-[#f3efef] text-[#6f6565]"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                          <p className="lining-nums m-0 mt-2 text-[13px] text-[#332B2B]">+91 {cust.phone}</p>
                          <p className="m-0 truncate text-[13px] text-black/55">{cust.email}</p>
                          <p className="lining-nums m-0 mt-1 text-[13px] text-black/55">
                            {cust.city}, {cust.state} · {cust.pincode}
                          </p>
                        </div>

                        <div className="mt-4 border-t border-black/5 pt-3">
                          <div className="mb-3">
                            <p className="lining-nums m-0 text-[15px] font-semibold text-[#332B2B]">
                              {inr(stat.spent)}
                            </p>
                            <p className="lining-nums m-0 text-[11px] text-black/55">
                              {stat.count} {stat.count === 1 ? "order" : "orders"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/customers/details?id=${encodeURIComponent(cust.id)}`}
                              className={`${outlineBtn} cursor-pointer gap-1.5`}
                            >
                              View <ArrowRight size={14} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => toggleStatus(cust.id)}
                              className={`${outlineBtn} cursor-pointer`}
                            >
                              {isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmTarget({ id: cust.id, name: cust.name })}
                              className={DELETE_BTN}
                            >
                              Delete
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
      </div>

      {/* Delete confirmation alert box */}
      <ConfirmDialog
        open={confirmTarget !== null}
        title="Delete this customer?"
        message={
          <>
            <strong>{confirmTarget?.name}</strong> will be permanently removed. This cannot be
            undone.
          </>
        }
        confirmLabel="Delete Customer"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </AdminShell>
  );
}