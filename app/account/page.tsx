// 
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  Eye,
  Heart,
  MapPin,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import {
  KEYS,
  inr,
  useStored,
  getAccountAddressKey,
  type Address,
  type AppUser,
  type CartItem,
  type WishItem,
} from "@/lib/izha-store";
import { apiUrl } from "@/lib/api-config";
import { type AdminProduct, type DemoOrder } from "@/lib/demo-store";
import { WhatsAppSvg } from "@/components/WhatsAppFloat";
import AlertBox from "@/components/izha/AlertBox";
import UnifiedAuthForm from "@/components/izha/UnifiedAuthForm";
import {
  FlowerBadge,
  PageHero,
  PageShell,
  card,
  focusRing,
  glassBtn,
  inputCls,
  outlineBtn,
  serif,
  solidBtn,
} from "@/components/izha/ui";

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "tel" | "email" | "text";
  maxLength?: number;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-[#332B2B]">
        {label}
      </span>
      <input
        className={inputCls}
        type={type}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ErrorBox({ text }: { text: string }) {
  return <AlertBox variant="error" message={text} />;
}

/** Section title with the thin pink line used across the storefront pages */
function SectionTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="min-w-0">
      <h2 className={`${serif} m-0 text-[24px] font-medium leading-tight text-[#332B2B] sm:text-[28px]`}>
        {children}
      </h2>
      <span className="mt-1 block h-[2px] w-14 bg-[#E8B8C5]" />
      {note && <p className="mb-0 mt-2 text-[12px] text-[#6f6565]">{note}</p>}
    </div>
  );
}

/* =====================================================================
   Page
   ===================================================================== */
function AccountView() {
  const [user, setUser, ready] = useStored<AppUser | null>(KEYS.user, null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const msgParam = searchParams?.get("msg");
  const errorParam = searchParams?.get("error");
  const nextParam = searchParams?.get("next");

  const initialError =
    msgParam ||
    (errorParam === "denied"
      ? "Access denied. Administrator privileges required."
      : "");

  useEffect(() => {
    if (ready && user) {
      const isAdmin =
        user.role === "admin" ||
        user.role === "SUPER_ADMIN" ||
        user.role === "SECONDARY_ADMIN" ||
        user.isAdmin === true;
      if (isAdmin) {
        router.push("/admin/homepage");
      }
    }
  }, [ready, user, router]);

  const signOut = () => {
    try {
      localStorage.removeItem(KEYS.token);
      localStorage.removeItem(KEYS.user);
      localStorage.removeItem("izha_admin_token");
      localStorage.removeItem("izha_admin_user");
      localStorage.removeItem(KEYS.addresses);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("izha-account-change", { detail: null }));
        window.dispatchEvent(new CustomEvent("izha-store-sync", { detail: KEYS.cart }));
        window.dispatchEvent(new CustomEvent("izha-store-sync", { detail: KEYS.addresses }));
        window.dispatchEvent(new CustomEvent("izha-store-sync", { detail: KEYS.user }));
      }
    } catch {
      /* ignore */
    }
    setUser(null);
  };

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B20947] border-t-transparent" />
      </div>
    );
  }

  const isCustomer =
    user &&
    !user.isAdmin &&
    user.role !== "admin" &&
    user.role !== "SUPER_ADMIN" &&
    user.role !== "SECONDARY_ADMIN";

  if (isCustomer) {
    return <SignedIn user={user} setUser={setUser} onSignOut={signOut} />;
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center py-6 sm:py-10">
      <UnifiedAuthForm
        initialMode="signin"
        initialError={initialError}
        redirectTo={nextParam || undefined}
        showCloseButton={false}
        showGuestCheckout={true}
        onSuccess={(u) => {
          const isAdmin =
            u.role === "admin" ||
            u.role === "SUPER_ADMIN" ||
            u.role === "SECONDARY_ADMIN" ||
            u.isAdmin === true;
          if (isAdmin) {
            router.push("/admin/homepage");
          } else {
            setUser(u);
          }
        }}
      />
    </div>
  );
}

export default function AccountPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B20947] border-t-transparent" />
          </div>
        }
      >
        <AccountView />
      </Suspense>
    </PageShell>
  );
}

/* =====================================================================
   Signed in
   ===================================================================== */
function SignedIn({
  user,
  setUser,
  onSignOut,
}: {
  user: AppUser;
  setUser: (u: AppUser) => void;
  onSignOut: () => void;
}) {
  const [cart] = useStored<CartItem[]>(KEYS.cart, []);
  const [wish] = useStored<WishItem[]>(KEYS.wish, []);
  const [dbOrders, setDbOrders] = useState<DemoOrder[]>([]);
  const [tab, setTab] = useState<"orders" | "addresses">("orders");
  const [showAllOrders, setShowAllOrders] = useState(false);

  useEffect(() => {
    // Clear previously loaded order data when logging out or switching accounts
    setDbOrders([]);
    const token = typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null;
    if (!token) return;

    fetch(apiUrl("/orders"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.orders)) {
          const mapped: DemoOrder[] = data.orders.map((bo: any) => ({
            id: bo.orderNumber || bo.id,
            createdAt: bo.createdAt ? new Date(bo.createdAt).toLocaleDateString("en-IN") : "Recent",
            customerId: bo.customerId || bo.customerEmail || "customer",
            customerName: bo.customerName,
            customerPhone: bo.customerPhone,
            customerEmail: bo.customerEmail,
            address: bo.shippingAddress?.line || bo.shippingAddress?.address || "",
            city: bo.shippingAddress?.city || "Kerala",
            state: bo.shippingAddress?.state || "Kerala",
            pincode: bo.shippingAddress?.pincode || "",
            items: bo.items || [],
            subtotal: bo.subtotal,
            discount: bo.discount || 0,
            shipping: bo.shippingFee || 0,
            total: bo.total,
            paymentMethod: bo.paymentMethod,
            paymentStatus: bo.paymentStatus,
            paymentRef: bo.paymentRef || "REF-" + (bo.orderNumber || bo.id),
            status: bo.status,
            source: "Direct",
          }));
          setDbOrders(mapped);
        } else {
          setDbOrders([]);
        }
      })
      .catch(() => {
        setDbOrders([]);
      });
  }, [user?.id, user?.email]);

  useEffect(() => {
    const handleAccountChange = () => {
      setDbOrders([]);
    };
    window.addEventListener("izha-account-change", handleAccountChange);
    return () => {
      window.removeEventListener("izha-account-change", handleAccountChange);
    };
  }, []);

  const first = user.name.split(" ")[0];
  const cartCount = cart.reduce((n, i) => n + i.qty, 0);

  // Strictly filter orders to only include orders belonging to the currently authenticated customer
  const myOrders = useMemo(() => {
    return dbOrders.filter((o) => {
      const matchId = user.id && o.customerId && o.customerId === user.id;
      const matchEmail = user.email && o.customerEmail && o.customerEmail.toLowerCase() === user.email.toLowerCase();
      const matchPhone = user.phone && o.customerPhone && o.customerPhone === user.phone;
      return matchId || matchEmail || matchPhone;
    });
  }, [dbOrders, user]);

  const visibleOrders = showAllOrders ? myOrders : myOrders.slice(0, 4);

  const goToOrders = () => {
    setTab("orders");
    document.getElementById("account-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const stats = [
    { href: "/wishlist", icon: Heart, title: "Wishlist", text: `${wish.length} ${wish.length === 1 ? "piece" : "pieces"} saved` },
    { href: "/addtocart", icon: ShoppingBag, title: "Shopping Bag", text: `${cartCount} ${cartCount === 1 ? "item" : "items"} waiting` },
    { href: "", icon: Package, title: "My Orders", text: `${myOrders.length} recent orders` },
  ];

  return (
    <>
      <PageHero
        label="Welcome back"
        title={`Hello, ${first}`}
        sub={user.email || (user.phone ? `+91 ${user.phone}` : "IZHA Circle Member")}
        top={
          <div className="mx-auto mb-5 flex h-24 w-20 items-center justify-center rounded-t-full border-2 border-white/80 bg-white/40 backdrop-blur-md">
            <span className={`${serif} text-[38px] font-medium text-[#B20947]`}>
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        }
      >
        <Link href="/addtocart" className={glassBtn}>Shopping Bag</Link>
        <Link href="/wishlist" className={glassBtn}>Wishlist</Link>
      </PageHero>

      {/* Quick tiles: icon in a small arch, like the category cards */}
      <div className="mt-10 grid grid-cols-3 gap-2.5 sm:gap-4">
        {stats.map(({ href, icon: Icon, title, text }) => {
          const inner = (
            <>
              <span className="mx-auto flex h-12 w-10 items-center justify-center rounded-t-full border border-[#E8B8C5] bg-[#FFF5F7] text-[#E99A9F] sm:h-14 sm:w-12">
                <Icon size={20} strokeWidth={1.5} />
              </span>
              <p className={`${serif} mt-2 text-[16px] font-medium leading-tight text-[#332B2B] sm:text-[22px]`}>{title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#6f6565] sm:text-[13px]">{text}</p>
            </>
          );
          const cls = `${card} block w-full p-3 text-center transition-colors hover:bg-[#FFF5F7] sm:p-5 ${focusRing}`;
          return href ? (
            <Link key={title} href={href} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={title} type="button" onClick={goToOrders} className={cls}>
              {inner}
            </button>
          );
        })}
      </div>

      {/* Bag preview */}
      {cart.length > 0 && (
        <div className={`${card} mt-4 flex flex-wrap items-center gap-4 p-4`}>
          <div className="flex -space-x-3">
            {cart.slice(0, 4).map((i) => (
              <div key={`${i.id}-${i.size}`} className="relative h-14 w-12 overflow-hidden rounded-t-full rounded-b-md border-2 border-white bg-[#FFF5F7] shadow-sm">
                <Image src={i.image} alt={i.name} fill sizes="48px" quality={75} className="object-cover" />
              </div>
            ))}
          </div>
          <p className="min-w-0 flex-1 basis-40 text-[14px] text-[#6f6565]">
            Your bag has {cartCount} {cartCount === 1 ? "piece" : "pieces"} ready to check out.
          </p>
          <Link href="/checkout" className={outlineBtn}>Checkout</Link>
        </div>
      )}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        {/* ---------- Main: tabs for Orders and Addresses ---------- */}
        <section id="account-tabs" className={`${card} min-w-0 scroll-mt-24 p-4 sm:p-6`}>
          <div
            role="tablist"
            aria-label="Account sections"
            className="mb-5 flex gap-1 rounded-full border border-[#E8B8C5] bg-[#FFF5F7] p-1"
          >
            {(
              [
                { key: "orders", label: "My Orders", icon: Package },
                { key: "addresses", label: "Saved Addresses", icon: MapPin },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors sm:text-[13px] ${focusRing} ${
                  tab === key ? "bg-[#E99A9F] text-white" : "text-[#332B2B] hover:bg-white"
                }`}
              >
                <Icon size={14} strokeWidth={1.8} />
                {label}
              </button>
            ))}
          </div>

          {/* Orders */}
          <div role="tabpanel" id="order-history" className={tab === "orders" ? "block" : "hidden"}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionTitle>My Orders</SectionTitle>
              <Link href="/track-order" className="text-[13px] font-medium text-[#B20947] underline underline-offset-4">
                Track an order
              </Link>
            </div>

            {myOrders.length === 0 ? (
              <p className="mt-5 text-[14px] text-[#6f6565]">No orders yet. Your orders will show here.</p>
            ) : (
              <ul className="mt-4 divide-y divide-[#E8CFD2] border-y border-[#E8CFD2]">
                {visibleOrders.map((ord) => (
                  <li key={ord.id} className="py-3.5 px-2 -mx-2 rounded-xl transition-colors hover:bg-[#FFF5F7]/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#332B2B]">
                            {ord.id}
                          </span>
                          <span className="rounded-full bg-[#F9E3E9] px-2.5 py-0.5 text-[11px] font-semibold text-[#B20947]">
                            {ord.status}
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-[#6f6565]">
                          {ord.createdAt} · {ord.items.length} {ord.items.length === 1 ? "item" : "items"} · {ord.paymentMethod}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <p className={`${serif} text-[20px] font-medium text-[#B20947]`}>{inr(ord.total)}</p>
                        <Link
                          href={`/track-order?orderId=${encodeURIComponent(ord.id)}`}
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#B20947] hover:underline"
                        >
                          Track Status <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>

                    {/* Ordered items listing - click navigates to product page */}
                    {Array.isArray(ord.items) && ord.items.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-[#E8CFD2]/60">
                        {ord.items.map((item, idx) => (
                          <Link
                            key={`${item.id}-${idx}`}
                            href={`/product/${encodeURIComponent(item.id)}`}
                            className="group/item flex items-center gap-2 rounded-lg border border-[#E8CFD2] bg-white px-2.5 py-1.5 text-left transition-all hover:border-[#B20947] hover:bg-[#FAF1E4]"
                            title="Click to view full product details page"
                          >
                            <div className="relative h-9 w-8 shrink-0 overflow-hidden rounded border border-[#E8B8C5] bg-[#FFF5F7]">
                              <Image
                                src={item.image || "/images/about.jpg"}
                                alt={item.name}
                                fill
                                sizes="32px"
                                unoptimized={true}
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 max-w-[140px] sm:max-w-[200px]">
                              <p className="truncate text-[12px] font-medium text-[#332B2B] group-hover/item:text-[#B20947]">
                                {item.name}
                              </p>
                              <p className="text-[10px] text-[#6f6565]">
                                Size: {item.size} · Qty: {item.qty}
                              </p>
                            </div>
                            <Eye size={12} className="text-[#B20947] shrink-0 opacity-70 group-hover/item:opacity-100" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {myOrders.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllOrders((v) => !v)}
                className={`mt-3 rounded text-[13px] font-medium text-[#B20947] underline underline-offset-4 ${focusRing}`}
              >
                {showAllOrders ? "Show fewer orders" : `Show all ${myOrders.length} orders`}
              </button>
            )}
          </div>

          {/* Addresses (kept mounted so a half-filled form is not lost when switching tabs) */}
          <div role="tabpanel" className={tab === "addresses" ? "block" : "hidden"}>
            <AddressBook user={user} />
          </div>
        </section>

        {/* ---------- Side: profile, help, sign out ---------- */}
        <aside className="min-w-0 space-y-6">
          <ProfileCard user={user} setUser={setUser} />
          <div className="rounded-2xl border-2 border-[#E8B8C5] bg-[#FBF1EE] p-6 text-center ring-2 ring-inset ring-white">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#25D366] shadow-sm">
              <WhatsAppSvg size={20} />
            </span>
            <h2 className={`${serif} mt-2 text-[24px] font-medium text-[#332B2B]`}>Need a hand?</h2>
            <p className="mt-1 text-[14px] text-[#6f6565]">
              Ask about sizes, delivery or an order. We reply on WhatsApp and phone.
            </p>
            <a
              href="https://wa.me/919995757612"
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-4 inline-flex items-center gap-2 rounded-full bg-[#E99A9F] px-6 py-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#382B2B] transition-colors hover:text-white ${focusRing}`}
            >
              <WhatsAppSvg size={16} />
              WhatsApp Us
            </a>
            <p className="mt-3 text-[13px] text-[#6f6565]">+91 99957 57612</p>
          </div>
          <button onClick={onSignOut} className={`${outlineBtn} w-full`}>Sign Out</button>
        </aside>
      </div>
    </>
  );
}

/* ---------- Profile details ---------- */
function ProfileCard({ user, setUser }: { user: AppUser; setUser: (u: AppUser) => void }) {
  const [name, setName] = useState(user.name);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const save = () => {
    if (name.trim().length < 2) return setError("Enter your full name, at least 2 letters.");
    setError("");
    setUser({ ...user, name: name.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className={`${card} relative px-5 pb-6 pt-9`}>
      <FlowerBadge />
      <h2 className={`${serif} text-center text-[24px] font-medium text-[#332B2B]`}>Profile details</h2>
      <div className="mt-4 space-y-4">
        {error && <ErrorBox text={error} />}
        {saved && <AlertBox variant="success" message="Your profile name has been updated." />}
        <Field label="Full name" value={name} onChange={setName} autoComplete="name" />
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-[#332B2B]">Email</span>
          <p className="break-words rounded-[10px] bg-[#FFF5F7] px-4 py-3 text-[15px] text-[#6f6565]">{user.email || "Not added"}</p>
        </div>
        {user.phone && (
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-[#332B2B]">Mobile number</span>
            <p className="rounded-[10px] bg-[#FFF5F7] px-4 py-3 text-[15px] text-[#6f6565]">+91 {user.phone}</p>
          </div>
        )}
        <button onClick={save} className={`${outlineBtn} w-full`}>
          {saved ? "Saved" : "Save Name"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Saved addresses: compact cards in a grid ---------- */
function AddressBook({ user }: { user: AppUser | null }) {
  const [list, setList] = useState<Address[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [f, setF] = useState({ label: "Home", name: "", phone: "", line: "", city: "", pincode: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const loadAddresses = () => {
    // Admins do not have customer saved addresses
    const isAdm =
      !user ||
      user.role === "admin" ||
      user.role === "SUPER_ADMIN" ||
      user.role === "SECONDARY_ADMIN" ||
      user.isAdmin === true;
    if (isAdm) {
      setList([]);
      return;
    }

    const storageKey = getAccountAddressKey(user);
    if (storageKey && typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setList(parsed);
          }
        }
      } catch (_) {}
    }

    const token = typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null;
    if (!token) {
      return;
    }

    fetch(apiUrl("/auth/addresses"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.addresses)) {
          const mapped = data.addresses.map((a: any) => ({
            id: a.id,
            label: a.label || "Home",
            name: a.name || "",
            phone: a.phone || "",
            line: a.line || "",
            city: a.city || "",
            pincode: a.pincode || "",
            isDefault: Boolean(a.is_default || a.isDefault),
          }));
          setList(mapped);
          if (storageKey && typeof window !== "undefined") {
            try {
              localStorage.setItem(storageKey, JSON.stringify(mapped));
            } catch (_) {}
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadAddresses();
  }, [user?.id, user?.email]);

  const add = async () => {
    if (f.name.trim().length < 2) return setError("Enter the name of the person receiving the order.");
    if (!/^[6-9]\d{9}$/.test(f.phone)) return setError("Enter a 10 digit mobile number that starts with 6, 7, 8 or 9.");
    if (f.line.trim().length < 6) return setError("Enter the house name or number and the street.");
    if (f.city.trim().length < 2) return setError("Enter your town or city.");
    if (!/^\d{6}$/.test(f.pincode)) return setError("Enter a 6 digit pincode.");
    setError("");

    const token = typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null;
    const storageKey = getAccountAddressKey(user);
    const newAddr: Address = {
      id: `a${Date.now()}`,
      ...f,
      name: f.name.trim(),
      line: f.line.trim(),
      city: f.city.trim(),
      isDefault: list.length === 0,
    };

    if (token) {
      try {
        await fetch(apiUrl("/auth/addresses"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...f,
            name: f.name.trim(),
            line: f.line.trim(),
            city: f.city.trim(),
            isDefault: list.length === 0,
          }),
        });
        loadAddresses();
      } catch (_) {
        setList((l) => {
          const next = [...l, newAddr];
          if (storageKey) try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (_) {}
          return next;
        });
      }
    } else {
      setList((l) => {
        const next = [...l, newAddr];
        if (storageKey) try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (_) {}
        return next;
      });
    }

    setF({ label: "Home", name: "", phone: "", line: "", city: "", pincode: "" });
    setOpen(false);
  };

  const makeDefault = (id: string) => {
    const storageKey = getAccountAddressKey(user);
    setList((l) => {
      const next = l.map((a) => ({ ...a, isDefault: a.id === id }));
      if (storageKey) try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  const remove = async (id: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null;
    const storageKey = getAccountAddressKey(user);
    if (token) {
      try {
        await fetch(apiUrl(`/auth/addresses/${encodeURIComponent(id)}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (_) {}
    }
    setList((l) => {
      const next = l.filter((a) => a.id !== id);
      if (next.length && !next.some((a) => a.isDefault)) next[0] = { ...next[0], isDefault: true };
      if (storageKey) try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Saved addresses</SectionTitle>
        {!open && list.length > 0 && (
          <button onClick={() => setOpen(true)} className={`${outlineBtn} gap-1.5`}>
            <Plus size={14} strokeWidth={2} /> Add Address
          </button>
        )}
      </div>

      {/* Add form: two columns so it stays short */}
      {open && (
        <div className="mt-4 space-y-3 rounded-xl border border-[#E8CFD2] bg-[#FFF5F7] p-4">
          {error && <ErrorBox text={error} />}
          <div className="flex gap-2" role="group" aria-label="Address type">
            {["Home", "Work", "Other"].map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={f.label === l}
                onClick={() => set("label")(l)}
                className={`rounded-full border px-4 py-1.5 text-[12px] ${focusRing} ${
                  f.label === l ? "border-[#E99A9F] bg-[#E99A9F] text-white" : "border-[#E8B8C5] bg-white text-[#332B2B]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" value={f.name} onChange={set("name")} autoComplete="name" />
            <Field label="Mobile number" value={f.phone} onChange={(v) => set("phone")(v.replace(/\D/g, ""))} inputMode="tel" maxLength={10} autoComplete="tel" />
            <Field className="sm:col-span-2" label="House and street" value={f.line} onChange={set("line")} autoComplete="street-address" />
            <Field label="Town or city" value={f.city} onChange={set("city")} autoComplete="address-level2" />
            <Field label="Pincode" value={f.pincode} onChange={(v) => set("pincode")(v.replace(/\D/g, ""))} inputMode="numeric" maxLength={6} autoComplete="postal-code" />
          </div>
          <div className="flex gap-3">
            <button onClick={add} className={`${solidBtn} flex-1`}>Save Address</button>
            <button
              onClick={() => {
                setOpen(false);
                setError("");
              }}
              className={`${outlineBtn} flex-1`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {list.length === 0 && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`mt-4 flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-[#E8B8C5] bg-[#FFFBF5] px-4 py-6 text-center transition-colors hover:bg-[#FFF5F7] ${focusRing}`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8B8C5] text-[#E99A9F]">
            <Plus size={18} strokeWidth={1.8} />
          </span>
          <span className="text-[14px] font-medium text-[#332B2B]">Add your first address</span>
          <span className="text-[12px] text-[#6f6565]">Checkout will be quicker.</span>
        </button>
      )}

      {/* Compact address cards */}
      {list.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {list.map((a) => (
            <li
              key={a.id}
              className={`flex min-w-0 flex-col justify-between rounded-xl border bg-[#FCF8F3] p-3.5 ${
                a.isDefault ? "border-[#E99A9F]" : "border-[#E8CFD2]"
              }`}
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <MapPin size={14} strokeWidth={1.8} className="shrink-0 text-[#E99A9F]" />
                  <span className={`${serif} text-[18px] font-medium leading-none text-[#332B2B]`}>{a.label}</span>
                  {a.isDefault && (
                    <span className="rounded bg-[#F9E3E9] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#B5607A]">Default</span>
                  )}
                </p>
                <p className="mt-2 truncate text-[13px] font-medium text-[#332B2B]">{a.name} · {a.phone}</p>
                <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#6f6565]">
                  {a.line}, {a.city} {a.pincode}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[#E8CFD2] pt-2">
                {a.isDefault ? (
                  <span className="text-[12px] text-[#6f6565]">Used at checkout</span>
                ) : (
                  <button
                    onClick={() => makeDefault(a.id)}
                    className={`rounded text-[12px] text-[#B20947] underline underline-offset-4 ${focusRing}`}
                  >
                    Make default
                  </button>
                )}
                <button
                  onClick={() => remove(a.id)}
                  aria-label={`Remove ${a.label} address`}
                  className={`rounded-full p-1.5 text-[#6f6565] hover:bg-[#FFF5F7] hover:text-[#B20947] ${focusRing}`}
                >
                  <Trash2 size={15} strokeWidth={1.6} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}