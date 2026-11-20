"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone, ShoppingBag } from "lucide-react";
import { KEYS, inr, useStored } from "@/lib/izha-store";
import {
  DEFAULT_CUSTOMERS,
  DEFAULT_ORDERS,
  type DemoCustomer,
  type DemoOrder,
} from "@/lib/demo-store";
import AdminShell, { card, outlineBtn } from "@/components/admin/AdminShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { serif } from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";

const CRIMSON = "#B20947";

const DELETE_BTN =
  "inline-flex cursor-pointer items-center justify-center rounded-sm border border-[#B20947]/40 bg-[#FFF5F7] px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#B20947] transition-colors hover:bg-[#F9E3E9]";

/* ---------- Layout pieces (same structure as the dashboard) ---------- */

function Panel({
  title,
  className = "",
  children,
}: {
  title?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 sm:p-6 ${className}`}>
      {title && (
        <h2
          className={`${serif} m-0 flex items-center gap-2 text-[22px] font-medium sm:text-[28px]`}
          style={{ color: CRIMSON }}
        >
          {title}
        </h2>
      )}
      <div className={title ? "mt-4 sm:mt-5" : ""}>{children}</div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="h-full min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-4 sm:p-5">
      <p className="m-0 text-[10px] uppercase tracking-[0.15em] text-black/50 sm:text-[11px] sm:tracking-[0.25em]">
        {label}
      </p>
      <p
        className={`${serif} lining-nums mb-0 mt-3 break-words font-medium leading-none ${
          value.startsWith("₹") ? "text-[22px] sm:text-[30px]" : "text-[30px] sm:text-[38px]"
        }`}
        style={{ color: CRIMSON }}
      >
        {value}
      </p>
    </div>
  );
}

function CustomerDetailsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const [customers, setCustomers] = useState<DemoCustomer[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEYS.customers);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [orders, setOrders] = useState<DemoOrder[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEYS.orders);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Alert box open/closed (kept above the early return so hooks stay in order)
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Local status override so Activate/Deactivate always updates the screen,
  // even when the customer was built from an order match (not in `customers`).
  const [statusOverride, setStatusOverride] = useState<"Active" | "Inactive" | null>(null);

  useEffect(() => {
    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);
    fetch(apiUrl("/admin/customers"), {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-admin-request": "true",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.customers)) {
          setCustomers(data.customers);
          try {
            localStorage.setItem(KEYS.customers, JSON.stringify(data.customers));
          } catch (_) {}
        }
      })
      .catch(() => {});

    fetch(apiUrl("/orders?admin=true"), {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-admin-request": "true",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.orders)) {
          const mapped: DemoOrder[] = data.orders.map((bo: any) => ({
            id: bo.orderNumber || bo.id,
            createdAt: bo.createdAt ? new Date(bo.createdAt).toLocaleDateString("en-IN") : "Recent",
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
            status: bo.status || "Processing",
            source: "Direct",
          }));
          setOrders(mapped);
          try {
            localStorage.setItem(KEYS.orders, JSON.stringify(mapped));
          } catch (_) {}
        }
      })
      .catch(() => {});
  }, []);

  const foundCustomer = customers.find((c) => c.id === id || c.email === id || c.phone === id);
  const matchedOrder = !foundCustomer
    ? orders.find((o) => o.customerId === id || o.id === id || o.customerEmail === id)
    : null;

  // No fallback to customers[0]: a deleted or unknown id must show "not found",
  // never another customer's profile.
  const customer: DemoCustomer | null =
    foundCustomer ??
    (matchedOrder
      ? {
          id: matchedOrder.customerId,
          name: matchedOrder.customerName,
          email: matchedOrder.customerEmail,
          phone: matchedOrder.customerPhone,
          city: matchedOrder.city,
          state: matchedOrder.state,
          pincode: matchedOrder.pincode,
          address: matchedOrder.address,
          joinedAt: matchedOrder.createdAt.slice(0, 10),
          source: "Direct",
          savedAddresses: [],
        }
      : null);

  if (!customer) {
    return (
      <div className={`${card} p-8 text-center`}>
        <p className="text-[#6f6565]">Customer not found.</p>
        <Link href="/admin/customers" className={`${outlineBtn} mt-4`}>
          Back to Customers
        </Link>
      </div>
    );
  }

  const customerOrders = orders.filter(
    (o) =>
      o.customerId === customer.id ||
      (customer.email && o.customerEmail?.toLowerCase() === customer.email.toLowerCase()) ||
      (customer.phone && o.customerPhone === customer.phone)
  );
  const validCustomerOrders = customerOrders.filter(
    (o) => o.status !== "Cancelled" && o.status !== "Failed"
  );
  const totalSpent =
    customer.totalSpent !== undefined
      ? Number(customer.totalSpent)
      : validCustomerOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const currentStatus: "Active" | "Inactive" =
    statusOverride ?? ((customer.status ?? "Active") as "Active" | "Inactive");
  const isActive = currentStatus === "Active";

  const persistCustomers = (list: DemoCustomer[]) => {
    try {
      localStorage.setItem(KEYS.customers, JSON.stringify(list));
    } catch (_) {}
  };

  const toggleStatus = async () => {
    const previousStatus = currentStatus;
    const nextStatus: "Active" | "Inactive" = isActive ? "Inactive" : "Active";

    // Update the screen immediately
    setStatusOverride(nextStatus);
    setCustomers((prev) => {
      const updated = prev.map((c) =>
        c.id === customer.id ? { ...c, status: nextStatus } : c
      );
      persistCustomers(updated);
      return updated;
    });

    try {
      const adminToken = localStorage.getItem("izha_admin_token");
      const token = adminToken || localStorage.getItem(KEYS.token);
      const res = await fetch(
        apiUrl(`/admin/customers/${encodeURIComponent(customer.id)}/status`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "x-admin-request": "true",
          },
          body: JSON.stringify({
            active: nextStatus === "Active",
            status: nextStatus,
          }),
        }
      );
      if (!res.ok) throw new Error(`Status update failed (${res.status})`);
      window.dispatchEvent(new Event("izha-store-sync"));
    } catch (err) {
      console.error(err);
      // Server rejected it: put the old status back
      setStatusOverride(previousStatus);
      setCustomers((prev) => {
        const reverted = prev.map((c) =>
          c.id === customer.id ? { ...c, status: previousStatus } : c
        );
        persistCustomers(reverted);
        return reverted;
      });
    }
  };

  /** Runs after the person presses Delete in the alert box. */
  const confirmDelete = async () => {
    setConfirmOpen(false);
    setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null;
      await fetch(`/api/admin/customers/${encodeURIComponent(customer.id)}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      window.dispatchEvent(new Event("izha-store-sync"));
    } catch (err) {
      console.error(err);
    }
    router.push("/admin/customers");
  };

  return (
    <div>
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#B20947] hover:underline transition-colors"
      >
        <ArrowLeft size={16} /> Back to Customers
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-[1fr_1.5fr]">
        {/* Customer profile */}
        <Panel>
          <div className="flex items-center gap-3.5 border-b border-black/5 pb-4 sm:gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#E8B8C5] bg-[#FFF5F7] text-[22px] font-semibold text-[#B20947] sm:h-14 sm:w-14 sm:text-[24px]">
              {customer.name.charAt(0)}
            </span>
            <div className="min-w-0">
              <h2
                className={`${serif} m-0 break-words text-[24px] font-medium leading-tight sm:text-[28px]`}
                style={{ color: CRIMSON }}
              >
                {customer.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="lining-nums m-0 text-[12px] text-black/55">Joined {customer.joinedAt}</p>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    isActive ? "bg-[#eef7f0] text-[#3a6b42]" : "bg-[#f3efef] text-[#6f6565]"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-[14px]">
            <p className="m-0 flex items-center gap-2.5 text-[#332B2B]">
              <Phone size={16} className="shrink-0 text-[#B20947]" />
              <span className="lining-nums leading-snug">+91 {customer.phone}</span>
            </p>
            <p className="m-0 flex min-w-0 items-center gap-2.5 text-[#332B2B]">
              <Mail size={16} className="shrink-0 text-[#B20947]" />
              <span className="break-all leading-snug">{customer.email}</span>
            </p>
            <p className="m-0 flex items-start gap-2.5 text-black/60">
              <MapPin size={16} className="mt-0.5 shrink-0 text-[#B20947]" />
              <span className="break-words leading-snug">
                {customer.address}, {customer.city}, {customer.state} —{" "}
                <span className="lining-nums">{customer.pincode}</span>
              </span>
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatCard label="Total Orders" value={String(customer.ordersCount !== undefined ? customer.ordersCount : validCustomerOrders.length)} />
            <StatCard label="Lifetime Spend" value={inr(totalSpent)} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleStatus}
              className={`${outlineBtn} cursor-pointer`}
            >
              {isActive ? "Deactivate" : "Activate"}
            </button>
            <button type="button" onClick={() => setConfirmOpen(true)} className={DELETE_BTN}>
              Delete
            </button>
          </div>
        </Panel>

        {/* Order history */}
        <Panel
          title={
            <>
              <ShoppingBag size={20} />
              Order History ({customerOrders.length})
            </>
          }
        >
          {customerOrders.length === 0 ? (
            <p className="m-0 text-[14px] text-black/55">No orders recorded yet.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {customerOrders.map((ord) => (
                <li key={ord.id}>
                  <Link
                    href={`/admin/orders/details?id=${encodeURIComponent(ord.id)}`}
                    className="block min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-4 no-underline transition-colors hover:border-[#B20947]/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="lining-nums min-w-0 break-all text-[14px] font-semibold"
                        style={{ color: CRIMSON }}
                      >
                        {ord.id}
                      </span>
                      <span className="inline-block shrink-0 rounded-full bg-[#F9E3E9] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8F3057]">
                        {ord.status}
                      </span>
                    </div>
                    <p className="lining-nums m-0 mt-2 text-[13px] text-black/55">
                      {ord.createdAt} · {ord.paymentMethod} ({ord.paymentStatus})
                    </p>
                    <p className="lining-nums m-0 mt-1.5 break-words text-[14px] font-semibold text-[#332B2B]">
                      Total: {inr(ord.total)} · {ord.items.map((i) => `${i.name} (${i.size})`).join(", ")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Delete confirmation alert box */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this customer?"
        message={
          <>
            <strong>{customer.name}</strong> will be permanently removed. This cannot be undone.
          </>
        }
        confirmLabel="Delete Customer"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

export default function AdminCustomerDetailsPage() {
  return (
    <AdminShell title="Customer Details">
      {/* Heading block */}
      <h2
        className={`${serif} mb-2 mt-0 break-words font-medium leading-tight`}
        style={{ color: CRIMSON, fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
      >
        Customer Details
      </h2>
      <p className="mb-6 mt-0 text-[14px] text-black/60 sm:text-[15px] md:mb-10">
        Full customer profile, contact information, saved addresses, and order history
      </p>

      <Suspense fallback={<div className="p-6 text-sm text-[#6f6565]">Loading customer...</div>}>
        <CustomerDetailsInner />
      </Suspense>
    </AdminShell>
  );
}