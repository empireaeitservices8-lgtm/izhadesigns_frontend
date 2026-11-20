"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Home,
  MapPin,
  Navigation,
  PackageCheck,
  RotateCcw,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { KEYS, inr, useStored } from "@/lib/izha-store";
import { DEFAULT_ORDERS, type DemoOrder } from "@/lib/demo-store";
import {
  PageShell,
  PageTitle,
  card,
  outlineBtn,
  serif,
  solidBtn,
} from "@/components/izha/ui";
import { WhatsAppSvg } from "@/components/WhatsAppFloat";

type StatusHistoryItem = {
  status: string;
  timestamp: string;
  note?: string;
};

type TrackedOrder = {
  orderNumber: string;
  createdAt: string;
  updatedAt?: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: {
    city: string;
    state: string;
    pincode: string;
    maskedLine?: string;
    displayArea: string;
  };
  items: Array<{
    id: string;
    name: string;
    image?: string;
    size: string;
    qty: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  status: string;
  statusHistory: StatusHistoryItem[];
  paymentMethod: string;
  paymentStatus: string;
  trackingNumber?: string | null;
};

const TIMELINE_STEPS = [
  { key: "Order Placed", label: "Order Placed", icon: ShoppingBag },
  { key: "Confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "Processing", label: "Processing", icon: PackageCheck },
  { key: "Shipped", label: "Shipped", icon: Truck },
  { key: "Out for Delivery", label: "Out for Delivery", icon: Navigation },
  { key: "Delivered", label: "Delivered", icon: Home },
] as const;

const IST = "Asia/Kolkata";

function getStepIndex(status: string): number {
  const norm = (status || "").toLowerCase().trim();
  if (norm.includes("cancel") || norm.includes("fail")) return -1;
  if (norm === "order placed" || norm.includes("placed")) return 0;
  if (norm === "confirmed") return 1;
  if (norm === "processing" || norm === "packed") return 2;
  if (norm === "shipped") return 3;
  if (norm === "out for delivery" || norm.includes("out for")) return 4;
  if (norm === "delivered") return 5;
  return 0;
}

// If the timestamp has no timezone, treat it as UTC.
// Formats accurately in Indian Standard Time (Asia/Kolkata) with IST suffix.
function parseDate(value?: string | Date): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  let str = String(value).trim();
  if (str.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  if (str.includes("T")) {
    const d = new Date(str + "Z");
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(str.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? new Date(str) : d;
}

function formatDateTime(isoOrStr?: string): string {
  if (!isoOrStr) return "";
  const d = parseDate(isoOrStr);
  if (!d || isNaN(d.getTime())) return isoOrStr;
  return (
    d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }) + " IST"
  );
}

function formatShortDate(isoOrStr?: string): string {
  const d = parseDate(isoOrStr);
  if (!d) return "";
  return d.toLocaleDateString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
  });
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const paramOrderId =
    searchParams.get("orderId") || searchParams.get("id") || searchParams.get("order") || "";
  const paramPhone =
    searchParams.get("phone") || searchParams.get("mobile") || "";

  const [localOrders] = useStored<DemoOrder[]>(KEYS.orders, DEFAULT_ORDERS);
  const [adminProducts] = useStored<any[]>(KEYS.adminProducts, []);
  const [phone, setPhone] = useState(paramPhone ? paramPhone.replace(/\D/g, "") : "");
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAllOrders, setShowAllOrders] = useState(false);

  const lookupOrders = async (phoneToQuery: string) => {
    const cleanPhone = phoneToQuery.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          orderId: paramOrderId || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data?.success && Array.isArray(data.orders) && data.orders.length > 0) {
        setOrders(data.orders);
        const matchParam = data.orders.find(
          (o: TrackedOrder) =>
            paramOrderId &&
            (o.orderNumber.toUpperCase() === paramOrderId.toUpperCase() ||
              (o as any).id === paramOrderId)
        );
        setSelectedOrderNumber(matchParam ? matchParam.orderNumber : data.orders[0].orderNumber);
        setErrorMessage(null);
      } else {
        const phoneSuffix = cleanPhone.slice(-10);
        const localMatches = localOrders.filter(
          (o) => (o.customerPhone || "").replace(/\D/g, "").slice(-10) === phoneSuffix
        );

        if (localMatches.length > 0) {
          const mapped: TrackedOrder[] = localMatches.map((local) => {
            const nameParts = (local.customerName || "Customer").split(" ");
            const maskedName =
              nameParts.length > 1
                ? `${nameParts[0]} ${nameParts.slice(1).map((p) => p[0] + "***").join(" ")}`
                : local.customerName;

            return {
              orderNumber: local.id,
              createdAt: local.createdAt,
              updatedAt: local.createdAt,
              customerName: maskedName,
              customerPhone: `••••••${phoneSuffix.slice(-4)}`,
              shippingAddress: {
                city: local.city,
                state: local.state,
                pincode: local.pincode,
                maskedLine: local.address ? `${local.address.slice(0, 8)}...` : "",
                displayArea: `${local.city}, ${local.state} - ${local.pincode}`,
              },
              items: (local.items || []).map((it) => ({
                id: it.id,
                name: it.name,
                image: it.image,
                size: it.size,
                qty: it.qty,
                price: it.price,
                total: it.price * it.qty,
              })),
              subtotal: local.subtotal,
              discount: local.discount,
              shippingFee: local.shipping,
              total: local.total,
              status: local.status,
              statusHistory: [
                {
                  status: local.status,
                  timestamp: local.createdAt,
                  note: "Order recorded in session.",
                },
              ],
              paymentMethod: local.paymentMethod,
              paymentStatus: local.paymentStatus,
              trackingNumber: local.paymentRef,
            };
          });

          setOrders(mapped);
          setSelectedOrderNumber(mapped[0].orderNumber);
          setErrorMessage(null);
        } else {
          setOrders([]);
          setErrorMessage(data?.message || "No orders found matching this mobile number.");
        }
      }
    } catch (err) {
      setOrders([]);
      setErrorMessage("No orders found matching this mobile number.");
    } finally {
      setLoading(false);
    }
  };

  // Automatically load phone number if saved in customer profile or passed via URL
  useEffect(() => {
    if (paramPhone && paramPhone.replace(/\D/g, "").length >= 10) {
      lookupOrders(paramPhone.replace(/\D/g, ""));
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const savedUser = localStorage.getItem("izha_user");
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.phone && !phone) setPhone(u.phone.replace(/\D/g, ""));
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramPhone]);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await lookupOrders(phone);
  };

  const handleReset = () => {
    setOrders([]);
    setErrorMessage(null);
    setShowAllOrders(false);
  };

  const activeOrder = orders.find((o) => o.orderNumber === selectedOrderNumber) || orders[0];

  const normStatus = (activeOrder?.status || "").toLowerCase().trim();
  const isCancelled = normStatus.includes("cancel");
  const isFailed = normStatus.includes("fail");
  const currentStepIndex = activeOrder ? getStepIndex(activeOrder.status) : 0;

  const whatsappInquiryUrl = activeOrder
    ? "https://wa.me/919995757612?text=" +
      encodeURIComponent(
        `Hi IZHA BLOOMS, I would like to check the delivery status of my order ${activeOrder.orderNumber}.`
      )
    : "https://wa.me/919995757612";

  return (
    <PageShell>
      <PageTitle
        title="Where's My Order?"
        sub="Enter your mobile number and we will show every order linked to it, along with its latest delivery update."
      />

      <div className="mx-auto mt-8 max-w-2xl space-y-6 sm:mt-10">
        {/* Simple Phone Number Lookup Card */}
        {orders.length === 0 && (
          <div className={`${card} p-5 sm:p-7`}>
            <form onSubmit={handleTrackSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="phoneInput"
                  className="block text-[13px] font-semibold uppercase tracking-[0.12em] text-[#332B2B]"
                >
                  Enter Your Mobile Number
                </label>
                <div className="mt-2 flex rounded-xl border border-[#E8B8C5] bg-[#FCF8F3] focus-within:border-[#B20947] focus-within:ring-2 focus-within:ring-[#F9E3E9]">
                  <span className="flex items-center border-r border-[#E8B8C5] px-3.5 text-[14px] font-medium text-[#6f6565]">
                    +91
                  </span>
                  <input
                    id="phoneInput"
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 10-digit phone number used at checkout"
                    className="w-full bg-transparent px-3 py-3 text-[15px] font-medium text-[#332B2B] outline-none placeholder:text-[#9b9090]"
                    required
                    autoFocus
                  />
                </div>
                <p className="mt-1.5 text-[12px] text-[#6f6565]">
                  No need to find or remember order numbers. We will locate all orders connected to this number.
                </p>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-2.5 rounded-xl border border-[#F9E3E9] bg-[#FFF5F7] p-3.5 text-[13px] text-[#B20947]">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`${solidBtn} w-full justify-center gap-2 py-3.5 text-center sm:text-[14px]`}
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Looking up your order...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Track Order</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Results View */}
        {orders.length > 0 && activeOrder && (
          <div className="space-y-6">
            {/* Multiple Orders Selector */}
            {orders.length > 1 && (
              <div className={`${card} p-4 sm:p-5`}>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f6565]">
                    Your orders ({orders.length})
                  </p>
                  <span className="text-[11px] text-[#9b9090]">Tap one to view</span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {(showAllOrders ? orders : orders.slice(0, 4)).map((ord) => {
                    const isSelected = ord.orderNumber === activeOrder.orderNumber;
                    return (
                      <button
                        key={ord.orderNumber}
                        type="button"
                        onClick={() => setSelectedOrderNumber(ord.orderNumber)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? "border-[#B20947] bg-[#FFF5F7] ring-2 ring-[#F9E3E9]"
                            : "border-[#E8CFD2] bg-white hover:border-[#B20947]"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="block truncate font-mono text-[12px] font-semibold text-[#B20947]">
                            #{ord.orderNumber}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-[#6f6565]">
                            {formatDateTime(ord.createdAt)}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="block rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#332B2B] shadow-xs">
                            {ord.status}
                          </span>
                          <span className="mt-1 block text-[12px] font-semibold text-[#332B2B]">
                            {inr(ord.total)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {orders.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllOrders((v) => !v)}
                    className="mt-3 w-full text-center text-[12px] font-semibold text-[#B20947] hover:underline"
                  >
                    {showAllOrders ? "Show fewer orders" : `Show all ${orders.length} orders`}
                  </button>
                )}
              </div>
            )}

            {/* Main Order Details Card */}
            <div className={`${card} space-y-6 p-5 sm:p-7`}>
              {/* Header: Order ID & Summary Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8CFD2] pb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#B5607A]">
                    Order Tracking
                  </p>
                  <h2 className={`${serif} mt-0.5 text-[24px] font-medium text-[#332B2B] sm:text-[28px]`}>
                    #{activeOrder.orderNumber}
                  </h2>
                  <p className="mt-0.5 text-[12px] text-[#6f6565]">
                    Placed on {formatDateTime(activeOrder.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-3.5 py-1 text-[12px] font-semibold uppercase tracking-wider ${
                      isCancelled
                        ? "bg-[#FFF5F7] text-[#B20947]"
                        : isFailed
                        ? "bg-[#FCEDEA] text-[#b33927]"
                        : activeOrder.status === "Delivered"
                        ? "bg-[#EEF7F0] text-[#3a6b42]"
                        : "bg-[#FFF5F7] text-[#B20947]"
                    }`}
                  >
                    {activeOrder.status}
                  </span>
                  <span className="text-[11px] text-[#6f6565]">
                    Recipient: {activeOrder.customerName}
                  </span>
                </div>
              </div>

              {/* Timeline: 6-Step Order Status Progress */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.15em] text-[#6f6565]">
                    Delivery Progress
                  </h3>
                  {activeOrder.updatedAt && (
                    <span className="flex items-center gap-1 text-[11px] text-[#9b9090]">
                      <Clock size={12} />
                      Last update: {formatDateTime(activeOrder.updatedAt)}
                    </span>
                  )}
                </div>

                {isCancelled ? (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#F9E3E9] bg-[#FFF5F7] p-4 text-[13px] text-[#B20947]">
                    <AlertCircle size={20} className="shrink-0" />
                    <div>
                      <strong className="block font-semibold">This order has been cancelled</strong>
                      <span className="text-[12px]">
                        If you have questions regarding a refund or cancellation, please reach out to us on WhatsApp.
                      </span>
                    </div>
                  </div>
                ) : isFailed ? (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#F9E3E9] bg-[#FFF5F7] p-4 text-[13px] text-[#B20947]">
                    <AlertCircle size={20} className="shrink-0" />
                    <div>
                      <strong className="block font-semibold">Order processing failed</strong>
                      <span className="text-[12px]">
                        Please contact our team via WhatsApp to resolve this order.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6">
                    <div className="grid grid-cols-3 gap-y-6 sm:grid-cols-6 sm:gap-y-0">
                      {TIMELINE_STEPS.map((step, i) => {
                        const StepIcon = step.icon;
                        const isCompleted = currentStepIndex > i;
                        const isCurrent = currentStepIndex === i;

                        const histEntry = activeOrder.statusHistory?.find(
                          (h) => h.status.toLowerCase().trim() === step.key.toLowerCase().trim()
                        );

                        return (
                          <div key={step.key} className="relative flex flex-col items-center px-1 text-center">
                            {i < TIMELINE_STEPS.length - 1 && (
                              <div
                                className={`absolute left-1/2 top-4 hidden h-[2px] w-full sm:block ${
                                  currentStepIndex > i ? "bg-[#B20947]" : "bg-[#E8CFD2]"
                                }`}
                              />
                            )}

                            <div
                              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 ${
                                isCompleted
                                  ? "border-[#B20947] bg-[#B20947] text-white shadow-sm"
                                  : isCurrent
                                  ? "border-[#B20947] bg-[#B20947] text-white ring-4 ring-[#F9E3E9]"
                                  : "border-[#E8CFD2] bg-[#FCF8F3] text-[#9b9090]"
                              }`}
                            >
                              <StepIcon size={16} />
                            </div>

                            <p
                              className={`mt-2 text-[11px] font-medium leading-tight ${
                                isCurrent
                                  ? "font-bold text-[#B20947]"
                                  : isCompleted
                                  ? "text-[#332B2B]"
                                  : "text-[#9b9090]"
                              }`}
                            >
                              {step.label}
                            </p>

                            {histEntry?.timestamp && (
                              <span className="mt-1 block text-[10px] text-[#6f6565]">
                                {formatShortDate(histEntry.timestamp)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Courier Tracking Reference */}
              {activeOrder.trackingNumber && (
                <div className="rounded-xl border border-[#E8CFD2] bg-[#FAF1E4]/50 p-3.5 text-[13px] text-[#6f6565]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium text-[#332B2B]">
                      <Truck size={16} className="text-[#B20947]" />
                      Courier Tracking Reference:
                    </span>
                    <span className="rounded bg-white px-2 py-0.5 font-mono text-[12px] font-semibold text-[#B20947] shadow-sm">
                      {activeOrder.trackingNumber}
                    </span>
                  </div>
                </div>
              )}

              {/* Ordered Products Section */}
              {Array.isArray(activeOrder.items) && activeOrder.items.length > 0 && (
                <div className="border-t border-[#E8CFD2] pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6f6565]">
                      Ordered Items ({activeOrder.items.length})
                    </p>
                    <span className="text-[11px] text-[#6f6565]">Click any item to view product details page</span>
                  </div>
                  <ul className="mt-3 divide-y divide-[#E8CFD2]">
                    {activeOrder.items.map((item, idx) => (
                      <li key={`${item.id}-${idx}`}>
                        <Link
                          href={`/product/${encodeURIComponent(item.id)}`}
                          className="group flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition-all hover:bg-[#FAF1E4] hover:shadow-xs"
                          title="Click to view full product details page"
                        >
                          <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg border border-[#E8B8C5] bg-[#FFF5F7]">
                            <Image
                              src={item.image || "/images/about.jpg"}
                              alt={item.name}
                              fill
                              sizes="48px"
                              unoptimized={true}
                              className="object-cover transition-transform group-hover:scale-105"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-[13px] font-medium text-[#332B2B] group-hover:text-[#B20947]">
                              {item.name}
                            </p>
                            <p className="text-[12px] text-[#6f6565]">
                              Size: <strong className="text-[#332B2B]">{item.size}</strong> · Qty: <strong className="text-[#332B2B]">{item.qty}</strong> · {inr(item.price)} each
                            </p>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B20947] opacity-80 group-hover:opacity-100">
                              <Eye size={12} /> View product details
                            </span>
                          </div>
                          <span className="shrink-0 text-[13px] font-semibold text-[#332B2B]">
                            {inr(item.total || item.price * item.qty)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Privacy-Conscious Delivery & Payment Details */}
              <div className="rounded-xl border border-[#E8CFD2] bg-[#FAF1E4]/60 p-4 text-[13px] text-[#6f6565]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="flex items-center gap-1.5 font-semibold text-[#332B2B]">
                      <MapPin size={15} className="text-[#B20947]" />
                      Delivery Destination
                    </span>
                    <p className="mt-1 text-[#332B2B]">
                      {activeOrder.customerName} · {activeOrder.customerPhone}
                    </p>
                    <p className="mt-0.5 text-[#6f6565]">
                      {activeOrder.shippingAddress.maskedLine && (
                        <span className="block text-[#9b9090]">
                          {activeOrder.shippingAddress.maskedLine}
                        </span>
                      )}
                      {activeOrder.shippingAddress.displayArea}
                    </p>
                  </div>
                  <div className="border-t border-[#E8CFD2] pt-3 sm:border-0 sm:pt-0 sm:text-right">
                    <span className="font-semibold text-[#332B2B]">Payment &amp; Total</span>
                    <p className="mt-1 text-[#6f6565]">
                      Method: <strong>{activeOrder.paymentMethod}</strong> ({activeOrder.paymentStatus})
                    </p>
                    <div className="mt-1 space-y-0.5 text-[12px]">
                      <p>Subtotal: {inr(activeOrder.subtotal)}</p>
                      {activeOrder.discount > 0 && (
                        <p className="text-[#B20947]">Discount: -{inr(activeOrder.discount)}</p>
                      )}
                      <p>
                        Delivery:{" "}
                        {activeOrder.shippingFee === 0 ? "FREE" : inr(activeOrder.shippingFee)}
                      </p>
                    </div>
                    <p className="mt-1 text-[15px] font-bold text-[#B20947]">
                      Total: {inr(activeOrder.total)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 border-t border-[#E8CFD2] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <a
                  href={whatsappInquiryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 text-[13px] font-semibold text-[#B20947] hover:underline"
                >
                  <WhatsAppSvg size={16} />
                  Need help? WhatsApp us about this order
                </a>

                <button
                  type="button"
                  onClick={handleReset}
                  className={`${outlineBtn} !py-2 text-[12px] gap-1.5`}
                >
                  <RotateCcw size={14} />
                  Check Another Number
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Back to Shopping */}
        <div className="pt-2 text-center">
          <Link href="/shop" className={`${outlineBtn} !py-2.5 text-[12px]`}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B20947] border-t-transparent" />
          </div>
        </PageShell>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}