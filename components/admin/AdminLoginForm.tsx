"use client";

import UnifiedAuthForm from "@/components/izha/UnifiedAuthForm";
import type { AppUser } from "@/lib/izha-store";

export default function AdminLoginForm({
  onSuccess,
  initialError = "",
}: {
  onSuccess?: (adminUser: AppUser) => void;
  initialError?: string;
}) {
  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-8">
      <UnifiedAuthForm
        adminEntry={true}
        initialError={initialError}
        showCloseButton={false}
        showGuestCheckout={false}
        onSuccess={onSuccess}
      />
    </div>
  );
}
