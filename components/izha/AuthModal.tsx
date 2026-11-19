"use client";

import { useEffect } from "react";
import type { AppUser } from "@/lib/izha-store";
import UnifiedAuthForm from "@/components/izha/UnifiedAuthForm";

export type AuthModalProps = {
  initialMode?: "signin" | "register";
  onDone: (u: AppUser) => void;
  onClose: () => void;
};

export default function AuthModal({
  initialMode = "signin",
  onDone,
  onClose,
}: AuthModalProps) {
  /* Modal behaviour: Esc to close + lock page scroll while open */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-[#382B2B]/60 p-3 backdrop-blur-sm sm:p-4 md:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <UnifiedAuthForm
        initialMode={initialMode}
        onSuccess={onDone}
        onClose={onClose}
        showCloseButton={true}
        showGuestCheckout={true}
      />
    </div>
  );
}
