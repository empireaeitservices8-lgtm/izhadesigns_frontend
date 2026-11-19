"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ExternalLink,
  ArrowLeft,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Percent,
  ShoppingBag,
  Tag,
  BarChart3,
  UserStar,
  UserCog,
  Users,
  LifeBuoy,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { KEYS, type AppUser } from "@/lib/izha-store";
import { focusRing, serif } from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";
import UnifiedAuthForm from "@/components/izha/UnifiedAuthForm";

/** Admin-panel beige card/box & control classes */
export const card =
  "rounded-2xl border-2 border-[#E8B8C5] bg-[#F3E8D8] ring-2 ring-inset ring-[#F8EFE2]";
export const cardCream =
  "rounded-2xl border-2 border-[#E8B8C5] bg-[#EFE2CE] ring-2 ring-inset ring-[#F6EBDC]";
export const outlineBtn = `inline-flex items-center justify-center rounded-[10px] border-[1.5px] border-[#E99A9F] bg-[#FAF3E8] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#B20947] transition-colors hover:bg-[#EFE2CE] sm:px-5 sm:py-2.5 sm:text-xs md:text-sm disabled:cursor-not-allowed disabled:border-[#d9cfd2] disabled:text-[#b3a9ab] ${focusRing}`;
export const inputCls =
  "w-full min-w-0 rounded-[10px] border border-[#D8BFA8] bg-[#FAF3E8] px-3.5 py-2.5 text-[16px] text-[#332B2B] placeholder:text-[#9c8c80] focus:border-[#B20947] focus:outline-none focus:ring-2 focus:ring-[#E99A9F]/40 sm:px-4 sm:py-3 sm:text-[15px]";

type NavItem = {
  label: string;
  href: string;
  icon: any;
  requiresManagePermission?: boolean;
};

const BASE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Coupons", href: "/admin/coupons", icon: Tag },
  { label: "Delivery Settings", href: "/admin/delivery", icon: Truck },
  { label: "Offers & Combos", href: "/admin/offers", icon: Percent },
  { label: "Home & Instagram", href: "/admin/homepage", icon: ImageIcon },
  // { label: "Customer Care", href: "/admin/customer-care", icon: LifeBuoy },
  {
    label: "Admin Management",
    href: "/admin/admin-management",
    icon: ShieldCheck,
    requiresManagePermission: true,
  },
  { label: "Admin Profile", href: "/admin/profile", icon: UserCog },
];

export default function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/admin";
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [deniedMessage, setDeniedMessage] = useState<string>("");

  const isUserAdmin = (u: any) =>
    Boolean(
      u &&
        (u.role === "admin" ||
          u.role === "SUPER_ADMIN" ||
          u.role === "SECONDARY_ADMIN" ||
          u.isAdmin === true)
    );

  // Check authentication status and live permissions on mount
  useEffect(() => {
    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);
    const storedAdminUser = typeof window !== "undefined" ? localStorage.getItem("izha_admin_user") : null;
    const storedUserStr = storedAdminUser || (typeof window !== "undefined" ? localStorage.getItem(KEYS.user) : null);

    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    let parsedUser: any = null;
    if (storedUserStr) {
      try {
        parsedUser = JSON.parse(storedUserStr);
      } catch (_) {}
    }

    if (parsedUser) {
      if (isUserAdmin(parsedUser)) {
        setCurrentAdmin(parsedUser);
        setIsAuthenticated(true);
      } else if (!adminToken) {
        // Customer credentials detected on admin route only if no separate admin token
        setDeniedMessage("Access denied. Administrator privileges required.");
        setIsAuthenticated(false);
      }
    }

    // Always re-verify session with backend for live permission updates
    fetch(apiUrl("/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid session");
        return res.json();
      })
      .then((data) => {
        if (data?.success && data?.user && isUserAdmin(data.user)) {
          setCurrentAdmin(data.user);
          setIsAuthenticated(true);
          setDeniedMessage("");
          localStorage.setItem("izha_admin_user", JSON.stringify(data.user));
          if (adminToken) {
            localStorage.setItem("izha_admin_token", token);
          }
        } else {
          // If authenticated user is a customer, deny admin access
          if (data?.user && !isUserAdmin(data.user)) {
            setDeniedMessage("Access denied. Administrator privileges required.");
          }
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        if (!parsedUser || !isUserAdmin(parsedUser)) {
          setIsAuthenticated(false);
        }
      });
  }, []);

  // Lock body scroll while mobile admin drawer is open
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("izha_admin_token");
      localStorage.removeItem("izha_admin_user");
      localStorage.removeItem(KEYS.token);
      localStorage.removeItem(KEYS.user);
    }
    setIsAuthenticated(false);
    setCurrentAdmin(null);
    router.push("/account");
  };

  // If still checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EBDEC9]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B20947] border-t-transparent mx-auto"></div>
          <p className="mt-3 text-[13px] font-medium text-[#332B2B]">Loading Admin Studio...</p>
        </div>
      </div>
    );
  }

  // If not authenticated as an admin, display the exact same common login card
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF1E4] px-4 py-8">
        <UnifiedAuthForm
          initialMode="signin"
          adminEntry={true}
          initialError={deniedMessage}
          showCloseButton={false}
          showGuestCheckout={false}
          onSuccess={(u) => {
            const isAdmin =
              u.role === "admin" ||
              u.role === "SUPER_ADMIN" ||
              u.role === "SECONDARY_ADMIN" ||
              u.isAdmin === true;
            if (isAdmin) {
              setCurrentAdmin(u);
              setIsAuthenticated(true);
              setDeniedMessage("");
              if (pathname === "/admin") {
                // Keep on the Admin Dashboard (/admin)
              }
            } else {
              setDeniedMessage("Access denied. Administrator privileges required.");
              setIsAuthenticated(false);
            }
          }}
        />
      </div>
    );
  }

  const isSuperAdmin = Boolean(
    currentAdmin?.email === "admin@izhablooms.com" ||
      currentAdmin?.is_super_admin ||
      currentAdmin?.role === "SUPER_ADMIN"
  );
  const canManageAdmins = Boolean(isSuperAdmin || currentAdmin?.can_manage_admins);

  // Filter navigation items by permission
  const filteredNav = BASE_NAV.filter((item) => {
    if (item.requiresManagePermission) {
      return canManageAdmins;
    }
    return true;
  });

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const sidebarBody = (
    <div className="flex h-full flex-col bg-[#E99A9F]">
      {/* Brand header */}
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-black/10 bg-white p-1">
            <Image
              src="/images/logoo.png"
              alt="Izha Blooms"
              fill
              sizes="40px"
              className="object-contain"
            />
          </div>
          <div>
            <p className={`${serif} text-[20px] font-semibold leading-none text-[#332B2B]`}>
              IZHA BLOOMS
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#382B2B]">
              Admin Studio
            </p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close sidebar"
          className="rounded-lg p-1.5 text-[#332B2B] hover:bg-white/40 lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      {/* Admin user pill */}
      <div className="border-b border-black/10 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[#332B2B]">
              {currentAdmin?.name || "Administrator"}
            </p>
            <p className="truncate text-[11px] text-black/60">
              {currentAdmin?.email || "admin@izhablooms.com"}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              isSuperAdmin ? "bg-[#B20947] text-white" : "bg-[#FAF3E8] text-[#B20947]"
            }`}
          >
            {isSuperAdmin ? "Super Admin" : "Secondary"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Admin navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredNav.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium transition-colors ${focusRing} ${
                active
                  ? "border border-[#E8B8C5] bg-[#FFF5F7] text-[#B20947] shadow-sm"
                  : "text-[#332B2B] hover:bg-white/40 hover:text-[#B20947]"
              }`}
            >
              <Icon
                size={18}
                strokeWidth={1.7}
                className={active ? "text-[#B20947]" : "text-[#332B2B]"}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Storefront & Sign Out shortcuts */}
      <div className="space-y-2 border-t border-black/10 p-4">
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-[#E99A9F] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#B20947] transition-colors hover:bg-[#FFF5F7]"
        >
          <ExternalLink size={14} />
          View Storefront
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-black/15 bg-black/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#332B2B] transition-colors hover:bg-black/10"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen min-h-[100dvh] overflow-x-clip bg-[#EBDEC9] text-[#332B2B] lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop Sidebar */}
      <aside className="hidden border-r border-black/10 bg-[#E99A9F] lg:block">
        <div className="sticky top-0 flex h-screen h-[100dvh] flex-col">
          {sidebarBody}
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[90] bg-[#382B2B]/50 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            className="h-full w-[85vw] max-w-[288px] overscroll-contain border-r border-black/10 bg-[#E99A9F] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarBody}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#EBDEC9]">
        <header className="sticky top-0 z-30 border-b border-[#D7C3AA] bg-[#EBDEC9]/95 px-3.5 py-3.5 backdrop-blur-md sm:px-8 sm:py-4">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open admin menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E8B8C5] bg-[#FAF3E8] text-[#332B2B] lg:hidden"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className={`${serif} text-[22px] font-medium leading-tight text-[#332B2B] sm:text-[34px]`}>
                  {title}
                </h1>
                {subtitle && <p className="mt-0.5 text-[12px] leading-snug text-[#6f6565] sm:text-[13px]">{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-2.5">{actions}</div>}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1240px] flex-1 px-3.5 py-5 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
