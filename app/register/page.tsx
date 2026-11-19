"use client";

import UnifiedAuthForm from "@/components/izha/UnifiedAuthForm";
import { PageShell } from "@/components/izha/ui";

export default function RegisterPage() {
  return (
    <PageShell>
      <div className="flex min-h-[75vh] items-center justify-center py-6 sm:py-10">
        <UnifiedAuthForm
          initialMode="register"
          showCloseButton={false}
          showGuestCheckout={true}
        />
      </div>
    </PageShell>
  );
}

