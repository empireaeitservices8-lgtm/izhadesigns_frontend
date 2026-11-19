"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, X } from "lucide-react";
import { KEYS, type AppUser } from "@/lib/izha-store";
import AlertBox from "@/components/izha/AlertBox";
import { Flower, focusRing, inputCls, serif } from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";
const AUTH_IMAGE: string = "/images/inst4.jpg";

const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v);
const isPhone = (v: string) => /^[6-9]\d{9}$/.test(v);

export type UnifiedAuthFormProps = {
  initialMode?: "signin" | "register";
  adminEntry?: boolean;
  initialError?: string;
  onSuccess?: (user: AppUser) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  showGuestCheckout?: boolean;
  redirectTo?: string;
  className?: string;
};

function AuthField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  const actualType = isPw ? (show ? "text" : "password") : type;

  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-[#332B2B]">
        {label}
      </span>
      <span className="relative block">
        <input
          type={actualType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`${inputCls} !py-2.5 ${isPw ? "pr-10" : ""}`}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className={`absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#6f6565] ${focusRing}`}
          >
            {show ? (
              <EyeOff size={18} strokeWidth={1.6} />
            ) : (
              <Eye size={18} strokeWidth={1.6} />
            )}
          </button>
        )}
      </span>
    </label>
  );
}

export default function UnifiedAuthForm({
  initialMode = "signin",
  adminEntry = false,
  initialError = "",
  onSuccess,
  onClose,
  showCloseButton = false,
  showGuestCheckout = true,
  redirectTo,
  className = "",
}: UnifiedAuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">(initialMode);
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    identifier: "",
    password: "",
  });

  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) =>
    setF((s) => ({ ...s, [k]: v }));
  const register = mode === "register";

  const validatePasswordForm = () => {
    if (register) {
      if (f.name.trim().length < 2)
        return "Enter your full name so we can address you properly.";
      if (!isEmail(f.email.trim()))
        return "Enter a valid email address, for example name@example.com.";
      if (!isPhone(f.phone))
        return "Enter a 10 digit mobile number that starts with 6, 7, 8 or 9.";
    } else if (
      f.identifier.trim().toLowerCase() !== "admin" &&
      !isEmail(f.identifier.trim()) &&
      !isPhone(f.identifier.trim())
    ) {
      return "Enter the email address or 10 digit mobile number you registered with.";
    }
    if (f.password.length < 6)
      return "Use a password with at least 6 characters.";
    return "";
  };

  const submitPasswordForm = async () => {
    const problem = validatePasswordForm();
    if (problem) return setError(problem);
    setError("");
    setBusy(true);

    try {
      const endpoint = register ? "/auth/register" : "/auth/login";
      const payload = register
        ? {
            name: f.name.trim(),
            email: f.email.trim(),
            phone: f.phone,
            password: f.password,
          }
        : { identifier: f.identifier.trim(), password: f.password };

      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message ||
            (res.status >= 500
              ? "Unable to reach the backend server. Please make sure the Express server is running on port 5000."
              : register
              ? "This email or mobile number is already registered. Sign in instead."
              : "Email, mobile number or password is incorrect. Check them and try again.")
        );
      }

      const receivedUser: AppUser = data?.user ?? {};
      const userRole = receivedUser.role;
      const isAdmin =
        userRole === "SUPER_ADMIN" ||
        userRole === "SECONDARY_ADMIN" ||
        userRole === "admin" ||
        receivedUser.isAdmin === true;

      // SCENARIO D: If user enters credentials on /admin entry point
      if (adminEntry) {
        if (!isAdmin || userRole === "CUSTOMER" || userRole === "customer") {
          // Clear any stored token for safety
          try {
            localStorage.removeItem(KEYS.token);
            localStorage.removeItem(KEYS.user);
          } catch (_) {}
          setError("Access denied. Administrator privileges required.");
          setBusy(false);
          return;
        }

        // Check active status
        if (receivedUser.is_active === false) {
          setError("Account is inactive. Contact Main Admin.");
          setBusy(false);
          return;
        }

        // Valid admin on admin entry
        if (data?.token) {
          try {
            localStorage.setItem("izha_admin_token", data.token);
            localStorage.setItem("izha_admin_user", JSON.stringify(receivedUser));
            localStorage.setItem(KEYS.token, data.token);
            localStorage.setItem(KEYS.user, JSON.stringify(receivedUser));
          } catch (_) {}
        }

        if (onSuccess) {
          onSuccess(receivedUser);
        } else {
          router.push("/admin");
        }
        return;
      }

      // SCENARIOS A, B, C: Standard entry (/login, customer modal, or website)
      if (data?.token) {
        try {
          localStorage.setItem(KEYS.token, data.token);
          localStorage.setItem(KEYS.user, JSON.stringify(receivedUser));
          localStorage.removeItem(KEYS.addresses);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("izha-store-sync", { detail: KEYS.addresses }));
          }
        } catch (_) {}
      }

      if (onSuccess) {
        onSuccess(receivedUser);
      }

      // Check if user is an Administrator logging in via common login page
      if (isAdmin) {
        if (data?.token) {
          try {
            localStorage.setItem("izha_admin_token", data.token);
            localStorage.setItem("izha_admin_user", JSON.stringify(receivedUser));
          } catch (_) {}
        }
        // SCENARIOS B & C: Main Admin or Secondary Admin redirect to Admin Dashboard
        if (receivedUser.is_active === false) {
          setError("Account is inactive. Contact Main Admin.");
          setBusy(false);
          return;
        }
        router.push("/admin");
        return;
      }

      // SCENARIO A: Customer logging in
      const nextQuery =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      const destination =
        redirectTo ||
        (nextQuery && nextQuery.startsWith("/") && !nextQuery.startsWith("//")
          ? nextQuery
          : "/account");

      if (onClose) {
        onClose();
      }
      router.push(destination);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not reach the server. Check your internet connection and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = AUTH_IMAGE !== "";
  const perks = [
    "Be the first to discover new collections.",
    "Enjoy exclusive member offers.",
    "Save your favourite styles.",
    "Experience a smoother checkout.",
  ];

  return (
    <div
      role="region"
      aria-label={register ? "Create your account" : "Sign in"}
      className={`relative grid w-full max-w-[960px] overflow-hidden rounded-[24px] border-2 border-[#E8B8C5] bg-white shadow-2xl ring-2 ring-inset ring-white sm:my-4 md:my-0 md:h-[min(700px,calc(100dvh-2rem))] md:grid-cols-2 md:grid-rows-[minmax(0,1fr)] md:rounded-[28px] ${className}`}
    >
      {/* Optional Close button */}
      {showCloseButton && onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`absolute right-3 top-3 z-20 rounded-full bg-white/90 p-2 text-[#332B2B] shadow-sm transition-colors hover:text-[#B20947] ${focusRing}`}
        >
          <X size={20} strokeWidth={1.8} />
        </button>
      )}

      {/* Left panel: IZHA Circle */}
      <div className="relative isolate flex min-h-[270px] flex-col justify-between gap-6 overflow-hidden bg-gradient-to-b from-[#F9DDE2] via-[#F2BFC7] to-[#E99A9F]/80 p-6 sm:min-h-[300px] sm:p-8 md:min-h-0 md:p-10">
        {onPhoto && (
          <>
            <Image
              src={AUTH_IMAGE}
              alt="IZHA BLOOMS collection"
              fill
              sizes="(min-width: 768px) 480px, 100vw"
              quality={85}
              priority
              className="-z-10 object-cover"
            />
            <span className="absolute inset-0 -z-10 bg-[#382B2B]/40" />
          </>
        )}
        {!onPhoto && (
          <>
            <span className="pointer-events-none absolute -left-10 top-24 h-56 w-56 rounded-full bg-white/50 blur-3xl" />
            <Flower
              size={220}
              stroke={0.7}
              className="pointer-events-none absolute -bottom-12 -right-10 text-white/60"
            />
          </>
        )}
        <div className="relative pr-10 md:pr-0">
          <h2
            className={`${serif} text-[32px] font-medium leading-[1.08] sm:text-[38px] md:text-[44px] ${
              onPhoto ? "text-white" : "text-[#332B2B]"
            }`}
          >
            Be part of the
            <br />
            IZHA Circle!
          </h2>
          <p
            className={`${serif} mt-2 text-[17px] italic sm:text-[19px] ${
              onPhoto ? "text-white/90" : "text-[#6f6565]"
            }`}
          >
            A little more love, a little more privilege.
          </p>
        </div>
        <ul className="relative space-y-2 md:space-y-2.5">
          {perks.map((t) => (
            <li
              key={t}
              className={`rounded-2xl border border-white/40 bg-white/25 px-4 py-2.5 text-[13px] backdrop-blur-md md:py-3 md:text-[14px] ${
                onPhoto ? "text-white" : "text-[#332B2B]"
              }`}
            >
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Right panel: form */}
      <div className="flex min-h-0 flex-col overflow-y-auto px-6 py-8 sm:px-10 md:py-6">
        <div className="my-auto">
          <div className="text-center">
            <p
              className={`${serif} text-[28px] font-semibold tracking-[0.12em] text-[#332B2B]`}
            >
              IZHA BLOOMS
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.28em] text-[#B20947]">
              Where Every Thread Blooms
            </p>
            <h1
              className={`${serif} mt-4 text-[32px] font-medium leading-tight text-[#332B2B]`}
            >
              {register ? "Create your account" : "Sign in"}
            </h1>
            <span className="mx-auto mt-2 block h-[2px] w-14 bg-[#E8B8C5]" />
            <p className="mt-3 text-[14px] text-[#6f6565]">
              {register
                ? "Join the IZHA Circle for early access & member rewards."
                : "Enter your email or mobile number & password to continue."}
            </p>
          </div>

          {error && (
            <div className="mt-4">
              <AlertBox variant="error" message={error} />
            </div>
          )}

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitPasswordForm();
            }}
            className="mt-4 space-y-3"
          >
            {register ? (
              <>
                <AuthField
                  label="Full name"
                  value={f.name}
                  onChange={set("name")}
                  autoComplete="name"
                />
                <AuthField
                  label="Email"
                  type="email"
                  value={f.email}
                  onChange={set("email")}
                  autoComplete="email"
                />
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-[#332B2B]">
                    Mobile number
                  </span>
                  <span className="flex">
                    <span className="flex items-center rounded-l-[10px] border border-r-0 border-[#E8B8C5] bg-[#FFF5F7] px-3 text-[14px] text-[#6f6565]">
                      +91
                    </span>
                    <input
                      className={`${inputCls} !rounded-l-none !py-2.5`}
                      value={f.phone}
                      inputMode="tel"
                      maxLength={10}
                      autoComplete="tel-national"
                      placeholder="10 digit number"
                      onChange={(e) =>
                        set("phone")(e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </span>
                </label>
              </>
            ) : (
              <AuthField
                label="Email or mobile number"
                value={f.identifier}
                onChange={set("identifier")}
                autoComplete="username"
              />
            )}
            <AuthField
              label="Password"
              type="password"
              value={f.password}
              onChange={set("password")}
              autoComplete={register ? "new-password" : "current-password"}
            />
            <button
              type="submit"
              disabled={busy}
              className={`w-full rounded-[10px] border-[1.5px] border-[#E99A9F] bg-white px-3 py-3 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#B20947] transition-colors hover:bg-[#FFF5F7] disabled:cursor-not-allowed disabled:border-[#d9cfd2] disabled:text-[#b3a9ab] sm:py-3.5 sm:text-sm ${focusRing}`}
            >
              {busy ? "Please wait" : register ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p className="mt-4 text-center text-[14px] text-[#6f6565]">
            {register ? "Already have an account?" : "New to IZHA BLOOMS?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(register ? "signin" : "register");
                setError("");
              }}
              className={`rounded font-medium text-[#B20947] underline underline-offset-4 ${focusRing}`}
            >
              {register ? "Sign in" : "Create an account"}
            </button>
          </p>

          {showGuestCheckout && !adminEntry && (
            <div className="mt-3 text-center">
              <Link
                href="/checkout"
                onClick={onClose}
                className="text-[13px] font-medium text-[#332B2B] underline underline-offset-4 hover:text-[#B20947]"
              >
                Continue to Checkout as Guest
              </Link>
            </div>
          )}

          <p className="mt-3 text-center text-[12px] text-[#6f6565]">
            By continuing, you agree to our{" "}
            <Link
              href="/privacy-policy"
              className="underline underline-offset-2"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="underline underline-offset-2">
              Terms &amp; Conditions
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

