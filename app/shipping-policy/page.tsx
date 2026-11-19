
"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  PageShell,
  PageTitle,
  card,
  outlineBtn,
} from "@/components/izha/ui";
import { KEYS, useStored } from "@/lib/izha-store";
import {
  DEFAULT_CUSTOMER_CARE,
  type CustomerCareSettings,
} from "@/lib/demo-store";

export default function ShippingPolicyPage() {
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

  const sp = care.shipping || DEFAULT_CUSTOMER_CARE.shipping;

  return (
    <PageShell>
      <PageTitle
        title="Shipping & Delivery Policy"
        sub="Every order deserves special care. Thoughtfully packed and delivered to your doorstep with love."
      />

      <div
        className={`${card} mx-auto mt-6 sm:mt-10 w-full max-w-3xl space-y-7 sm:space-y-8 p-4 sm:p-6 md:p-8 text-sm sm:text-[14px] leading-7 text-[#6f6565]`}
      >
        {/* Introduction */}
        <p>
          At <strong className="text-[#332B2B]">Izha Blooms</strong>, we
          believe every order deserves special care. Each piece is
          thoughtfully packed and delivered to your doorstep with love.
        </p>

        {/* 1. Order Processing */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-semibold text-[#332B2B]">
            1. Order Processing
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Orders are processed within 2–3 business days after successful
              payment confirmation.
            </li>
            <li>
              As our products are carefully prepared and packed, processing
              time may vary during sale periods or new collection launches.
            </li>
          </ul>
        </section>

        {/* 2. Shipping & Delivery */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-semibold text-[#332B2B]">
            2. Shipping & Delivery
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>We offer shipping across India.</li>
            <li>
              Orders within Kerala are usually delivered within 3–7 business
              days after dispatch.
            </li>
            <li>
              Orders to other parts of India may take approximately 4–8
              business days after dispatch.
            </li>
            <li>
              Delivery timelines are estimates and may vary depending on the
              courier service, location, weather conditions and unforeseen
              circumstances.
            </li>
          </ul>
        </section>

        {/* 3. Shipping Charges */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-semibold text-[#332B2B]">
            3. Shipping Charges
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Shipping charges are calculated based on the delivery location
              and applicable courier rates.
            </li>
            <li>
              Any applicable shipping charges will be displayed or
              communicated before order confirmation.
            </li>
            <li>
              Special free-shipping offers will be announced through our
              website or social media platforms.
            </li>
          </ul>
        </section>

        {/* 4. Delivery Delays */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-semibold text-[#332B2B]">
            4. Delivery Delays
          </h2>
          <p>
            While we always aim to deliver your orders on time, occasional
            delays may occur due to courier-related issues, weather
            conditions, public holidays or other circumstances beyond our
            control.
          </p>
        </section>

        {/* 5. Damaged or Missing Packages */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-semibold text-[#332B2B]">
            5. Damaged or Missing Packages
          </h2>
          <p>
            If you receive a package that appears damaged or tampered with,
            please contact us within 24 hours of delivery with clear 3–4
            photos or an unboxing video so we can assist you.
          </p>
        </section>

        {/* 6. Contact Us */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-semibold text-[#332B2B]">
            6. Contact Us
          </h2>
          <p>
            For shipping-related queries or assistance, feel free to contact
            us.
          </p>

          <div className="rounded-xl bg-[#faf6f3] p-4 sm:p-5 space-y-2">
            <p className="font-semibold text-[#332B2B]">Izha Blooms</p>

            <p>
              <strong className="text-[#332B2B]">WhatsApp: </strong>
              <a
                href="https://wa.me/919995757612"
                target="_blank"
                rel="noopener noreferrer"
                className="break-all underline underline-offset-4 hover:text-[#332B2B]"
              >
                9995757612
              </a>
            </p>

            <p>
              <strong className="text-[#332B2B]">Mail: </strong>
              <a
                href="mailto:izhablooms@gmail.com"
                className="break-all underline underline-offset-4 hover:text-[#332B2B]"
              >
                izhablooms@gmail.com
              </a>
            </p>
          </div>
        </section>

        {/* Closing Message */}
        <div className="border-t border-[#eee5e0] pt-5 text-center">
          <p className="font-medium italic text-[#887878]">
            Thank you for choosing Izha Blooms. Every order is a little piece
            of love, delivered to you.
          </p>
        </div>

        {/* Track Order */}
        <div className="flex justify-center pt-1">
          <Link
            href="/track-order"
            className={`${outlineBtn} w-full sm:w-auto text-center`}
          >
            Track Your Order
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
