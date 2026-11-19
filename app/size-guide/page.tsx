"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PageShell, PageTitle, card, cardCream, outlineBtn, serif } from "@/components/izha/ui";
import { KEYS, useStored } from "@/lib/izha-store";
import { DEFAULT_CUSTOMER_CARE, type CustomerCareSettings } from "@/lib/demo-store";

export default function SizeGuidePage() {
  const [care, setCare] = useStored<CustomerCareSettings>(
    KEYS.customerCare,
    DEFAULT_CUSTOMER_CARE
  );

  useEffect(() => {
    fetch("/api/content/customerCare")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setCare(data.data);
        }
      })
      .catch(() => {});
  }, [setCare]);

  const sg = care.sizeGuide || DEFAULT_CUSTOMER_CARE.sizeGuide;
  const chart = sg.chart && sg.chart.length > 0 ? sg.chart : DEFAULT_CUSTOMER_CARE.sizeGuide.chart;
  const waNumber = sg.whatsappPhone || "919995757612";
  const waMsg = encodeURIComponent(sg.whatsappMessage || "Hi IZHA BLOOMS, I need help choosing my size.");

  return (
    <PageShell>
      <PageTitle
        title={sg.title || "Size Guide"}
        sub={sg.sub || "Clear measurements for kurtas, dresses, kurta sets, tops & maternity wear."}
      />

      <div className={`${card} mt-10 overflow-hidden p-5 sm:p-8`}>
        <h2 className={`${serif} text-[26px] font-medium text-[#332B2B]`}>
          {sg.chartTitle || "Women's Body Measurement Chart"}
        </h2>
        <p className="mt-1 text-[14px] text-[#6f6565]">
          {sg.chartDescription || "Measurements are listed in inches and centimetres. If you prefer a relaxed fit or sit between two sizes, we recommend sizing up."}
        </p>

        <div className="mt-5 overflow-x-auto rounded-xl border border-[#E8CFD2]">
          <table className="w-full min-w-[520px] text-left text-[14px]">
            <thead className="bg-[#FFF5F7] text-[11px] uppercase tracking-[0.14em] text-[#B20947]">
              <tr>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Bust</th>
                <th className="px-4 py-3">Waist</th>
                <th className="px-4 py-3">Hip</th>
                <th className="px-4 py-3">UK Equivalent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8CFD2] bg-white text-[#332B2B]">
              {chart.map((r, i) => (
                <tr key={r.size || i} className="hover:bg-[#FCF8F3]">
                  <td className="px-4 py-3 font-semibold">{r.size}</td>
                  <td className="px-4 py-3">{r.bust}</td>
                  <td className="px-4 py-3">{r.waist}</td>
                  <td className="px-4 py-3">{r.hip}</td>
                  <td className="px-4 py-3">{r.uk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`${cardCream} mt-6 grid gap-4 p-5 sm:grid-cols-3`}>
          <div>
            <h3 className={`${serif} text-[20px] font-medium text-[#B20947]`}>Bust</h3>
            <p className="mt-1 text-[13px] text-[#6f6565]">
              {sg.bustTip || "Measure around the fullest part of your bust keeping the tape comfortably level."}
            </p>
          </div>
          <div>
            <h3 className={`${serif} text-[20px] font-medium text-[#B20947]`}>Waist</h3>
            <p className="mt-1 text-[13px] text-[#6f6565]">
              {sg.waistTip || "Measure around the narrowest part of your natural waistline without pulling tight."}
            </p>
          </div>
          <div>
            <h3 className={`${serif} text-[20px] font-medium text-[#B20947]`}>Hip</h3>
            <p className="mt-1 text-[13px] text-[#6f6565]">
              {sg.hipTip || "Stand with feet together and measure around the widest part of your hips."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/collections" className={outlineBtn}>
            Explore Collections
          </Link>
          <a
            href={`https://wa.me/${waNumber}?text=${waMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className={outlineBtn}
          >
            Ask Sizing Help on WhatsApp
          </a>
        </div>
      </div>
    </PageShell>
  );
}
