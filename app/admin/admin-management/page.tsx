"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { KEYS, useStored, type AppUser } from "@/lib/izha-store";
import AdminShell, { card, inputCls, outlineBtn } from "@/components/admin/AdminShell";
import AlertBox from "@/components/izha/AlertBox";
import { serif, solidBtn } from "@/components/izha/ui";

/** The one and only Main Admin (owner). Everyone else is a Secondary Admin. */
const OWNER_EMAIL = "admin@izhablooms.com";

type AdminRecord = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "SUPER_ADMIN" | "SECONDARY_ADMIN";
  is_super_admin: boolean;
  can_manage_admins: boolean;
  is_active: boolean;
  created_by: string;
  created_at?: string;
};

type Perms = {
  can_manage_admins: boolean;
  is_super_admin?: boolean;
  id?: string;
  email?: string;
  name?: string;
};

const isOwnerAccount = (a: { email?: string }) =>
  (a.email || "").toLowerCase() === OWNER_EMAIL;

export default function AdminManagementPage() {
  const [currentUser] = useStored<AppUser | null>(KEYS.user, null);

  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedMsg, setAccessDeniedMsg] = useState("");

  const [currentUserPerms, setCurrentUserPerms] = useState<Perms>({
    can_manage_admins: false,
  });

  // Notifications
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Modal: Add Admin
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  // Modal: Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  /* ---------- Who am I, and what can I do? ---------- */

  const me = {
    id: String(currentUserPerms.id ?? (currentUser as any)?.id ?? ""),
    email: String(currentUserPerms.email ?? currentUser?.email ?? "").toLowerCase(),
  };

  const isSuperAdmin = Boolean(
    currentUserPerms.is_super_admin ||
    currentUser?.is_super_admin ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.role === "admin" ||
    me.email === OWNER_EMAIL ||
    !currentUser
  );

  const canManageAdmins = isSuperAdmin || Boolean(currentUserPerms.can_manage_admins || currentUser?.can_manage_admins);

  const isMe = (a: AdminRecord) =>
    (me.id !== "" && a.id === me.id) || (me.email !== "" && a.email.toLowerCase() === me.email);

  // Remove / activate / deactivate:
  // Can manage any secondary admin
  const canRemove = (a: AdminRecord) =>
    !isOwnerAccount(a) && (isSuperAdmin || canManageAdmins);

  // Allow / remove the "manage admins" permission: Super Admin only
  const canChangePermission = (a: AdminRecord) =>
    !isOwnerAccount(a) && (isSuperAdmin || canManageAdmins);

  const fetchAdmins = async () => {
    setLoading(true);
    setAccessDenied(false);

    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);

    try {
      const res = await fetch("/api/admin/admins", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();

      if (res.status === 403) {
        setAccessDenied(true);
        setAccessDeniedMsg(
          data.message ||
            "Access Denied: You do not have permission to access Admin Management. Please contact the Main Administrator."
        );
        setLoading(false);
        return;
      }

      if (!res.ok || !data.success) {
        setActionError(data.message || "Failed to load administrators.");
        setLoading(false);
        return;
      }

      setAdmins(data.admins || []);
      if (data.currentAdminPermissions) {
        setCurrentUserPerms(data.currentAdminPermissions);
      }
    } catch (err: any) {
      setActionError(err?.message || "Failed to connect to admin management service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Close the delete box with the Escape key
  useEffect(() => {
    if (!deleteTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) closeDelete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteTarget, deleting]);

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleteError("");
  };

  // Why an action is not allowed (same wording as your other project)
  const refusalFor = (a: AdminRecord): string => {
    if (isOwnerAccount(a)) return "The main admin cannot be changed.";
    if (isMe(a)) return "You cannot change your own account.";
    return "Only the main admin can change an admin who can manage admins.";
  };

  // Add Admin (new admins always start with the permission DENIED)
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    if (!newAdmin.name.trim() || !newAdmin.email.trim() || !newAdmin.password) {
      setActionError("Please provide all required fields (Name, Email, Password).");
      return;
    }

    if (newAdmin.password.length < 6) {
      setActionError("Password must be at least 6 characters long.");
      return;
    }

    if (newAdmin.password !== newAdmin.confirmPassword) {
      setActionError("Password and Confirm Password do not match.");
      return;
    }

    setAddLoading(true);
    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);

    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newAdmin.name.trim(),
          email: newAdmin.email.trim(),
          password: newAdmin.password,
          phone: newAdmin.phone.trim() || null,
          can_manage_admins: false,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setActionError(data.message || "Failed to create administrator.");
        setAddLoading(false);
        return;
      }

      setActionSuccess(data.message || `Admin added: ${newAdmin.email.trim()}`);
      setNewAdmin({ name: "", email: "", password: "", confirmPassword: "", phone: "" });
      setShowAddModal(false);
      fetchAdmins();

      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err: any) {
      setActionError(err?.message || "Server error while creating admin.");
    } finally {
      setAddLoading(false);
    }
  };

  // Allow / remove the "manage admins" permission
  const handleTogglePermission = async (a: AdminRecord) => {
    setActionError("");
    setActionSuccess("");

    if (!canChangePermission(a)) {
      setActionError("Only the Super Admin can change this permission.");
      return;
    }

    const nextPerm = !a.can_manage_admins;
    // Optimistically update local state immediately
    setAdmins((prev) =>
      prev.map((item) =>
        item.id === a.id ? { ...item, can_manage_admins: nextPerm } : item
      )
    );

    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);

    try {
      const res = await fetch(`/api/admin/admins/${a.id}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ can_manage_admins: nextPerm }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Revert on failure
        setAdmins((prev) =>
          prev.map((item) =>
            item.id === a.id ? { ...item, can_manage_admins: a.can_manage_admins } : item
          )
        );
        setActionError(data.message || "Failed to update permission.");
        return;
      }

      setActionSuccess(
        nextPerm
          ? `Permission granted: "${a.name}" can now manage other administrators.`
          : `Permission revoked: "${a.name}" can no longer manage other administrators.`
      );
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err: any) {
      setAdmins((prev) =>
        prev.map((item) =>
          item.id === a.id ? { ...item, can_manage_admins: a.can_manage_admins } : item
        )
      );
      setActionError(err?.message || "Failed to update permission.");
    }
  };

  // Activate / deactivate
  const handleToggleStatus = async (a: AdminRecord) => {
    setActionError("");
    setActionSuccess("");

    if (!canRemove(a)) {
      setActionError(refusalFor(a));
      return;
    }

    const nextActive = !a.is_active;
    // Optimistically update local state immediately
    setAdmins((prev) =>
      prev.map((item) =>
        item.id === a.id ? { ...item, is_active: nextActive } : item
      )
    );

    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);

    try {
      const res = await fetch(`/api/admin/admins/${a.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_active: nextActive }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Revert on failure
        setAdmins((prev) =>
          prev.map((item) =>
            item.id === a.id ? { ...item, is_active: a.is_active } : item
          )
        );
        setActionError(data.message || "Failed to update administrator status.");
        return;
      }

      setActionSuccess(
        `Administrator "${a.name}" has been ${nextActive ? "ACTIVATED" : "DEACTIVATED"}.`
      );
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err: any) {
      setAdmins((prev) =>
        prev.map((item) =>
          item.id === a.id ? { ...item, is_active: a.is_active } : item
        )
      );
      setActionError(err?.message || "Failed to update status.");
    }
  };

  // Remove an admin (runs after the delete box is confirmed)
  const confirmDeleteAdmin = async () => {
    if (!deleteTarget) return;

    const a = admins.find((x) => x.id === deleteTarget.id);
    if (!a || !canRemove(a)) {
      setDeleteError(a ? refusalFor(a) : "That admin was not found.");
      return;
    }

    setDeleting(true);
    setDeleteError("");
    setActionError("");
    setActionSuccess("");

    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);

    try {
      const res = await fetch(`/api/admin/admins/${deleteTarget.id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setDeleteError(data.message || "Failed to remove administrator.");
        return;
      }

      setAdmins((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setActionSuccess(`Administrator "${deleteTarget.name}" removed successfully.`);
      closeDelete();
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to remove administrator.");
    } finally {
      setDeleting(false);
    }
  };

  /* ---------- Small pieces shared by the table and the phone cards ---------- */

  const roleBadge = (a: AdminRecord) =>
    isOwnerAccount(a) ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#B20947] px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
        <Shield className="h-3 w-3" />
        Main Admin (Super)
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#D8BFA8] bg-[#FAF3E8] px-2.5 py-0.5 text-[11px] font-semibold text-[#332B2B]">
        Secondary Admin
      </span>
    );

  const statusBadge = (a: AdminRecord) =>
    a.is_active ? (
      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#059669]">
        <span className="h-2 w-2 rounded-full bg-[#059669]"></span>
        Active
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#DC2626]">
        <span className="h-2 w-2 rounded-full bg-[#DC2626]"></span>
        Inactive (Deactivated)
      </span>
    );

  const permBadge = (a: AdminRecord) =>
    isOwnerAccount(a) ? (
      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#059669]">
        <ShieldCheck className="h-3.5 w-3.5" />
        Full Super Admin (Always ON)
      </span>
    ) : a.can_manage_admins ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#eef7f0] px-2 py-0.5 text-[11px] font-semibold text-[#3a6b42]">
        <UserCheck className="h-3.5 w-3.5" />
        Permission: ALLOWED
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#f3efef] px-2 py-0.5 text-[11px] font-medium text-[#6f6565]">
        <UserX className="h-3.5 w-3.5" />
        Permission: DENIED
      </span>
    );

  const renderActions = (a: AdminRecord) => {
    if (isOwnerAccount(a)) {
      return <span className="text-[11px] italic text-[#999]">Primary Account</span>;
    }
    if (isMe(a)) {
      return <span className="text-[11px] italic text-[#999]">Your account</span>;
    }
    const showPermission = canChangePermission(a);
    const showRemove = canRemove(a);
    if (!showPermission && !showRemove) {
      return <span className="text-[11px] italic text-[#999]">No access</span>;
    }
    return (
      <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
        {showPermission && (
          <button
            type="button"
            onClick={() => handleTogglePermission(a)}
            className="cursor-pointer rounded border border-[#B20947] px-2.5 py-1.5 text-[11px] font-semibold text-[#B20947] transition-colors hover:bg-[#B20947] hover:text-white"
          >
            {a.can_manage_admins ? "Remove permission" : "Allow to manage admins"}
          </button>
        )}

        {showRemove && (
          <>
            <button
              type="button"
              onClick={() => handleToggleStatus(a)}
              className={`cursor-pointer rounded border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                a.is_active
                  ? "border-[#E8CFD2] bg-white text-[#B20947] hover:bg-[#FFF5F7]"
                  : "border-[#059669] bg-[#eef7f0] text-[#059669] hover:bg-[#059669] hover:text-white"
              }`}
              title={a.is_active ? "Deactivate Account" : "Activate Account"}
            >
              {a.is_active ? "Deactivate" : "Activate"}
            </button>

            <button
              type="button"
              onClick={() => {
                setDeleteError("");
                setDeleteTarget({ id: a.id, name: a.name });
              }}
              className="cursor-pointer rounded p-1.5 text-[#999] hover:text-[#B20947]"
              title="Delete Administrator"
              aria-label={`Delete ${a.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    );
  };

  // Admins without the permission cannot use this page at all
  if (accessDenied) {
    return (
      <AdminShell title="Admin Management">
        <div className="mx-auto mt-12 max-w-lg px-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#E8B8C5] bg-[#FFF5F7] text-[#B20947]">
            <ShieldAlert size={32} />
          </div>
          <h2 className={`${serif} mt-4 text-[26px] font-medium text-[#332B2B]`}>
            Access Restricted
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#6f6565]">
            {accessDeniedMsg}
          </p>
          <div className="mt-6">
            <Link href="/admin" className={`${solidBtn} cursor-pointer`}>
              Return to Dashboard
            </Link>
          </div>
        </div>
      </AdminShell>
    );
  }

  const ownerCount = admins.filter(isOwnerAccount).length;
  const iAmOwner = isSuperAdmin || me.email === OWNER_EMAIL;

  return (
    <AdminShell
      title="Admin Management"
      subtitle="Role-based administrator permissions, hierarchy and account management"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchAdmins}
            className={`${outlineBtn} cursor-pointer`}
            title="Refresh list"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className={`${solidBtn} cursor-pointer`}
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add New Admin
          </button>
        </div>
      }
    >
      {/* Overview Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 sm:p-5">
          <p className="m-0 text-[10px] uppercase tracking-[0.2em] text-black/50 sm:text-[11px]">
            Total Admins
          </p>
          <p className={`${serif} mb-0 mt-2 text-[30px] font-medium text-[#B20947] sm:text-[36px]`}>
            {admins.length}
          </p>
          <p className="mb-0 mt-1 text-[11px] text-black/50">Accounts in studio</p>
        </div>

        <div className="min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 sm:p-5">
          <p className="m-0 text-[10px] uppercase tracking-[0.2em] text-black/50 sm:text-[11px]">
            Super Admins
          </p>
          <p className={`${serif} mb-0 mt-2 text-[30px] font-medium text-[#B20947] sm:text-[36px]`}>
            {ownerCount}
          </p>
          <p className="mb-0 mt-1 text-[11px] text-black/50">Primary root access</p>
        </div>

        <div className="min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 sm:p-5">
          <p className="m-0 text-[10px] uppercase tracking-[0.2em] text-black/50 sm:text-[11px]">
            Secondary Admins
          </p>
          <p className={`${serif} mb-0 mt-2 text-[30px] font-medium text-[#B20947] sm:text-[36px]`}>
            {admins.length - ownerCount}
          </p>
          <p className="mb-0 mt-1 text-[11px] text-black/50">Delegated operators</p>
        </div>

        <div className="min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 sm:p-5">
          <p className="m-0 text-[10px] uppercase tracking-[0.2em] text-black/50 sm:text-[11px]">
            Can Add Admins
          </p>
          <p className={`${serif} mb-0 mt-2 text-[30px] font-medium text-[#B20947] sm:text-[36px]`}>
            {admins.filter((a) => isOwnerAccount(a) || a.can_manage_admins).length}
          </p>
          <p className="mb-0 mt-1 text-[11px] text-black/50">Authorized managers</p>
        </div>
      </div>

      {/* Admins list card */}
      <div className={`${card} min-w-0 p-4 sm:p-7`}>
        <div className="flex flex-col gap-2 border-b border-[#E8CFD2] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={`${serif} text-[22px] font-medium text-[#332B2B]`}>
              Registered Administrator Accounts
            </h2>
            <p className="text-[12px] text-[#6f6565]">
              {iAmOwner
                ? "You are the main admin. You can add and remove admins, and choose which admins can manage other admins."
                : "The main admin has allowed you to add and remove admins. Only the main admin can change this permission."}
            </p>
          </div>
          <span className="text-[12px] font-medium text-[#B20947]">
            {admins.length} {admins.length === 1 ? "Administrator" : "Administrators"}
          </span>
        </div>

        {/* Action alerts in directory section */}
        {actionSuccess && (
          <div className="mt-4">
            <AlertBox
              variant="success"
              message={actionSuccess}
              onClose={() => setActionSuccess("")}
            />
          </div>
        )}

        {actionError && (
          <div className="mt-4">
            <AlertBox
              variant="error"
              message={actionError}
              onClose={() => setActionError("")}
            />
          </div>
        )}

        {admins.length === 0 ? (
          <p className="m-0 mt-5 py-6 text-center text-[13px] text-[#6f6565]">
            {loading ? "Loading administrators..." : "No administrators found."}
          </p>
        ) : (
          <>
            {/* Phones: one card per administrator */}
            <ul className="m-0 mt-5 flex list-none flex-col gap-3 p-0 md:hidden">
              {admins.map((a) => (
                <li
                  key={a.id}
                  className="min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FFFBF5] p-4"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E8B8C5] bg-[#FFF5F7] font-semibold text-[#B20947]">
                      {a.name ? a.name.charAt(0).toUpperCase() : "A"}
                    </div>
                    <div className="min-w-0">
                      <div className="break-words font-semibold text-[#332B2B]">
                        {a.name}
                        {isMe(a) && <span className="ml-1.5 text-[12px] font-normal text-black/50">(you)</span>}
                      </div>
                      <div className="break-all text-[12px] text-[#6f6565]">{a.email}</div>
                      {a.phone && <div className="text-[11px] text-[#9c8c80]">{a.phone}</div>}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    {roleBadge(a)}
                    {statusBadge(a)}
                  </div>
                  <div className="mt-2">{permBadge(a)}</div>
                  <p className="m-0 mt-2 break-all text-[12px] text-[#6f6565]">
                    Created by: {a.created_by}
                  </p>

                  <div className="mt-3 border-t border-black/5 pt-3">{renderActions(a)}</div>
                </li>
              ))}
            </ul>

            {/* Tablets and larger: table */}
            <div className="mt-5 hidden overflow-x-auto rounded-xl border border-[#E8CFD2] bg-white md:block">
              <table className="w-full min-w-[720px] text-left text-[14px]">
                <thead className="bg-[#FFF5F7] text-[11px] uppercase tracking-wider text-[#B20947]">
                  <tr>
                    <th className="px-4 py-3">Administrator</th>
                    <th className="px-4 py-3">Role Hierarchy</th>
                    <th className="px-4 py-3">Account Status</th>
                    <th className="px-4 py-3">Permission: Add Other Admins</th>
                    <th className="px-4 py-3">Created By</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8CFD2]">
                  {admins.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-[#FCF8F3]">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E8B8C5] bg-[#FFF5F7] font-semibold text-[#B20947]">
                            {a.name ? a.name.charAt(0).toUpperCase() : "A"}
                          </div>
                          <div>
                            <div className="font-semibold text-[#332B2B]">
                              {a.name}
                              {isMe(a) && <span className="ml-1.5 text-[12px] font-normal text-black/50">(you)</span>}
                            </div>
                            <div className="text-[12px] text-[#6f6565]">{a.email}</div>
                            {a.phone && <div className="text-[11px] text-[#9c8c80]">{a.phone}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">{roleBadge(a)}</td>
                      <td className="px-4 py-3.5">{statusBadge(a)}</td>
                      <td className="px-4 py-3.5">{permBadge(a)}</td>
                      <td className="px-4 py-3.5 text-[12px] text-[#6f6565]">{a.created_by}</td>
                      <td className="px-4 py-3.5 text-right">{renderActions(a)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* MODAL: ADD NEW ADMIN */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl border-2 border-[#E8B8C5] bg-[#FAF1E4] p-5 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between gap-3 border-b border-[#E8CFD2] pb-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E8B8C5] bg-[#FFF5F7] text-[#B20947]">
                  <UserPlus size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className={`${serif} text-[20px] font-medium text-[#B20947] sm:text-[22px]`}>
                    Add New Administrator
                  </h3>
                  <p className="text-[11px] text-[#6f6565]">
                    Create a Secondary Admin account with assigned credentials
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="shrink-0 cursor-pointer rounded-lg p-1 text-[#666] hover:text-black"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="mt-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Admin Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fatima Zahra"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Admin Email Address (Login ID) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin2@izhablooms.com"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className={`${inputCls} mt-1`}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                    Password *
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Min 6 characters"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-[#999] hover:text-black"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                    Confirm Password *
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Re-enter password"
                    value={newAdmin.confirmPassword}
                    onChange={(e) => setNewAdmin({ ...newAdmin, confirmPassword: e.target.value })}
                    className={`${inputCls} mt-1`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#332B2B]">
                  Contact Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 99957 57612"
                  value={newAdmin.phone}
                  onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                  className={`${inputCls} mt-1`}
                />
              </div>

              <p className="m-0 rounded-xl border border-[#E8CFD2] bg-white p-3.5 text-[11px] leading-relaxed text-[#6f6565]">
                New admins cannot manage other admins by default. Only the main admin can allow this later, using the &quot;Allow to manage admins&quot; button in the list.
              </p>

              <div className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`${outlineBtn} w-full cursor-pointer justify-center sm:w-auto`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className={`${solidBtn} w-full cursor-pointer justify-center disabled:cursor-not-allowed sm:w-auto`}
                >
                  {addLoading ? "Creating..." : "Create Secondary Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!deleting) closeDelete();
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-admin-title"
            className="w-full max-w-md rounded-2xl border-2 border-[#E8B8C5] bg-[#FAF1E4] p-5 shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E8B8C5] bg-[#FFF5F7] text-[#B20947]">
                <ShieldAlert size={22} />
              </div>
              <div className="min-w-0">
                <h3
                  id="delete-admin-title"
                  className={`${serif} m-0 text-[22px] font-medium text-[#B20947]`}
                >
                  Delete administrator?
                </h3>
                <p className="m-0 mt-1.5 break-words text-[14px] leading-relaxed text-[#6f6565]">
                  Are you sure you want to permanently delete the administrator account{" "}
                  <strong className="text-[#332B2B]">&quot;{deleteTarget.name}&quot;</strong>? This cannot be undone.
                </p>
              </div>
            </div>

            {deleteError && (
              <AlertBox
                variant="error"
                message={deleteError}
                onClose={() => setDeleteError("")}
                className="mt-4"
              />
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                className={`${outlineBtn} w-full cursor-pointer justify-center disabled:cursor-not-allowed sm:w-auto`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAdmin}
                disabled={deleting}
                className={`${solidBtn} w-full cursor-pointer justify-center gap-1.5 disabled:cursor-not-allowed sm:w-auto`}
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}