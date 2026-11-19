"use client";

import { useEffect, useId, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { serif } from "@/components/izha/ui";

const CRIMSON = "#B20947";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Locks the buttons while the delete request is running. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** In-page alert box (replaces the browser's window.confirm popup). */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", onKey);

    // Stop the page behind from scrolling while the box is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the safe button first
    cancelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF5F7]"
            style={{ color: CRIMSON }}
          >
            <AlertTriangle size={20} />
          </span>
          <div className="min-w-0">
            <h3
              id={titleId}
              className={`${serif} m-0 text-[22px] font-medium leading-tight sm:text-[24px]`}
              style={{ color: CRIMSON }}
            >
              {title}
            </h3>
            <p id={descId} className="mb-0 mt-2 break-words text-[14px] leading-relaxed text-black/60">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex cursor-pointer items-center justify-center rounded-sm border border-[#E8B8C5] bg-[#FAF3E8] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#332B2B] transition-colors hover:border-[#B20947] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex cursor-pointer items-center justify-center rounded-sm border border-[#B20947] bg-[#B20947] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}