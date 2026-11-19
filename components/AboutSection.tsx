"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { WhatsAppSvg } from "@/components/WhatsAppFloat";
import { KEYS, useStored } from "@/lib/izha-store";
import { DEFAULT_ABOUT, type AboutContent } from "@/lib/demo-store";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const COLORS = {
  bg: "#FBF1EE",
  ink: "#332B2B",
  body: "#6f6565",
  plum: "#8F3057",
  frame: "#E8B8C5",
  frameBg: "#FFF5F7",
  line: "#E8CFD2",
};

const WHATSAPP = "919995757612";

export default function AboutSection() {
  const [storedAbout, setStoredAbout] = useStored<AboutContent>(KEYS.about, DEFAULT_ABOUT);

  useEffect(() => {
    fetch("/api/content/about")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.value && typeof data.value === "object") {
          setStoredAbout(data.value);
        }
      })
      .catch(() => {});
  }, [setStoredAbout]);

  const about = storedAbout ?? DEFAULT_ABOUT;
  const paragraphs = about.paragraphs?.length ? about.paragraphs : DEFAULT_ABOUT.paragraphs;
  const points = about.points?.length ? about.points : DEFAULT_ABOUT.points;

  const mainImageSrc = about.mainImage || DEFAULT_ABOUT.mainImage;
  const smallImageSrc = about.smallImage || DEFAULT_ABOUT.smallImage;

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      style={{ backgroundColor: COLORS.bg }}
      className="w-full py-14 md:py-20"
    >
      <div className="mx-auto grid max-w-[1100px] items-center gap-12 px-5 md:grid-cols-2 md:gap-14 md:px-8 lg:gap-20">
        {/* Pictures */}
        <div className="relative mx-auto aspect-[1/1.2] w-full max-w-[400px] md:max-w-none">
          <div
            className="absolute left-0 top-0 aspect-[3/4] w-[78%] overflow-hidden rounded-t-full border-2 p-1.5"
            style={{ borderColor: COLORS.frame, backgroundColor: "#fff" }}
          >
            <div
              className="relative h-full w-full overflow-hidden rounded-t-full"
              style={{ backgroundColor: COLORS.frameBg }}
            >
              <Image
                src={mainImageSrc}
                alt={about.mainImageAlt || DEFAULT_ABOUT.mainImageAlt}
                fill
                unoptimized={mainImageSrc.startsWith("data:")}
                sizes="(min-width: 768px) 28vw, 70vw"
                className="object-cover"
              />
            </div>
          </div>

          <div
            className="absolute bottom-0 right-0 aspect-[3/4] w-[44%] overflow-hidden rounded-t-full border-[6px] shadow-lg"
            style={{ borderColor: COLORS.bg, backgroundColor: COLORS.frameBg }}
          >
            <div className="relative h-full w-full">
              <Image
                src={smallImageSrc}
                alt={about.smallImageAlt || DEFAULT_ABOUT.smallImageAlt}
                fill
                unoptimized={smallImageSrc.startsWith("data:")}
                sizes="(min-width: 768px) 16vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="text-center md:text-left">
          <h2
            id="about-heading"
            className={`${cormorant.className} text-4xl font-medium leading-[1.1] md:text-5xl`}
            style={{ color: COLORS.ink }}
          >
            {about.heading || DEFAULT_ABOUT.heading}
          </h2>

          <div
            className="mx-auto mt-5 h-0.5 w-14 rounded md:mx-0"
            style={{ backgroundColor: COLORS.frame }}
            aria-hidden="true"
          />

          {paragraphs.map((p: string, i: number) => (
            <p
              key={i}
              className={`${cormorant.className} ${i === 0 ? "mt-6" : "mt-4"} text-lg leading-relaxed md:text-xl`}
              style={{ color: COLORS.body }}
            >
              {p}
            </p>
          ))}

          <ul className="mt-7 text-left">
            {points.map((p, i: number) => (
              <li
                key={i}
                className="border-t py-3.5 last:border-b"
                style={{ borderColor: COLORS.line }}
              >
                <h3
                  className={`${cormorant.className} text-xl font-semibold`}
                  style={{ color: COLORS.plum }}
                >
                  {p.title}
                </h3>
                <p className="mt-0.5 text-sm leading-relaxed" style={{ color: COLORS.body }}>
                  {p.text}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-1 text-center md:text-left">
            <p
              className={`${cormorant.className} text-xl font-semibold italic`}
              style={{ color: COLORS.plum }}
            >
              {about.tagline || DEFAULT_ABOUT.tagline}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: COLORS.body }}>
              {about.subtext || DEFAULT_ABOUT.subtext}
            </p>
          </div>

          <div className="mt-7 flex flex-col items-center gap-4 sm:flex-row md:justify-start">
            <Link
              href={about.buttonHref || DEFAULT_ABOUT.buttonHref}
              className="inline-flex items-center justify-center rounded-[10px] border-[1.5px] border-[#E99A9F] bg-white px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#B20947] transition-colors hover:bg-[#FFF5F7]"
            >
              {about.buttonText || DEFAULT_ABOUT.buttonText}
            </Link>

            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
                "Hi IZHA BLOOMS! I'm interested in your collection. Could you please assist me?"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm underline underline-offset-4 transition-colors hover:text-[#B20947]"
              style={{ color: COLORS.ink }}
            >
              <WhatsAppSvg size={24} />
              Chat with us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}