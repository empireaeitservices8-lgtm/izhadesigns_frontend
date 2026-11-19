"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Shield,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import { KEYS, useStored, type AppUser } from "@/lib/izha-store";
import { DEFAULT_ADMIN_PROFILE, type AdminProfile } from "@/lib/demo-store";
import AdminShell, { card, cardCream, inputCls, outlineBtn } from "@/components/admin/AdminShell";
import AlertBox from "@/components/izha/AlertBox";
import { serif, solidBtn } from "@/components/izha/ui";

/** Password box with an eye icon to show or hide what is typed. */
function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative mt-1">
      <input
        type={show ? "text" : "password"}
        required
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-[#999] transition-colors hover:text-[#B20947]"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useStored<AdminProfile>(
    KEYS.adminProfile,
    DEFAULT_ADMIN_PROFILE
  );
  const [currentUser, setCurrentUser] = useStored<AppUser | null>(KEYS.user, null);

  // Email update state
  const [newEmail, setNewEmail] = useState("");
  const [confirmNewEmail, setConfirmNewEmail] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Password update state
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");
  const [isUpdatingPw, setIsUpdatingPw] = useState(false);

  // Studio details state
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);

  // Fetch current admin info from TiDB Cloud
  useEffect(() => {
    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);
    if (!token) return;

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.user) {
          const u = data.user;
          setCurrentUser((prev) => ({
            ...prev,
            ...u,
            name: u.name || prev?.name || "Admin Studio",
            email: u.email || prev?.email || "admin@izhablooms.com",
            role: "admin",
            is_super_admin: Boolean(u.is_super_admin),
            can_manage_admins: Boolean(u.can_manage_admins),
          } as any));

          setProfile((prev) => ({
            ...prev,
            name: u.name || prev.name,
            email: u.email || prev.email,
            phone: u.phone || prev.phone,
          }));
        }
      })
      .catch(() => {});
  }, [setCurrentUser, setProfile]);

  const isSuperAdmin = Boolean(
    currentUser?.email === "admin@izhablooms.com" ||
    (currentUser as any)?.is_super_admin
  );
  const canManageAdmins = Boolean(
    isSuperAdmin || (currentUser as any)?.can_manage_admins
  );

  // 1. Handle Update Email
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");

    if (!newEmail.trim()) {
      setEmailError("Please enter a new email address.");
      return;
    }

    if (newEmail.trim().toLowerCase() === (currentUser?.email || "").toLowerCase()) {
      setEmailError("New email address must be different from current email.");
      return;
    }

    if (newEmail.trim().toLowerCase() !== confirmNewEmail.trim().toLowerCase()) {
      setEmailError("New email and confirm new email do not match.");
      return;
    }

    if (!emailCurrentPassword) {
      setEmailError("Current password is required to verify your identity.");
      return;
    }

    setIsUpdatingEmail(true);
    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          currentPassword: emailCurrentPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setEmailError(data.message || "Failed to update email.");
        setIsUpdatingEmail(false);
        return;
      }

      if (data.token) {
        localStorage.setItem("izha_admin_token", data.token);
        localStorage.setItem(KEYS.token, data.token);
      }
      if (data.user) {
        localStorage.setItem("izha_admin_user", JSON.stringify(data.user));
        setCurrentUser((prev) => ({ ...prev, ...data.user }));
        setProfile((prev) => ({ ...prev, email: data.user.email }));
      }

      setEmailSuccess("Administrator email updated successfully in database.");
      setNewEmail("");
      setConfirmNewEmail("");
      setEmailCurrentPassword("");
      setTimeout(() => setEmailSuccess(""), 4000);
    } catch (err: any) {
      setEmailError(err?.message || "Failed to connect to authentication server.");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // 2. Handle Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (!pwCurrent) {
      setPwError("Please enter your current password.");
      return;
    }

    if (pwNext.length < 6) {
      setPwError("New password must be at least 6 characters long.");
      return;
    }

    if (pwNext !== pwConfirm) {
      setPwError("New password and confirm password do not match.");
      return;
    }

    setIsUpdatingPw(true);
    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);

    try {
      const res = await fetch("/api/admin/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: pwCurrent,
          newPassword: pwNext,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setPwError(data.message || "Failed to change password.");
        setIsUpdatingPw(false);
        return;
      }

      setPwSuccess("Password changed successfully. Use your new password on next login.");
      setPwCurrent("");
      setPwNext("");
      setPwConfirm("");
      setTimeout(() => setPwSuccess(""), 4000);
    } catch (err: any) {
      setPwError(err?.message || "Failed to connect to authentication server.");
    } finally {
      setIsUpdatingPw(false);
    }
  };

  // 3. Handle Update Studio Profile Details
  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailsError("");
    setDetailsSaved(false);

    setIsUpdatingDetails(true);
    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          location: profile.location,
          bio: profile.bio,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setDetailsError(data.message || "Failed to save details.");
        setIsUpdatingDetails(false);
        return;
      }

      setDetailsSaved(true);
      setTimeout(() => setDetailsSaved(false), 3000);
    } catch (err: any) {
      setDetailsError(err?.message || "Error saving details.");
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  return (
    <AdminShell
      title="Admin Profile & Credentials"
      subtitle="Manage your administrator login email, password security and studio settings"
    >
      {/* Account Tier Header */}
      <div className={`${card} mb-6 p-4 sm:p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#E8B8C5] bg-[#FFF5F7] text-[#B20947]">
              <UserCog size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className={`${serif} m-0 break-words text-[22px] font-medium text-[#332B2B] sm:text-[24px]`}>
                  {currentUser?.name || profile.name}
                </h2>
                {isSuperAdmin ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#B20947] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                    <Shield className="h-3 w-3" />
                    Main Admin (Super Admin)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#D8BFA8] bg-[#FAF3E8] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
                    Secondary Admin
                  </span>
                )}
              </div>
              <p className="m-0 mt-1 break-all text-[13px] text-[#6f6565]">
                Login Email: <strong className="text-[#332B2B]">{currentUser?.email || profile.email}</strong>
              </p>
            </div>
          </div>

          {canManageAdmins && (
            <Link
              href="/admin/admin-management"
              className={`${solidBtn} w-full shrink-0 cursor-pointer justify-center sm:w-auto`}
            >
              <Users className="mr-1.5 h-4 w-4" />
              Open Admin Management
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Form 1: Update Email */}
        <form onSubmit={handleUpdateEmail} className={`${card} flex min-w-0 flex-col justify-between p-4 sm:p-7`}>
          <div>
            <div className="flex items-center gap-2 border-b border-[#E8CFD2] pb-3">
              <Mail className="h-5 w-5 shrink-0 text-[#B20947]" />
              <h3 className={`${serif} m-0 text-[20px] font-medium text-[#332B2B] sm:text-[22px]`}>
                Update Admin Email
              </h3>
            </div>
            <p className="mt-1.5 text-[12px] text-[#6f6565]">
              Change the email address used to log into this administrator account.
            </p>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Current Active Email
                </label>
                <input
                  type="email"
                  disabled
                  value={currentUser?.email || profile.email}
                  className="mt-1 w-full cursor-not-allowed rounded-[10px] border border-[#D8BFA8] bg-[#EFE2CE]/60 px-3.5 py-2.5 text-[14px] text-[#555]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  New Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="newadmin@izhablooms.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Confirm New Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="Re-enter new email address"
                  value={confirmNewEmail}
                  onChange={(e) => setConfirmNewEmail(e.target.value)}
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Current Password (Identity Verification) *
                </label>
                <PasswordInput
                  value={emailCurrentPassword}
                  onChange={setEmailCurrentPassword}
                  placeholder="Enter current password to verify"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {emailError && (
              <AlertBox
                variant="error"
                message={emailError}
                onClose={() => setEmailError("")}
                className="mt-4"
              />
            )}

            {emailSuccess && (
              <AlertBox
                variant="success"
                message={emailSuccess}
                onClose={() => setEmailSuccess("")}
                className="mt-4"
              />
            )}
          </div>

          <div className="pt-5">
            <button
              type="submit"
              disabled={isUpdatingEmail}
              className={`${solidBtn} w-full cursor-pointer justify-center disabled:cursor-not-allowed`}
            >
              {isUpdatingEmail ? "Verifying & Updating..." : "Update Email Address"}
            </button>
          </div>
        </form>

        {/* Form 2: Update Password */}
        <form onSubmit={handleUpdatePassword} className={`${cardCream} flex min-w-0 flex-col justify-between p-4 sm:p-7`}>
          <div>
            <div className="flex items-center gap-2 border-b border-[#E8CFD2] pb-3">
              <KeyRound className="h-5 w-5 shrink-0 text-[#B20947]" />
              <h3 className={`${serif} m-0 text-[20px] font-medium text-[#332B2B] sm:text-[22px]`}>
                Update Password
              </h3>
            </div>
            <p className="mt-1.5 text-[12px] text-[#6f6565]">
              Securely update your admin authentication password.
            </p>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Current Password *
                </label>
                <PasswordInput
                  value={pwCurrent}
                  onChange={setPwCurrent}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  New Password (min 6 chars) *
                </label>
                <PasswordInput
                  value={pwNext}
                  onChange={setPwNext}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Confirm New Password *
                </label>
                <PasswordInput
                  value={pwConfirm}
                  onChange={setPwConfirm}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {pwError && (
              <AlertBox
                variant="error"
                message={pwError}
                onClose={() => setPwError("")}
                className="mt-4"
              />
            )}

            {pwSuccess && (
              <AlertBox
                variant="success"
                message={pwSuccess}
                onClose={() => setPwSuccess("")}
                className="mt-4"
              />
            )}
          </div>

          <div className="pt-5">
            <button
              type="submit"
              disabled={isUpdatingPw}
              className={`${outlineBtn} w-full cursor-pointer justify-center disabled:cursor-not-allowed`}
            >
              {isUpdatingPw ? "Updating Password..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>

      {/* Form 3: Studio Details & Bio */}
      <form onSubmit={handleUpdateDetails} className={`${card} mt-4 min-w-0 p-4 sm:mt-6 sm:p-7`}>
        <div className="flex items-center gap-2 border-b border-[#E8CFD2] pb-3">
          <UserCheck className="h-5 w-5 shrink-0 text-[#B20947]" />
          <h3 className={`${serif} m-0 text-[20px] font-medium text-[#332B2B] sm:text-[22px]`}>
            Studio Profile & Public Contact
          </h3>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
              Admin / Studio Name
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className={`${inputCls} mt-1`}
            />
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
              Role Title
            </label>
            <input
              type="text"
              value={profile.role}
              onChange={(e) => setProfile({ ...profile, role: e.target.value })}
              className={`${inputCls} mt-1`}
            />
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
              Mobile Phone
            </label>
            <input
              type="text"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className={`${inputCls} mt-1`}
            />
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
              WhatsApp Number
            </label>
            <input
              type="text"
              value={profile.whatsapp}
              onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
              className={`${inputCls} mt-1`}
            />
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
              Store Location
            </label>
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              className={`${inputCls} mt-1`}
            />
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
              Instagram Handle
            </label>
            <input
              type="text"
              value={profile.instagram}
              onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
              className={`${inputCls} mt-1`}
            />
          </div>

          <div className="min-w-0 sm:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#332B2B]">
              Studio Bio
            </label>
            <textarea
              rows={3}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className={`${inputCls} mt-1`}
            />
          </div>
        </div>

        {detailsError && (
          <AlertBox
            variant="error"
            message={detailsError}
            onClose={() => setDetailsError("")}
            className="mt-4"
          />
        )}

        {detailsSaved && (
          <AlertBox
            variant="success"
            message="Studio profile details saved."
            onClose={() => setDetailsSaved(false)}
            className="mt-4"
          />
        )}

        <div className="flex items-center justify-end pt-4">
          <button
            type="submit"
            disabled={isUpdatingDetails}
            className={`${solidBtn} w-full cursor-pointer justify-center disabled:cursor-not-allowed sm:w-auto`}
          >
            {detailsSaved && <Check size={16} className="mr-1.5" />}
            {isUpdatingDetails ? "Saving..." : "Save Studio Details"}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}