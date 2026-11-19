"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Download,
  Eye,
  LogOut,
  Search,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import AdminShell, { inputCls, outlineBtn } from "@/components/admin/AdminShell";
import { serif } from "@/components/izha/ui";
import { STAGES, type StageType, type VisitEvent } from "@/lib/visit-tracker";
import { KEYS, inr } from "@/lib/izha-store";

const CRIMSON = "#B20947";

type Range = "7" | "30" | "all";

type SessionRow = {
  sessionId: string;
  customerName: string;
  firstSeen: string;
  lastSeen: string;
  lastPage: string;
  lastProduct: string;
  reached: number; // index of furthest stage
  converted: boolean;
};

type CustomerReportRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string;
  joinedAt: string;
};

const stageIndex = (t: StageType) => STAGES.findIndex((s) => s.type === t);

const fmt = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Reads one row from the database, accepting both camelCase and snake_case fields. */
function normalizeEvent(r: any): VisitEvent | null {
  if (!r || typeof r !== "object") return null;
  const sessionId = r.sessionId ?? r.session_id;
  const type = r.type ?? r.stage ?? r.event_type;
  const at = r.at ?? r.created_at ?? r.createdAt;
  if (!sessionId || !type || !at) return null;
  return {
    id: String(r.id ?? `${sessionId}-${type}-${at}`),
    sessionId: String(sessionId),
    type,
    at: new Date(at).toISOString(),
    page: r.page ?? r.path ?? undefined,
    productName: r.productName ?? r.product_name ?? undefined,
    customerName: r.customerName ?? r.customer_name ?? undefined,
  } as VisitEvent;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ---------- Layout pieces (same structure as the dashboard) ---------- */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="h-full min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 transition-colors hover:border-[#B20947]/40 sm:p-6">
      <p className="m-0 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-black/50 sm:text-[11px] sm:tracking-[0.25em]">
        {icon} {label}
      </p>
      <p
        className={`${serif} lining-nums mb-0 mt-3 break-words text-[24px] font-medium leading-none sm:mt-4 sm:text-[38px]`}
        style={{ color: CRIMSON }}
      >
        {value}
      </p>
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
      <h2 className={`${serif} m-0 break-words text-[20px] font-medium sm:text-[26px]`} style={{ color: CRIMSON }}>
        {title}
      </h2>
      {note && <p className="mb-0 mt-1 text-[12px] text-black/45">{note}</p>}
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<"customers" | "funnel">("customers");
  const [events, setEvents] = useState<VisitEvent[]>([]);
  const [customers, setCustomers] = useState<CustomerReportRow[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [range, setRange] = useState<Range>("30");
  const [onlyDropped, setOnlyDropped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);

  const getAdminToken = () => {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("izha_admin_token") ||
      localStorage.getItem(KEYS.token) ||
      localStorage.getItem("izha_token") ||
      localStorage.getItem("adminToken") ||
      localStorage.getItem("token")
    );
  };

  // Live data only: loads visits, customers, and order history from the database
  const load = useCallback(async () => {
    const token = getAdminToken();
    try {
      // 1. Visitor funnel events
      const resVisits = await fetch("/api/visits", {
        cache: "no-store",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-admin-request": "true",
        },
      });
      const dataVisits = await resVisits.json().catch(() => ({}));
      if (dataVisits?.events && Array.isArray(dataVisits.events)) {
        setEvents(dataVisits.events.map(normalizeEvent).filter((e: any): e is VisitEvent => e !== null));
      }

      // 2. Customer accounts and order metrics
      const resCust = await fetch("/api/admin/customers", {
        cache: "no-store",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-admin-request": "true",
        },
      });
      const dataCust = await resCust.json().catch(() => ({}));

      // 3. All orders for comprehensive cross-reporting
      const resOrders = await fetch("/api/orders?admin=true", {
        cache: "no-store",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-admin-request": "true",
        },
      });
      const dataOrders = await resOrders.json().catch(() => ({}));

      const rawOrders = Array.isArray(dataOrders?.orders) ? dataOrders.orders : [];
      const rawCustomers = Array.isArray(dataCust?.customers) ? dataCust.customers : [];

      const map = new Map<string, CustomerReportRow>();

      // Group metrics from actual placed orders
      for (const ord of rawOrders) {
        const key = (ord.customerEmail || ord.customerPhone || ord.customerName || "").toLowerCase().trim();
        if (!key) continue;

        const tot = Number(ord.total) || 0;
        const ordDate = ord.createdAt ? new Date(ord.createdAt).toISOString() : new Date().toISOString();
        const addr = ord.shippingAddress || {};

        if (!map.has(key)) {
          map.set(key, {
            id: ord.customerEmail || ord.customerPhone || ord.id,
            name: ord.customerName || "Customer",
            email: ord.customerEmail || "",
            phone: ord.customerPhone || "",
            city: addr.city || "Kerala",
            state: addr.state || "Kerala",
            ordersCount: 1,
            totalSpent: tot,
            lastOrderDate: ordDate,
            joinedAt: ordDate,
          });
        } else {
          const prev = map.get(key)!;
          prev.ordersCount += 1;
          prev.totalSpent += tot;
          if (new Date(ordDate) > new Date(prev.lastOrderDate)) {
            prev.lastOrderDate = ordDate;
          }
        }
      }

      // Add registered users who may not have placed orders yet
      for (const c of rawCustomers) {
        const key = (c.email || c.phone || c.name || "").toLowerCase().trim();
        if (!key) continue;
        if (!map.has(key)) {
          map.set(key, {
            id: c.id || key,
            name: c.name || "Customer",
            email: c.email || "",
            phone: c.phone || "",
            city: c.city || "Kerala",
            state: c.state || "Kerala",
            ordersCount: Number(c.ordersCount) || 0,
            totalSpent: Number(c.totalSpent) || 0,
            lastOrderDate: c.joinedAt || new Date().toISOString(),
            joinedAt: c.joinedAt || new Date().toISOString(),
          });
        }
      }

      setCustomers(Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent));
      setError("");
    } catch {
      setError("Could not load reporting data. Please try again.");
    } finally {
      setNow(Date.now());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    const timer = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Funnel calculations
  const sessions = useMemo<SessionRow[]>(() => {
    const cutoff = range === "all" || !now ? 0 : now - Number(range) * 86400000;
    const map = new Map<string, VisitEvent[]>();
    for (const e of events) {
      if (!e || !e.sessionId || stageIndex(e.type) < 0) continue;
      const t = new Date(e.at).getTime();
      if (isNaN(t) || t < cutoff) continue;
      const list = map.get(e.sessionId);
      if (list) list.push(e);
      else map.set(e.sessionId, [e]);
    }
    const rows: SessionRow[] = [];
    map.forEach((list, sessionId) => {
      const sorted = [...list].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
      const last = sorted[sorted.length - 1];
      const reached = Math.max(...sorted.map((e) => stageIndex(e.type)));
      rows.push({
        sessionId,
        customerName: [...sorted].reverse().find((e) => e.customerName)?.customerName ?? "Guest visitor",
        firstSeen: sorted[0].at,
        lastSeen: last.at,
        lastPage: last.page ?? "-",
        lastProduct: [...sorted].reverse().find((e) => e.productName)?.productName ?? "-",
        reached,
        converted: reached === STAGES.length - 1,
      });
    });
    return rows.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  }, [events, range, now]);

  const funnel = useMemo(
    () =>
      STAGES.map((s, i) => ({
        ...s,
        count: sessions.filter((r) => r.reached >= i).length,
      })),
    [sessions]
  );

  const totalVisitors = sessions.length;
  const convertedVisitors = sessions.filter((r) => r.converted).length;
  const droppedVisitors = totalVisitors - convertedVisitors;
  const convRate = totalVisitors ? ((convertedVisitors / totalVisitors) * 100).toFixed(1) : "0.0";

  const shownSessions = useMemo(
    () => (onlyDropped ? sessions.filter((r) => !r.converted) : sessions),
    [sessions, onlyDropped]
  );

  // Filtered customer report rows
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalOrdersCount = customers.reduce((sum, c) => sum + c.ordersCount, 0);
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

  // Export Customer Report CSV
  const exportCustomerCsv = () => {
    if (filteredCustomers.length === 0) return;
    const head = [
      "Customer Name",
      "Phone",
      "Email",
      "City",
      "State",
      "Orders Count",
      "Total Spent (INR)",
      "Avg Order Value (INR)",
      "Last Order Date",
    ];
    const lines = filteredCustomers.map((c) =>
      [
        c.name,
        c.phone,
        c.email,
        c.city,
        c.state,
        c.ordersCount,
        c.totalSpent,
        c.ordersCount > 0 ? Math.round(c.totalSpent / c.ordersCount) : 0,
        c.lastOrderDate,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = "\uFEFF" + [head.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export Visitor Funnel CSV
  const exportFunnelCsv = () => {
    if (shownSessions.length === 0) return;
    const head = ["Visitor", "First seen", "Last seen", "Last page", "Last product", "Status"];
    const lines = shownSessions.map((r) =>
      [
        r.customerName,
        r.firstSeen,
        r.lastSeen,
        r.lastPage,
        r.lastProduct,
        r.converted ? "Placed order" : `Dropped after: ${STAGES[r.reached].label}`,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = "\uFEFF" + [head.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visitor-funnel-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const customerStatCards = [
    { label: "Total Customers", value: String(customers.length), icon: <Users size={14} /> },
    { label: "Total Orders", value: String(totalOrdersCount), icon: <ShoppingBag size={14} /> },
    { label: "Total Revenue", value: inr(totalRevenue), icon: <TrendingUp size={14} /> },
    { label: "Avg Order Value", value: inr(avgOrderValue), icon: <UserCheck size={14} /> },
  ];

  const funnelStatCards = [
    { label: "Total visitors", value: String(totalVisitors), icon: <Users size={14} /> },
    { label: "Placed an order", value: String(convertedVisitors), icon: <ShoppingBag size={14} /> },
    { label: "Dropped off", value: String(droppedVisitors), icon: <LogOut size={14} /> },
    { label: "Conversion rate", value: `${convRate}%`, icon: <TrendingUp size={14} /> },
  ];

  const statusPill = (r: SessionRow) => (
    <span
      className={`inline-block max-w-full rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
        r.converted ? "bg-[#eef7f0] text-[#3a6b42]" : "bg-[#FFF5F7] text-[#B20947]"
      }`}
    >
      {r.converted ? "Placed order" : `Dropped after: ${STAGES[r.reached].label}`}
    </span>
  );

  const btnCls = `${outlineBtn} cursor-pointer gap-1.5 justify-center disabled:cursor-not-allowed disabled:opacity-50`;

  return (
    <AdminShell
      title="Reports & Analytics"
      subtitle="Customer Orders & Visitor Insights"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "customers" ? (
            <button
              type="button"
              onClick={exportCustomerCsv}
              disabled={filteredCustomers.length === 0}
              className={btnCls}
            >
              <Download size={14} />
              Export Customer CSV
            </button>
          ) : (
            <button
              type="button"
              onClick={exportFunnelCsv}
              disabled={shownSessions.length === 0}
              className={btnCls}
            >
              <Download size={14} />
              Export Funnel CSV
            </button>
          )}
        </div>
      }
    >
      {/* Navigation breadcrumbs */}
      <div className="mb-4 flex items-center justify-between">
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
        {activeTab === "customers" ? "Customer Sales & Order Reports" : "Visitor Funnel Track"}
      </h2>
      <p className="mb-6 mt-0 text-[14px] text-black/60 sm:text-[15px] md:mb-8">
        {activeTab === "customers"
          ? "Complete sales, spending, and purchasing history by customer"
          : "See who visited the store and where they dropped off before buying"}
      </p>

      {/* Tab Selector */}
      <div className="mb-6 flex flex-wrap gap-2.5 border-b border-[#E8CFD2] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("customers")}
          className={`cursor-pointer rounded-sm px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] transition-all sm:text-[13px] ${
            activeTab === "customers"
              ? "bg-[#B20947] text-white shadow-sm"
              : "border border-[#E8CFD2] bg-[#FAF1E4] text-[#332B2B] hover:bg-[#F3E2CE]"
          }`}
        >
          Customer Sales Report ({customers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("funnel")}
          className={`cursor-pointer rounded-sm px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] transition-all sm:text-[13px] ${
            activeTab === "funnel"
              ? "bg-[#B20947] text-white shadow-sm"
              : "border border-[#E8CFD2] bg-[#FAF1E4] text-[#332B2B] hover:bg-[#F3E2CE]"
          }`}
        >
          Visitor Track &amp; Drop-off Funnel
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-2 rounded-sm border border-[#E8B8C5] bg-[#FFF5F7] p-3 text-[13px] text-[#B20947] sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <button type="button" onClick={load} className={`${btnCls} w-full sm:w-auto`}>
            Try again
          </button>
        </div>
      )}

      {/* Counts Cards */}
      <section aria-label="Report metrics" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {(activeTab === "customers" ? customerStatCards : funnelStatCards).map((s) => (
          <StatCard key={s.label} label={s.label} value={loading ? "…" : s.value} icon={s.icon} />
        ))}
      </section>

      {/* TAB 1: CUSTOMER SALES REPORT */}
      {activeTab === "customers" && (
        <div className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
          <Panel title="Customer Sales &amp; Activity" note="Breakdown of customer orders, total spend and locations">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
                <input
                  type="text"
                  placeholder="Search by name, phone, email, city..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className={`${inputCls} !py-2 !pl-10 !text-[13px]`}
                />
              </div>
              <button
                type="button"
                onClick={exportCustomerCsv}
                disabled={filteredCustomers.length === 0}
                className={`${btnCls} w-full sm:w-auto`}
              >
                <Download size={14} /> Export CSV
              </button>
            </div>

            {loading ? (
              <p className="m-0 text-[14px] text-black/55">Loading customer reports...</p>
            ) : filteredCustomers.length === 0 ? (
              <p className="m-0 text-[14px] text-black/55">No customer order records found.</p>
            ) : (
              <div className="overflow-x-auto rounded-sm border border-[#E8CFD2] bg-[#FFFBF5]">
                <table className="w-full min-w-[700px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-black/5 bg-[#FAF1E4] text-[11px] uppercase tracking-[0.12em] text-black/60">
                      <th className="p-3 font-semibold">Customer</th>
                      <th className="p-3 font-semibold">Contact</th>
                      <th className="p-3 font-semibold">Location</th>
                      <th className="p-3 font-semibold text-center">Orders</th>
                      <th className="p-3 font-semibold text-right">Total Spent</th>
                      <th className="p-3 font-semibold text-right">Avg Order</th>
                      <th className="p-3 font-semibold">Last Order</th>
                      <th className="p-3 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((c) => {
                      const avg = c.ordersCount > 0 ? Math.round(c.totalSpent / c.ordersCount) : 0;
                      return (
                        <tr key={c.id} className="border-b border-black/5 transition-colors hover:bg-[#FFF5F7]/40 last:border-0">
                          <td className="p-3 font-semibold text-[#332B2B]">
                            <Link
                              href={`/admin/customers/details?id=${encodeURIComponent(c.id)}`}
                              className="underline decoration-[#E8B8C5] underline-offset-4 hover:text-[#B20947]"
                            >
                              {c.name}
                            </Link>
                          </td>
                          <td className="p-3 text-black/65">
                            <div>+91 {c.phone || "N/A"}</div>
                            <div className="text-[11px] text-black/45">{c.email}</div>
                          </td>
                          <td className="p-3 text-black/65">
                            {c.city}, {c.state}
                          </td>
                          <td className="p-3 text-center font-bold text-[#332B2B]">
                            {c.ordersCount}
                          </td>
                          <td className="p-3 text-right font-bold text-[#B20947]">
                            {inr(c.totalSpent)}
                          </td>
                          <td className="p-3 text-right text-black/65">
                            {inr(avg)}
                          </td>
                          <td className="p-3 text-[12px] text-black/55">
                            {fmt(c.lastOrderDate)}
                          </td>
                          <td className="p-3 text-center">
                            <Link
                              href={`/admin/customers/details?id=${encodeURIComponent(c.id)}`}
                              className="inline-flex items-center gap-1 rounded-sm border border-[#E8CFD2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#B20947] hover:bg-[#F3E2CE]"
                            >
                              Profile <ArrowRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* TAB 2: VISITOR TRACK & DROP-OFF FUNNEL */}
      {activeTab === "funnel" && (
        <div className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
          <Panel title="Filters" note="Date range, drop-offs and export">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as Range)}
                className={`${inputCls} w-full cursor-pointer !py-2 !text-[13px] sm:!w-auto`}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="all">All time</option>
              </select>

              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#332B2B]">
                <input
                  type="checkbox"
                  checked={onlyDropped}
                  onChange={(e) => setOnlyDropped(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-[#B20947]"
                />
                Show only drop-offs
              </label>

              <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={exportFunnelCsv}
                  disabled={shownSessions.length === 0}
                  className={`${btnCls} w-full sm:w-auto`}
                >
                  <Download size={14} /> Export Funnel CSV
                </button>
              </div>
            </div>
          </Panel>

          <Panel title="Where visitors drop off" note="Storefront conversion funnel stages">
            <div className="space-y-4">
              {funnel.map((s, i) => {
                const pct = totalVisitors ? Math.round((s.count / totalVisitors) * 100) : 0;
                const lost = i > 0 ? funnel[i - 1].count - s.count : 0;
                return (
                  <div key={s.type}>
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[13px]">
                      <span className="font-medium text-[#332B2B]">{s.label}</span>
                      <span className="lining-nums text-black/55">
                        {s.count} visitors ({pct}%)
                        {i > 0 && lost > 0 && (
                          <span className="ml-2 font-semibold" style={{ color: CRIMSON }}>
                            −{lost} left here
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#F6DADD]">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: CRIMSON }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title={`Visitor details (${shownSessions.length})`}>
            {loading ? (
              <p className="m-0 text-[14px] text-black/55">Loading visitor data...</p>
            ) : shownSessions.length === 0 ? (
              <p className="m-0 text-[14px] text-black/55">
                No visitor data yet. Once customers browse the store, they will appear here.
              </p>
            ) : (
              <>
                {/* Mobile view */}
                <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
                  {shownSessions.map((r) => (
                    <li
                      key={r.sessionId}
                      className="min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-3 sm:p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="m-0 min-w-0 break-words text-[14px] font-semibold text-[#332B2B]">
                          {r.customerName}
                        </p>
                        <span className="lining-nums shrink-0 text-[12px] text-black/55">
                          {fmt(r.lastSeen)}
                        </span>
                      </div>
                      <p className="m-0 mt-2 break-all text-[13px] text-black/60">
                        Last page: {r.lastPage}
                      </p>
                      <p className="m-0 mt-0.5 break-words text-[13px] text-black/60">
                        Last product: {r.lastProduct}
                      </p>
                      <div className="mt-3 border-t border-black/5 pt-3">{statusPill(r)}</div>
                    </li>
                  ))}
                </ul>

                {/* Table view */}
                <div className="hidden overflow-x-auto rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] md:block">
                  <table className="w-full min-w-[640px] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-black/5 bg-[#FAF1E4] text-[11px] uppercase tracking-[0.12em] text-black/50">
                        <th className="p-3 font-medium">Visitor</th>
                        <th className="p-3 font-medium">Last seen</th>
                        <th className="p-3 font-medium">Last page</th>
                        <th className="p-3 font-medium">Last product</th>
                        <th className="p-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownSessions.map((r) => (
                        <tr key={r.sessionId} className="border-b border-black/5 last:border-0">
                          <td className="p-3 font-medium text-[#332B2B]">{r.customerName}</td>
                          <td className="lining-nums p-3 text-black/55">{fmt(r.lastSeen)}</td>
                          <td className="break-all p-3 text-black/55">{r.lastPage}</td>
                          <td className="p-3 text-black/55">{r.lastProduct}</td>
                          <td className="p-3">{statusPill(r)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>
        </div>
      )}
    </AdminShell>
  );
}
