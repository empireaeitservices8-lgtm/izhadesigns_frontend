"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Calendar, CreditCard, MapPin, Package, Trash2, User } from "lucide-react";
import { KEYS, inr, useStored } from "@/lib/izha-store";
import {
  DEFAULT_ADMIN_PRODUCTS,
  DEFAULT_ORDERS,
  type AdminProduct,
  type DemoOrder,
  type OrderStatus,
} from "@/lib/demo-store";
import AdminShell, { card, inputCls, outlineBtn } from "@/components/admin/AdminShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { serif } from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";

const CRIMSON = "#B20947";

/** Pointer (hand) cursor on every button and select inside this page. */
const CURSOR_FIX = "[&_button:not(:disabled)]:cursor-pointer [&_select]:cursor-pointer";

/** Status changes that the server has not confirmed yet (the Orders page reads this). */
const STATUS_OVERRIDE_KEY = "izha_order_status_overrides";

/**
 * IDs of deleted orders (the Orders page reads this).
 * They stay in the list for good, so a deleted order never comes back on refresh.
 */
const DELETED_KEY = "izha_deleted_orders";

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

/**
 * Link to the customer-side product page.
 * Change this one line if your storefront uses a different route
 * (for example `/products/${id}` or `/product?id=${id}`).
 */
const productHref = (id: string) => `/product/${encodeURIComponent(id)}`;

const STATUSES: OrderStatus[] = [
  "Order Placed",
  "Confirmed",
  "Processing",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

/* ---------- Layout pieces (same structure as the dashboard) ---------- */

function InfoCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 sm:p-6">
      <p className="m-0 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-black/50 sm:text-[11px] sm:tracking-[0.25em]">
        {icon} {label}
      </p>
      <div className="mt-3 sm:mt-4">{children}</div>
    </div>
  );
}

function Panel({
  title,
  className = "",
  children,
}: {
  title: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 sm:p-6 ${className}`}>
      <h2
        className={`${serif} m-0 flex items-center gap-2 text-[22px] font-medium sm:text-[28px]`}
        style={{ color: CRIMSON }}
      >
        {title}
      </h2>
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

function OrderDetailsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id") ?? "";
  const [orders, setOrders] = useState<DemoOrder[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEYS.orders);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((o: any) => !String(o.id).startsWith("IZB-100")) : [];
    } catch {
      return [];
    }
  });
  const [serverOrder, setServerOrder] = useState<DemoOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setProducts] = useStored<AdminProduct[]>(KEYS.adminProducts, DEFAULT_ADMIN_PRODUCTS);

  // ID of the order waiting for delete confirmation (null = alert box closed)
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);

    const mapBo = (bo: any): DemoOrder => {
      const id = bo.orderNumber || bo.id;
      const overrides = readStatusOverrides();
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
        paymentRef: bo.paymentRef || bo.trackingNumber || "N/A",
        status: overrides[id] || bo.status || "Processing",
        source: "Direct",
      };
    };

    if (!orderId) {
      // If no specific order ID provided in URL, load latest order from server
      fetch(apiUrl("/orders?admin=true"), {
        cache: "no-store",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-admin-request": "true",
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.orders) && data.orders.length > 0) {
            setServerOrder(mapBo(data.orders[0]));
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
      return;
    }

    fetch(apiUrl(`/orders/${encodeURIComponent(orderId)}`), {
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-admin-request": "true",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.order) {
          setServerOrder(mapBo(data.order));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  const order =
    serverOrder ||
    orders.find((o) => o.id === orderId || (o as any).orderNumber === orderId) ||
    (orders.length > 0 && !orderId ? orders[0] : null);

  if (!order) {
    if (loading) {
      return (
        <div className={`${card} p-8 text-center`}>
          <p className="text-[#6f6565]">Loading order details...</p>
        </div>
      );
    }
    return (
      <div className={`${card} p-8 text-center`}>
        <p className="text-[#6f6565]">Order not found.</p>
        <Link href="/admin/orders" className={`${outlineBtn} mt-4`}>
          Back to Orders
        </Link>
      </div>
    );
  }

  const updateStatus = (next: OrderStatus) => {
    if (!order) return;
    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);

    // Remember the new status so the Orders page shows it even if the server still has the old one
    const overrides = readStatusOverrides();
    overrides[order.id] = next;
    writeStatusOverrides(overrides);

    // Update the local list first so the Orders page changes at once
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: next } : o))
    );
    if (serverOrder && serverOrder.id === order.id) {
      setServerOrder({ ...serverOrder, status: next });
    }

    fetch(apiUrl(`/orders/${encodeURIComponent(order.id)}/status`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-admin-request": "true",
      },
      body: JSON.stringify({ status: next }),
    })
      .then(async (res) => {
        if (res.ok) {
          const latest = readStatusOverrides();
          if (latest[order.id] === next) {
            delete latest[order.id];
            writeStatusOverrides(latest);
          }
        }
        const data = await res.json().catch(() => ({}));
        if (data && Array.isArray(data.updatedProducts) && data.updatedProducts.length > 0) {
          setProducts(data.updatedProducts);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("izha-store-sync", { detail: KEYS.adminProducts })
            );
          }
        }
      })
      .catch(() => {});
  };

  /** Runs after the person presses Delete in the alert box. */
  const confirmDelete = async () => {
    if (!confirmId || deleting) return;
    const id = confirmId;
    setDeleting(true);

    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);

    // Remember the deletion first. It is never removed from this list,
    // so the order stays hidden after a refresh.
    const deleted = readDeleted();
    if (!deleted.includes(id)) writeDeleted([...deleted, id]);

    const overrides = readStatusOverrides();
    if (overrides[id]) {
      delete overrides[id];
      writeStatusOverrides(overrides);
    }

    setOrders((prev) => prev.filter((o) => o.id !== id));

    // Tell the server too (if this fails, the order is still hidden here)
    try {
      await fetch(apiUrl(`/orders/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-admin-request": "true",
        },
      });
    } catch {
      /* the Orders page keeps it hidden and retries later */
    }

    router.push("/admin/orders");
  };

  return (
    <div className={`${CURSOR_FIX} w-full min-w-0`}>
      {/* Back button + status update + delete */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#B20947] hover:underline transition-colors"
        >
          <ArrowLeft size={16} /> Back to Orders
        </Link>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-black/50">
            Update Status:
          </span>
          <select
            className={`${inputCls} w-full !py-2 text-[13px] font-medium sm:!w-auto`}
            value={order.status}
            onChange={(e) => updateStatus(e.target.value as OrderStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setConfirmId(order.id)}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-[#B20947]/40 bg-transparent px-3.5 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#B20947] transition-colors hover:bg-[#B20947] hover:text-white disabled:opacity-50"
          >
            <Trash2 size={14} /> Delete Order
          </button>
        </div>
      </div>

      {/* Top meta: When, Where, Payment, Who (one per row on phones) */}
      <section
        aria-label="Order summary"
        className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4"
      >
        <InfoCard icon={<Calendar size={14} />} label="When Placed">
          <p className="lining-nums m-0 text-[15px] font-semibold text-[#332B2B]">{order.createdAt}</p>
        </InfoCard>

        <InfoCard icon={<MapPin size={14} />} label="Delivery Destination">
          <p className="m-0 break-words text-[14px] font-medium text-[#332B2B]">{order.address}</p>
          <p className="lining-nums m-0 mt-1 text-[13px] text-black/55">
            {order.city}, {order.state} · {order.pincode}
          </p>
        </InfoCard>

        <InfoCard icon={<CreditCard size={14} />} label="Payment Details">
          <p className="m-0 text-[15px] font-semibold text-[#332B2B]">
            {order.paymentMethod} · {order.paymentStatus}
          </p>
          <p className="m-0 mt-1 break-all text-[12px] text-black/55">Ref: {order.paymentRef}</p>
        </InfoCard>

        <InfoCard icon={<User size={14} />} label="Customer Data">
          <Link
            href={`/admin/customers/details?id=${encodeURIComponent(order.customerId)}`}
            className={`${serif} block break-words text-[22px] font-semibold underline decoration-[#E8B8C5] underline-offset-4 hover:opacity-80`}
            style={{ color: CRIMSON }}
          >
            {order.customerName}
          </Link>
          <p className="lining-nums m-0 mt-1 break-all text-[12px] text-black/55">
            +91 {order.customerPhone} · {order.customerEmail}
          </p>
        </InfoCard>
      </section>

      {/* Product details + price summary */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Panel
          title={
            <>
              <Package size={20} />
              Ordered Products ({order.items.length})
            </>
          }
        >
          <ul className="m-0 list-none p-0">
            {order.items.map((item) => (
              <li
                key={`${item.id}-${item.size}`}
                className="flex items-center gap-3 border-b border-black/5 py-3.5 last:border-0 sm:gap-4"
              >
                {/* Click the image to open this product's page */}
                <Link
                  href={productHref(item.id)}
                  aria-label={`View product details of ${item.name}`}
                  title="View product details"
                  className="group relative block h-20 w-16 shrink-0 cursor-pointer overflow-hidden rounded-sm border border-[#E8B8C5] bg-[#FFF5F7] transition-colors hover:border-[#B20947]"
                >
                  <Image
                    src={item.image || "/images/about.jpg"}
                    alt={item.name || "Product"}
                    fill
                    sizes="64px"
                    unoptimized={true}
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="m-0 break-words text-[14px] font-semibold text-[#332B2B] sm:text-[15px]">
                    {item.name}
                  </p>
                  <p className="lining-nums m-0 mt-0.5 text-[12px] text-black/55 sm:text-[13px]">
                    Size: <strong>{item.size}</strong> · Qty: <strong>{item.qty}</strong> · Unit:{" "}
                    {inr(item.price)}
                  </p>
                </div>
                <span className="lining-nums shrink-0 text-[14px] font-semibold text-[#332B2B] sm:text-[15px]">
                  {inr(item.price * item.qty)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Payment Summary" className="h-fit">
          <dl className="m-0 space-y-2.5 text-[14px]">
            <div className="flex justify-between gap-3">
              <dt className="text-black/55">Subtotal</dt>
              <dd className="lining-nums m-0 font-medium text-[#332B2B]">{inr(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-black/55">
                  Discount {order.couponCode ? `(${order.couponCode})` : ""}
                </dt>
                <dd className="lining-nums m-0 font-medium text-[#5f7a62]">−{inr(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-black/55">Shipping</dt>
              <dd className="lining-nums m-0 font-medium text-[#332B2B]">
                {order.shipping === 0 ? "FREE" : inr(order.shipping)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-black/5 pt-3 text-[16px] font-semibold">
              <dt className="text-[#332B2B]">Order Total</dt>
              <dd className="lining-nums m-0" style={{ color: CRIMSON }}>
                {inr(order.total)}
              </dd>
            </div>
          </dl>

          <Link
            href={`/admin/customers/details?id=${encodeURIComponent(order.customerId)}`}
            className={`${outlineBtn} mt-5 w-full justify-center`}
          >
            View {order.customerName}&apos;s Full Profile
          </Link>
        </Panel>
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
    </div>
  );
}

export default function AdminOrderDetailsPage() {
  return (
    <AdminShell title="Order Details">
      {/* Heading block */}
      <h2
        className={`${serif} mb-2 mt-0 break-words font-medium leading-tight`}
        style={{ color: CRIMSON, fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
      >
        Order Details
      </h2>
      <p className="mb-6 mt-0 text-[14px] text-black/60 sm:text-[15px] md:mb-10">
        Full breakdown of timestamps, shipping address, payment reference, products &amp; customer data
      </p>

      <Suspense fallback={<div className="p-6 text-sm text-[#6f6565]">Loading order...</div>}>
        <OrderDetailsInner />
      </Suspense>
    </AdminShell>
  );
}