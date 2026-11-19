"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  HelpCircle,
  MapPin,
  Percent,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { KEYS, inr, useStored } from "@/lib/izha-store";
import AdminShell, { inputCls, outlineBtn } from "@/components/admin/AdminShell";
import AlertBox from "@/components/izha/AlertBox";
import { serif, solidBtn } from "@/components/izha/ui";
import { apiUrl } from "@/lib/api-config";
import {
  ALL_INDIAN_STATES,
  DEFAULT_DELIVERY_SETTINGS,
  calculateDeliveryCharge,
  type DeliveryCoverage,
  type DeliveryScope,
  type DeliverySettings,
} from "@/lib/delivery";

const CRIMSON = "#B20947";

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="h-full rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 transition-colors hover:border-[#B20947]/40 sm:p-6">
      <p className="m-0 text-[10px] uppercase tracking-[0.15em] text-black/50 sm:text-[11px] sm:tracking-[0.25em]">
        {label}
      </p>
      <p
        className={`${serif} lining-nums mb-0 mt-3 break-words font-medium leading-none sm:mt-4 ${
          value.startsWith("₹") ? "text-[26px] sm:text-[34px]" : "text-[30px] sm:text-[40px]"
        }`}
        style={{ color: CRIMSON }}
      >
        {value}
      </p>
      {note && <p className="mb-0 mt-2 text-[11px] text-black/45 sm:mt-3 sm:text-[12px]">{note}</p>}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-sm border border-[#E8CFD2] bg-[#FAF1E4] p-4 sm:p-6 ${className}`}>
      <h2
        className={`${serif} m-0 flex items-center gap-2 break-words text-[22px] font-medium leading-tight sm:text-[28px]`}
        style={{ color: CRIMSON }}
      >
        {title}
      </h2>
      {subtitle && <p className="mb-0 mt-1 text-[13px] text-[#6f6565]">{subtitle}</p>}
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

export default function AdminDeliveryPage() {
  const [settings, setSettings] = useStored<DeliverySettings>(
    KEYS.deliverySettings,
    DEFAULT_DELIVERY_SETTINGS
  );
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [pincodeInput, setPincodeInput] = useState(
    (settings.eligiblePincodes || []).join(", ")
  );

  // Live Simulator State
  const [simSubtotal, setSimSubtotal] = useState("800");
  const [simState, setSimState] = useState("Kerala");
  const [simPincode, setSimPincode] = useState("682016");

  // Fetch settings from database on mount
  useEffect(() => {
    fetch(apiUrl("/delivery-settings"))
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.settings) {
          setSettings(data.settings);
          setPincodeInput((data.settings.eligiblePincodes || []).join(", "));
        }
      })
      .catch(() => {});
  }, [setSettings]);

  const handlePincodeChange = (val: string) => {
    setPincodeInput(val);
    const codes = val
      .split(/[,;\s]+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    setSettings((prev) => ({ ...prev, eligiblePincodes: codes }));
  };

  const toggleState = (st: string) => {
    setSettings((prev) => {
      const current = prev.eligibleStates || [];
      const exists = current.includes(st);
      const updated = exists ? current.filter((s) => s !== st) : [...current, st];
      return { ...prev, eligibleStates: updated };
    });
  };

  const selectAllStates = () => {
    setSettings((prev) => ({ ...prev, eligibleStates: [...ALL_INDIAN_STATES] }));
  };

  const deselectAllStates = () => {
    setSettings((prev) => ({ ...prev, eligibleStates: [] }));
  };

  const selectSouthIndia = () => {
    const south = ["Kerala", "Tamil Nadu", "Karnataka", "Andhra Pradesh", "Telangana", "Goa", "Puducherry"];
    setSettings((prev) => ({ ...prev, eligibleStates: south }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg("");

    const adminToken = typeof window !== "undefined" ? localStorage.getItem("izha_admin_token") : null;
    const token = adminToken || (typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null);
    try {
      const res = await fetch(apiUrl("/delivery-settings"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ settings }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("izha-store-sync", { detail: KEYS.deliverySettings })
          );
        }
      } else {
        setErrorMsg(data?.message || "Failed to save settings. Please retry.");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  // Run the live simulator using current form settings
  const simResult = useMemo(() => {
    return calculateDeliveryCharge(settings, {
      subtotal: Number(simSubtotal) || 0,
      state: simState,
      pincode: simPincode,
    });
  }, [settings, simSubtotal, simState, simPincode]);

  return (
    <AdminShell title="Delivery Settings">
      <div className="w-full min-w-0">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              className={`${serif} mb-2 mt-0 break-words font-medium leading-tight`}
              style={{ color: CRIMSON, fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
            >
              Delivery Settings
            </h2>
            <p className="mb-6 mt-0 text-[14px] text-black/60 sm:text-[15px] md:mb-8">
              Configure free delivery eligibility, coverage regions, standard shipping charges &amp; live checkout calculations
            </p>
          </div>
          <Link
            href="/admin/offers"
            className={`${outlineBtn} shrink-0 self-start sm:self-auto gap-1.5`}
          >
            <Percent size={14} /> Offers &amp; Combos
          </Link>
        </div>

        {/* Quick Summary Cards */}
        <section aria-label="Delivery Summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Free Delivery"
            value={settings.freeDeliveryEnabled ? "Enabled" : "Disabled"}
            note={
              settings.freeDeliveryEnabled
                ? settings.freeDeliveryScope === "all_orders"
                  ? "All eligible orders (₹0 min)"
                  : `From ${inr(settings.freeDeliveryMinAmount)}`
                : "Standard charges apply"
            }
          />
          <StatCard
            label="Coverage"
            value={
              settings.coverage === "all_india"
                ? "All India"
                : settings.coverage === "kerala_only"
                ? "Kerala Only"
                : settings.coverage === "selected_states"
                ? `${settings.eligibleStates?.length || 0} States`
                : "Custom PINs"
            }
            note="Applicable delivery zone"
          />
          <StatCard
            label="Kerala Charge"
            value={
              settings.enableRegionCharges
                ? settings.keralaDeliveryCharge === 0
                  ? "FREE"
                  : inr(settings.keralaDeliveryCharge)
                : inr(settings.standardDeliveryCharge)
            }
            note="PIN 67xxxx–69xxxx"
          />
          <StatCard
            label="Standard / Other"
            value={
              settings.enableRegionCharges
                ? inr(settings.outsideKeralaDeliveryCharge)
                : inr(settings.standardDeliveryCharge)
            }
            note="Non-qualifying orders"
          />
        </section>

        {/* Form Settings */}
        <form onSubmit={handleSave} className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          {/* Section A: Free Delivery Control */}
          <Panel
            title={
              <>
                <Sparkles size={20} className="text-[#B20947]" />
                <span>A. Free Delivery Control</span>
              </>
            }
            subtitle="Enable or disable free delivery and specify whether it applies to all orders or above a minimum order value."
          >
            <div className="space-y-4">
              {/* Enable / Disable Switch */}
              <div className="rounded-sm border border-[#DFCBB3] bg-[#EFE2CE] p-4">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 text-[15px] font-semibold text-[#332B2B]">
                      Enable Free Delivery Offer
                    </p>
                    <p className="m-0 mt-0.5 text-[12px] text-[#6f6565]">
                      When disabled, standard delivery charges apply to all orders without exception.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.freeDeliveryEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, freeDeliveryEnabled: e.target.checked })
                    }
                    className="h-5 w-5 shrink-0 accent-[#B20947]"
                  />
                </label>
              </div>

              {settings.freeDeliveryEnabled && (
                <div className="space-y-4 rounded-sm border border-[#E8CFD2] bg-[#FAF3E8] p-4 sm:p-5">
                  <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#332B2B]">
                    Free Delivery Condition
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-sm border p-3.5 transition-colors ${
                        settings.freeDeliveryScope === "min_amount"
                          ? "border-[#B20947] bg-[#FFF5F7]"
                          : "border-[#DFCBB3] bg-[#FAF1E4]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="freeDeliveryScope"
                        checked={settings.freeDeliveryScope === "min_amount"}
                        onChange={() =>
                          setSettings({ ...settings, freeDeliveryScope: "min_amount" })
                        }
                        className="mt-1 h-4 w-4 accent-[#B20947]"
                      />
                      <div>
                        <span className="text-[14px] font-semibold text-[#332B2B]">
                          Orders Meeting Minimum Amount
                        </span>
                        <p className="m-0 mt-1 text-[12px] text-[#6f6565]">
                          Free delivery is unlocked when the order subtotal reaches or exceeds this threshold.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-sm border p-3.5 transition-colors ${
                        settings.freeDeliveryScope === "all_orders"
                          ? "border-[#B20947] bg-[#FFF5F7]"
                          : "border-[#DFCBB3] bg-[#FAF1E4]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="freeDeliveryScope"
                        checked={settings.freeDeliveryScope === "all_orders"}
                        onChange={() =>
                          setSettings({
                            ...settings,
                            freeDeliveryScope: "all_orders",
                            freeDeliveryMinAmount: 0,
                          })
                        }
                        className="mt-1 h-4 w-4 accent-[#B20947]"
                      />
                      <div>
                        <span className="text-[14px] font-semibold text-[#332B2B]">
                          All Orders (₹0 Threshold)
                        </span>
                        <p className="m-0 mt-1 text-[12px] text-[#6f6565]">
                          Every order within the eligible coverage zone receives 100% free delivery.
                        </p>
                      </div>
                    </label>
                  </div>

                  {settings.freeDeliveryScope === "min_amount" && (
                    <div className="mt-3">
                      <label className="block">
                        <span className="mb-1 block text-[13px] font-semibold text-[#332B2B]">
                          Minimum Order Amount for Free Delivery (₹)
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            className={`${inputCls} max-w-[220px]`}
                            value={settings.freeDeliveryMinAmount}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                freeDeliveryMinAmount: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                          />
                          <div className="flex flex-wrap gap-1.5 text-[12px]">
                            {[499, 799, 999, 1499, 1999].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() =>
                                  setSettings({ ...settings, freeDeliveryMinAmount: amt })
                                }
                                className={`rounded px-2.5 py-1 text-[11px] font-semibold border ${
                                  settings.freeDeliveryMinAmount === amt
                                    ? "border-[#B20947] bg-[#B20947] text-white"
                                    : "border-[#DFCBB3] bg-[#FAF1E4] text-[#332B2B] hover:bg-[#EFE2CE]"
                                }`}
                              >
                                ₹{amt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>

          {/* Section B: Delivery Coverage */}
          <Panel
            title={
              <>
                <MapPin size={20} className="text-[#B20947]" />
                <span>B. Delivery Coverage &amp; Regions</span>
              </>
            }
            subtitle="Select the geographic area eligible for the delivery rules above (Kerala only, selected states, all India, or custom PIN codes)."
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    key: "all_india",
                    label: "All India",
                    desc: "Free delivery applies nationwide across all serviceable Indian PIN codes.",
                  },
                  {
                    key: "kerala_only",
                    label: "Kerala Only",
                    desc: "Free delivery applies strictly within Kerala (PIN 67xxxx–69xxxx).",
                  },
                  {
                    key: "selected_states",
                    label: "Selected States",
                    desc: "Free delivery applies only to customer addresses in states you choose.",
                  },
                  {
                    key: "custom_pincodes",
                    label: "Specific PINs",
                    desc: "Free delivery applies to specific PIN codes or prefixes you list.",
                  },
                ].map((cov) => {
                  const active = settings.coverage === cov.key;
                  return (
                    <label
                      key={cov.key}
                      className={`flex cursor-pointer flex-col justify-between rounded-sm border p-4 transition-colors ${
                        active
                          ? "border-[#B20947] bg-[#FFF5F7]"
                          : "border-[#DFCBB3] bg-[#FAF1E4] hover:border-[#B20947]/40"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[15px] font-semibold text-[#332B2B]">
                            {cov.label}
                          </span>
                          <input
                            type="radio"
                            name="coverage"
                            checked={active}
                            onChange={() =>
                              setSettings({ ...settings, coverage: cov.key as DeliveryCoverage })
                            }
                            className="h-4 w-4 accent-[#B20947]"
                          />
                        </div>
                        <p className="m-0 mt-2 text-[12px] leading-relaxed text-[#6f6565]">
                          {cov.desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Selected States Selector */}
              {settings.coverage === "selected_states" && (
                <div className="rounded-sm border border-[#E8CFD2] bg-[#FAF3E8] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-3">
                    <span className="text-[13px] font-semibold text-[#332B2B]">
                      Eligible States ({settings.eligibleStates?.length || 0} selected)
                    </span>
                    <div className="flex items-center gap-2 text-[12px]">
                      <button
                        type="button"
                        onClick={selectAllStates}
                        className="cursor-pointer text-[#B20947] hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-black/30">|</span>
                      <button
                        type="button"
                        onClick={selectSouthIndia}
                        className="cursor-pointer text-[#B20947] hover:underline"
                      >
                        South India
                      </button>
                      <span className="text-black/30">|</span>
                      <button
                        type="button"
                        onClick={deselectAllStates}
                        className="cursor-pointer text-[#6f6565] hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 max-h-[260px] overflow-y-auto p-1">
                    {ALL_INDIAN_STATES.map((st) => {
                      const isChecked = (settings.eligibleStates || []).includes(st);
                      return (
                        <label
                          key={st}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-[#EFE2CE]"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleState(st)}
                            className="h-4 w-4 accent-[#B20947]"
                          />
                          <span className="text-[13px] text-[#332B2B] truncate">{st}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom PIN Codes Input */}
              {settings.coverage === "custom_pincodes" && (
                <div className="rounded-sm border border-[#E8CFD2] bg-[#FAF3E8] p-4 sm:p-5">
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-semibold text-[#332B2B]">
                      Eligible PIN Codes or Prefixes (comma or space separated)
                    </span>
                    <textarea
                      rows={3}
                      className={inputCls}
                      placeholder="e.g. 682016, 683101, 670, 560001"
                      value={pincodeInput}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                    />
                    <p className="mt-1 text-[11px] text-[#6f6565]">
                      Tip: You can enter exact 6-digit PIN codes (e.g. 682016) or 2-to-3 digit regional prefixes (e.g. 682, 670).
                    </p>
                  </label>
                  {(settings.eligiblePincodes || []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {settings.eligiblePincodes.map((pin) => (
                        <span
                          key={pin}
                          className="inline-flex items-center gap-1 rounded bg-[#FFF5F7] px-2 py-0.5 text-[11px] font-semibold text-[#B20947] border border-[#E8CFD2]"
                        >
                          {pin}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>

          {/* Section C: Delivery Charges */}
          <Panel
            title={
              <>
                <Truck size={20} className="text-[#B20947]" />
                <span>C. Delivery Charges</span>
              </>
            }
            subtitle="Configure standard shipping charges applied when an order does not qualify for free delivery or is outside free coverage."
          >
            <div className="space-y-4">
              <div className="rounded-sm border border-[#DFCBB3] bg-[#EFE2CE] p-4">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 text-[14px] font-semibold text-[#332B2B]">
                      Differentiate Delivery Charges by Region
                    </p>
                    <p className="m-0 mt-0.5 text-[12px] text-[#6f6565]">
                      Enable different delivery charges for Kerala orders vs Outside Kerala orders.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableRegionCharges}
                    onChange={(e) =>
                      setSettings({ ...settings, enableRegionCharges: e.target.checked })
                    }
                    className="h-5 w-5 shrink-0 accent-[#B20947]"
                  />
                </label>
              </div>

              {settings.enableRegionCharges ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block rounded-sm border border-[#E8CFD2] bg-[#FAF3E8] p-4">
                    <span className="mb-1 block text-[13px] font-semibold text-[#332B2B]">
                      Kerala Standard Delivery Charge (₹)
                    </span>
                    <p className="mb-2 text-[11px] text-[#6f6565]">
                      Delivery charge within Kerala when not eligible for free delivery. Enter 0 for free.
                    </p>
                    <input
                      type="number"
                      min="0"
                      className={inputCls}
                      value={settings.keralaDeliveryCharge}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          keralaDeliveryCharge: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                    />
                  </label>

                  <label className="block rounded-sm border border-[#E8CFD2] bg-[#FAF3E8] p-4">
                    <span className="mb-1 block text-[13px] font-semibold text-[#332B2B]">
                      Outside Kerala Standard Delivery Charge (₹)
                    </span>
                    <p className="mb-2 text-[11px] text-[#6f6565]">
                      Delivery charge for rest of India when not eligible for free delivery.
                    </p>
                    <input
                      type="number"
                      min="0"
                      className={inputCls}
                      value={settings.outsideKeralaDeliveryCharge}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          outsideKeralaDeliveryCharge: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                    />
                  </label>
                </div>
              ) : (
                <label className="block rounded-sm border border-[#E8CFD2] bg-[#FAF3E8] p-4">
                  <span className="mb-1 block text-[13px] font-semibold text-[#332B2B]">
                    Standard All-India Delivery Charge (₹)
                  </span>
                  <p className="mb-2 text-[11px] text-[#6f6565]">
                    Flat shipping charge for all orders that do not qualify for free delivery.
                  </p>
                  <input
                    type="number"
                    min="0"
                    className={`${inputCls} max-w-[260px]`}
                    value={settings.standardDeliveryCharge}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        standardDeliveryCharge: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                </label>
              )}
            </div>
          </Panel>

          {/* Section D: Live Simulator / Testing Sandbox */}
          <Panel
            title={
              <>
                <ShieldCheck size={20} className="text-[#3a6b42]" />
                <span>D. Live Customer Checkout Simulator</span>
              </>
            }
            subtitle="Test how customer checkout will calculate delivery charges with your current configuration before saving."
            className="border-[#c4e2c9] !bg-[#f9fdfa]"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Inputs */}
              <div className="space-y-3 rounded-sm border border-[#c4e2c9] bg-white p-4">
                <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-black/50">
                  Sample Order Details
                </span>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-[12px] text-[#6f6565]">Order Subtotal (₹)</span>
                    <input
                      type="number"
                      className={inputCls}
                      value={simSubtotal}
                      onChange={(e) => setSimSubtotal(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[12px] text-[#6f6565]">State</span>
                    <select
                      className={inputCls}
                      value={simState}
                      onChange={(e) => setSimState(e.target.value)}
                    >
                      {ALL_INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[12px] text-[#6f6565]">PIN Code</span>
                    <input
                      className={inputCls}
                      value={simPincode}
                      onChange={(e) => setSimPincode(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              {/* Simulation Output */}
              <div className="rounded-sm border border-[#c4e2c9] bg-[#f0f7f1] p-4 text-[#332B2B]">
                <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#3a6b42]">
                  Checkout Calculation Output
                </span>
                <div className="mt-2.5 space-y-1.5 text-[14px]">
                  <div className="flex justify-between">
                    <span className="text-[#6f6565]">Calculated Delivery Charge:</span>
                    <strong className={simResult.isFreeDelivery ? "text-[#3a6b42]" : "text-[#B20947]"}>
                      {simResult.isFreeDelivery ? "FREE (₹0)" : inr(simResult.deliveryCharge)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6f6565]">Region Free Delivery Eligible?</span>
                    <strong>{simResult.isEligibleForFreeDelivery ? "Yes" : "No"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6f6565]">Free Delivery Threshold Met?</span>
                    <strong>{simResult.qualifiesForFreeDelivery ? "Yes" : "No"}</strong>
                  </div>
                  {simResult.freeDeliveryMessage && (
                    <div className="mt-2 rounded border border-[#c4e2c9] bg-white p-2.5 text-[12px]">
                      <span className="text-[#6f6565]">Customer Dynamic Alert: </span>
                      <strong className={simResult.qualifiesForFreeDelivery ? "text-[#3a6b42]" : "text-[#B20947]"}>
                        {simResult.freeDeliveryMessage}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          {/* Feedback & Actions */}
          <div className="pt-2">
            {errorMsg && (
              <AlertBox
                variant="error"
                message={errorMsg}
                onClose={() => setErrorMsg("")}
                className="mb-4"
              />
            )}
            {saved && (
              <AlertBox
                variant="success"
                message="Delivery settings successfully saved to database! Customer checkout is now running on these live rules."
                onClose={() => setSaved(false)}
                className="mb-4"
              />
            )}

            <button
              type="submit"
              disabled={isSaving}
              className={`${solidBtn} w-full sm:w-auto gap-2 px-8 py-3.5`}
            >
              {saved ? <Check size={16} /> : <CheckCircle2 size={16} />}
              {isSaving ? "Saving to Database..." : saved ? "Settings Saved" : "Save Delivery Settings"}
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
