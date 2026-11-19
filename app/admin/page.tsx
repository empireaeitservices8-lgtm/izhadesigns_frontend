"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { KEYS, inr, useStored } from "@/lib/izha-store";
import {
  DEFAULT_ADMIN_PRODUCTS,
  DEFAULT_CUSTOMERS,
  DEFAULT_ORDERS,
  MONTHLY_REVENUE_SERIES,
  type AdminProduct,
  type DemoCustomer,
  type DemoOrder,
  type OrderStatus,
} from "@/lib/demo-store";
import AdminShell from "@/components/admin/AdminShell";
import { serif } from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";

const CRIMSON = "#B20947";
const LOW_STOCK = 5;

const STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"] as const;

/** Deleted order IDs (written by the Orders pages). Deleted orders never count here. */
const DELETED_ORDERS_KEY = "izha_deleted_orders";

/** Deleted customers: their id, email and phone in lower case (written by the Customers pages). */
const DELETED_CUSTOMERS_KEY = "izha_deleted_customers";

/** Status changes made in Order Details that the server has not confirmed yet. */
const STATUS_OVERRIDE_KEY = "izha_order_status_overrides";

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

const PILL: Record<string, string> = {
  Pending: "bg-[#FFF5F7] text-[#B20947]",
  "Order Placed": "bg-[#FFF5F7] text-[#B20947]",
  Confirmed: "bg-[#F9E3E9] text-[#8F3057]",
  Processing: "bg-[#FFF5F7] text-[#B20947]",
  Packed: "bg-[#F9E3E9] text-[#8F3057]",
  Shipped: "bg-[#eef4ff] text-[#2b529a]",
  "Out for Delivery": "bg-[#fef9ee] text-[#8f6213]",
  Delivered: "bg-[#eef7f0] text-[#3a6b42]",
  Cancelled: "bg-[#f3efef] text-[#6f6565]",
};

const BAR: Record<string, string> = {
  Pending: "#E99A9F",
  "Order Placed": "#E99A9F",
  Confirmed: "#8F3057",
  Processing: "#E99A9F",
  Packed: "#8F3057",
  Shipped: "#2b529a",
  "Out for Delivery": "#8f6213",
  Delivered: "#3a6b42",
  Cancelled: "#9b9090",
};

function StatCard({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
}) {
  const body = (
    <div className="h-full rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 transition-colors hover:border-[#B20947]/40 sm:p-6">
      <p className="m-0 text-[10px] uppercase tracking-[0.15em] text-black/50 sm:text-[11px] sm:tracking-[0.25em]">
        {label}
      </p>
      <p
        className={`${serif} lining-nums mb-0 mt-3 break-words font-medium leading-none sm:mt-4 ${value.startsWith("₹") ? "text-[26px] sm:text-[34px]" : "text-[32px] sm:text-[46px]"
          }`}
        style={{ color: CRIMSON }}
      >
        {value}
      </p>
      {note && <p className="mb-0 mt-2 text-[11px] text-black/45 sm:mt-3 sm:text-[12px]">{note}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block no-underline">
      {body}
    </Link>
  ) : (
    body
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

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${PILL[status] ?? "bg-[#FFF5F7] text-[#332B2B]"
        }`}
    >
      {status}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [dbStats, setDbStats] = useState<{
    totalOrders: number;
    pendingOrders: number;
    totalProducts: number;
    totalCustomers: number;
    totalRevenue: number;
    confirmedOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("izha_admin_stats_cache");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [storedOrders, setOrders] = useState<DemoOrder[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEYS.orders);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((o: any) => !String(o.id).startsWith("IZB-100")) : [];
    } catch {
      return [];
    }
  });
  const [storedCustomers, setStoredCustomers] = useState<DemoCustomer[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEYS.customers);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [products, setProducts] = useStored<AdminProduct[]>(KEYS.adminProducts, DEFAULT_ADMIN_PRODUCTS);
  const [isClient, setIsClient] = useState(false);

  // Load database statistics directly from backend API for 100% accurate live counts
  const loadStats = () => {
    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);
    fetch(apiUrl("/admin/stats"), {
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-admin-request": "true",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.stats) {
          setDbStats(data.stats);
          try {
            localStorage.setItem("izha_admin_stats_cache", JSON.stringify(data.stats));
          } catch (_) { }
        }
      })
      .catch(() => { });
  };

  useEffect(() => {
    setIsClient(true);
    // Eradicate any legacy localStorage blacklists that suppress real database records
    try {
      localStorage.removeItem(DELETED_ORDERS_KEY);
      localStorage.removeItem("izha_deleted_products");
    } catch (_) { }
    loadStats();
    const statsTimer = setInterval(loadStats, 6000);
    return () => clearInterval(statsTimer);
  }, []);

  // All active orders and products directly from database without suppression
  const orders = storedOrders;
  const activeProducts = products;

  const customers = storedCustomers;

  // Sync actual inventory, customers and orders information from the database
  useEffect(() => {
    fetch(apiUrl("/products"))
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.products) && data.products.length > 0) {
          setProducts((prev) => {
            const mapped: AdminProduct[] = data.products.map((p: any) => {
              const existing = prev.find((x) => x.id === p.id);
              return {
                id: p.id,
                name: p.name,
                category: p.category || "Dresses",
                categorySlug: p.categorySlug || "dresses",
                color: existing?.color || "Dusty Rose",
                price: Number(p.price),
                mrp: Number(p.mrp || p.price),
                stock: p.stock !== undefined && p.stock !== null ? Number(p.stock) : 15,
                soldCount: existing?.soldCount || 0,
                sizes: Array.isArray(p.sizes) ? p.sizes : ["S", "M", "L", "XL"],
                soldOutSizes: Array.isArray(p.soldOutSizes) ? p.soldOutSizes : [],
                image: p.image || "/images/about.jpg",
                gallery: Array.isArray(p.gallery) ? p.gallery : [p.image || "/images/about.jpg"],
                createdAt: p.createdAt || new Date().toISOString(),
                isNew: Boolean(p.isNew),
                newDays: Number(p.newDays) || 30,
                description: p.description || "",
                fabric: p.fabric || "",
                craft: p.craft || "",
                fit: p.fit || "",
                care: p.care || "",
                popularity: Number(p.popularity) || 80,
                reviews: existing?.reviews || [],
              };
            });
            return mapped;
          });
        }
      })
      .catch(() => { });

    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);
    fetch(apiUrl("/admin/customers"), {
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.customers)) {
          setStoredCustomers(data.customers);
        }
      })
      .catch(() => { });

    const loadOrders = () => {
      fetch(apiUrl("/orders?admin=true"), {
        cache: "no-store",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-admin-request": "true",
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.orders)) {
            const overrides = readStatusOverrides();

            const mapped: DemoOrder[] = data.orders.map((bo: any) => {
              const id = bo.orderNumber || bo.id;
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
                status: overrides[id] || bo.status || "Pending",
                trackingNumber: bo.trackingNumber,
              };
            });

            setOrders(mapped);
          }
        })
        .catch(() => { });
    };

    loadOrders();
    const interval = setInterval(loadOrders, 8000);
    window.addEventListener("izha-store-sync", loadOrders);
    window.addEventListener("storage", loadOrders);
    return () => {
      clearInterval(interval);
      window.removeEventListener("izha-store-sync", loadOrders);
      window.removeEventListener("storage", loadOrders);
    };
  }, [setProducts, setOrders]);

  const actualCustomers = useMemo(() => {
    const map = new Map<string, DemoCustomer>();
    for (const o of orders) {
      const key = (o.customerEmail || o.customerPhone || o.customerName).toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, {
          id: o.customerId || key,
          name: o.customerName || "Customer",
          email: o.customerEmail || "",
          phone: o.customerPhone || "",
          city: o.city || "Kerala",
          state: o.state || "Kerala",
          pincode: o.pincode || "",
          address: o.address || "",
          joinedAt: o.createdAt || "2026-01-01",
          source: o.source || "Direct",
          savedAddresses: [],
        });
      }
    }
    for (const c of customers) {
      const key = (c.email || c.phone || c.name).toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, c);
      }
    }
    return Array.from(map.values());
  }, [orders, customers]);

  const m = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const totalOrders = orders.length;
    const collected = orders
      .filter((o) => o.paymentStatus === "Paid" || o.status === "Delivered")
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const average = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const isPendingStatus = (st: string) => {
      const s = (st || "").toLowerCase();
      return (
        s === "pending" ||
        s === "order placed" ||
        s === "confirmed" ||
        s === "processing" ||
        s === "packed" ||
        (s !== "delivered" && s !== "cancelled" && s !== "failed")
      );
    };

    const pending = orders.filter((o) => isPendingStatus(o.status)).length;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let series = MONTHLY_REVENUE_SERIES;

    if (isClient) {
      const now = new Date();
      const dynamicSeries = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mIdx = d.getMonth();
        const yr = d.getFullYear();
        const label = monthNames[mIdx];
        const monthOrders = orders.filter((o) => {
          // Use the raw date, because createdAt is a display text that may not parse
          const orderDate = new Date((o as any).rawCreatedAt || o.createdAt);
          return !isNaN(orderDate.getTime()) && orderDate.getMonth() === mIdx && orderDate.getFullYear() === yr;
        });
        const rev = monthOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        dynamicSeries.push({
          month: label,
          revenue: rev,
          orders: monthOrders.length,
        });
      }

      // Always show the last 6 months
      series = dynamicSeries;
    }

    const maxRevenue = Math.max(...series.map((s) => s.revenue), 1000);

    // Compute top products sold from actual orders
    const soldCountMap = new Map<string, number>();
    for (const o of orders) {
      if (Array.isArray(o.items)) {
        for (const item of o.items) {
          soldCountMap.set(item.id, (soldCountMap.get(item.id) || 0) + (Number(item.qty) || 1));
        }
      }
    }

    const topProducts = [...activeProducts]
      .map((p) => ({
        ...p,
        soldCount: (soldCountMap.get(p.id) || p.soldCount || 0),
      }))
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, 5);

    const lowStockList = activeProducts
      .filter((p) => p.stock <= LOW_STOCK)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);
    const lowStockCount = activeProducts.filter((p) => p.stock <= LOW_STOCK).length;

    const statusCount = new Map<string, number>();
    for (const s of STATUSES) statusCount.set(s, 0);

    for (const o of orders) {
      if (isPendingStatus(o.status)) {
        statusCount.set("Pending", (statusCount.get("Pending") ?? 0) + 1);
      } else if (o.status === "Confirmed") {
        statusCount.set("Confirmed", (statusCount.get("Confirmed") ?? 0) + 1);
      } else if (o.status === "Shipped" || o.status === "Out for Delivery") {
        statusCount.set("Shipped", (statusCount.get("Shipped") ?? 0) + 1);
      } else if (o.status === "Delivered") {
        statusCount.set("Delivered", (statusCount.get("Delivered") ?? 0) + 1);
      } else if (o.status === "Cancelled" || o.status === "Failed") {
        statusCount.set("Cancelled", (statusCount.get("Cancelled") ?? 0) + 1);
      } else {
        statusCount.set(o.status, (statusCount.get(o.status) ?? 0) + 1);
      }
    }

    return {
      totalRevenue,
      totalOrders,
      collected,
      average,
      pending,
      series,
      maxRevenue,
      topProducts,
      lowStockList,
      lowStockCount,
      statusCount,
    };
  }, [orders, activeProducts, isClient]);

  const recentOrders = orders.slice(0, 4);
  const recentCustomers = actualCustomers.slice(0, 4);

  return (
    <AdminShell title="Dashboard">
      <p className="m-0 text-[10px] uppercase tracking-[0.2em] text-black/50 sm:text-[11px] sm:tracking-[0.3em]">
        Signed in as Izha Admin
      </p>
      <h2
        className={`${serif} mb-2 mt-3 break-words font-medium leading-tight`}
        style={{ color: CRIMSON, fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
      >
        Welcome back, Izha Admin
      </h2>
      <p className="mb-6 mt-0 text-[14px] text-black/60 sm:text-[15px] md:mb-10">
        Here is a quick look at your store.
      </p>

      {/* Counts: two per row on phones */}
      <section aria-label="Store counts" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Customers"
          value={String(dbStats?.totalCustomers ?? (actualCustomers.length > 0 ? actualCustomers.length : 0))}
          note="Active buyers & accounts"
          href="/admin/customers"
        />
        <StatCard
          label="Products"
          value={String(dbStats?.totalProducts ?? (activeProducts.length > 0 ? activeProducts.length : 0))}
          note="Catalog styles"
          href="/admin/products"
        />
        <StatCard
          label="Orders"
          value={String(dbStats?.totalOrders ?? m.totalOrders)}
          note="All orders"
          href="/admin/orders"
        />
        <StatCard
          label="Pending orders"
          value={String(dbStats?.pendingOrders ?? m.pending)}
          note="Waiting to be packed"
          href="/admin/orders"
        />
      </section>

      {/* Sales: one per row on phones, because the amounts are wide */}
      <section
        aria-label="Sales figures"
        className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:grid-cols-3 sm:gap-4"
      >
        <StatCard label="Sales" value={inr(dbStats?.totalRevenue ?? m.totalRevenue)} note="All orders placed" />
        <StatCard label="Collected" value={inr(m.collected)} note="Delivered orders only" />
        <StatCard
          label="Average order"
          value={inr(
            dbStats && dbStats.totalOrders > 0
              ? Math.round(dbStats.totalRevenue / dbStats.totalOrders)
              : m.average
          )}
          note="Sales divided by orders"
        />
      </section>

      {/* Chart + status */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-3">
        <Panel
          title="Sales, last 6 months"
          note="Number on top = sales in thousands"
          className="lg:col-span-2"
        >
          <div className="flex h-44 items-end gap-2 sm:gap-4" role="img" aria-label="Bar chart of sales for the last 6 months">
            {m.series.map((item) => {
              const pct = Math.max(6, Math.round((item.revenue / m.maxRevenue) * 100));
              return (
                <div
                  key={item.month}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  title={`${item.month}: ${inr(item.revenue)}, ${item.orders} orders`}
                >
                  <span className="lining-nums mb-1 text-[11px] text-black/55">
                    ₹{Math.round(item.revenue / 1000)}k
                  </span>
                  <div className="w-full rounded-t-sm" style={{ height: `${pct}%`, background: CRIMSON }} />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2 sm:gap-4">
            {m.series.map((item) => (
              <div key={item.month} className="min-w-0 flex-1 text-center">
                <p className="m-0 text-[11px] uppercase tracking-[0.1em] text-black/60">{item.month}</p>
                <p className="lining-nums m-0 text-[10px] text-black/45">{item.orders} orders</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Orders by status" note="Recent orders">
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {STATUSES.map((s) => {
              const n = m.statusCount.get(s) ?? 0;
              const pct = orders.length > 0 ? Math.round((n / orders.length) * 100) : 0;
              return (
                <li key={s}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span>{s}</span>
                    <span className="lining-nums text-black/60">{n}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-[#F6DADD]">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: BAR[s] }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      {/* Top selling + low stock */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-2">
        <Panel title="Top selling styles" note="By units sold">
          {m.topProducts.length === 0 ? (
            <p className="m-0 text-[14px] text-black/55">No sales yet.</p>
          ) : (
            <ol className="m-0 list-none p-0">
              {m.topProducts.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 border-b border-black/5 py-3 last:border-0">
                  <span className="lining-nums w-5 shrink-0 text-[13px] text-black/40">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[14px]">{p.name}</span>
                  <span className="shrink-0 text-right text-[12px] text-black/55">
                    <span className="lining-nums">{p.soldCount}</span> sold
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Low stock items" note={`Styles with ${LOW_STOCK} or fewer units left (${m.lowStockCount} need attention)`}>
          {m.lowStockList.length === 0 ? (
            <p className="m-0 text-[14px] text-black/55">All styles have enough stock.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {m.lowStockList.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 border-b border-black/5 py-3 last:border-0">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className="relative h-11 w-9 shrink-0 overflow-hidden rounded-sm border border-[#E8CFD2] bg-[#FFF5F7]">
                      <Image
                        src={p.image || "/images/about.jpg"}
                        alt={p.name}
                        fill
                        sizes="36px"
                        unoptimized={p.image?.startsWith("data:")}
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[14px] font-medium text-[#332B2B]">{p.name}</p>
                      <p className="m-0 mt-0.5 text-[11px] text-black/45">
                        ID: {p.id} · {p.stock <= 0 ? "0 units left" : `${p.stock} unit${p.stock === 1 ? "" : "s"} left`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`lining-nums shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${p.stock <= 0 ? "bg-[#f3efef] text-[#6f6565]" : "bg-[#FFF5F7] text-[#B20947]"
                      }`}
                  >
                    {p.stock <= 0 ? "Out of Stock" : "Low Stock"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/products"
            className="mt-4 inline-block py-2 text-[12px] uppercase tracking-[0.15em] underline underline-offset-4"
            style={{ color: CRIMSON }}
          >
            Manage products
          </Link>
        </Panel>
      </div>

      {/* Recent orders */}
      <section aria-labelledby="recent-orders-title" className="mt-8 md:mt-10">
        <h2
          id="recent-orders-title"
          className={`${serif} m-0 text-[26px] font-medium sm:text-[30px]`}
          style={{ color: CRIMSON }}
        >
          Recent orders
        </h2>
        <div className="mt-4 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] sm:mt-5">
          {recentOrders.length === 0 ? (
            <p className="m-0 p-5 text-[15px] text-black/55 sm:p-6">No orders yet.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {recentOrders.map((o) => (
                <li key={o.id} className="border-b border-black/5 p-4 last:border-0 sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/admin/orders/details?id=${encodeURIComponent(o.id)}`}
                      className="lining-nums min-w-0 truncate text-[14px] underline underline-offset-4"
                      style={{ color: CRIMSON }}
                    >
                      {o.id}
                    </Link>
                    <StatusPill status={o.status} />
                  </div>
                  <p className="m-0 mt-2 truncate text-[14px]">
                    {o.customerName} · {o.city}
                  </p>
                  <p className="lining-nums m-0 mt-1 text-[13px] text-black/60">{inr(o.total)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link
          href="/admin/orders"
          className="mt-3 inline-block py-2 text-[12px] uppercase tracking-[0.15em] underline underline-offset-4"
          style={{ color: CRIMSON }}
        >
          See all orders
        </Link>
      </section>

      {/* Recent customers */}
      <section aria-labelledby="recent-customers-title" className="mt-8 md:mt-12">
        <h2
          id="recent-customers-title"
          className={`${serif} m-0 text-[26px] font-medium sm:text-[30px]`}
          style={{ color: CRIMSON }}
        >
          Recent customers
        </h2>
        <div className="mt-4 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] sm:mt-5">
          {recentCustomers.length === 0 ? (
            <p className="m-0 p-5 text-[15px] text-black/55 sm:p-6">No customers have registered yet.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {recentCustomers.map((c) => (
                <li key={c.id} className="border-b border-black/5 p-4 last:border-0 sm:px-6">
                  <Link
                    href={`/admin/customers/details?id=${encodeURIComponent(c.id)}`}
                    className="block no-underline hover:opacity-80"
                  >
                    <p className="m-0 text-[14px] font-medium text-[#332B2B]">{c.name}</p>
                    <p className="lining-nums m-0 mt-1 text-[13px] text-black/60">
                      +91 {c.phone} · {c.city}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link
          href="/admin/customers"
          className="mt-3 inline-block py-2 text-[12px] uppercase tracking-[0.15em] underline underline-offset-4"
          style={{ color: CRIMSON }}
        >
          See all customers
        </Link>
      </section>
    </AdminShell>
  );
}