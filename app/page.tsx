"use client";

import { useEffect, useState } from "react";
import HeroCarousel from "@/components/HeroCarousel";
import BestSellers, { type BestSellerProduct } from "@/components/BestSellerProduct";
import ShopByCategory from "@/components/home/ShopByCategory";
import InstagramGallery from "@/components/InstagramGallery";
import NewArrivalBanner from "@/components/NewArrivalBanner";
import AboutSection from "@/components/AboutSection";
import ReviewsSection from "@/components/ReviewsSection";
import { getStoredProducts, readDeletedProducts, isProductSoldOut, type Product } from "@/lib/products";

function mapToBestSeller(item: Product): BestSellerProduct {
  const soldOut = isProductSoldOut(item);
  return {
    id: item.id,
    name: item.name,
    image: item.image,
    href: `/product/${item.id}`,
    price: item.price,
    compareAtPrice: item.mrp,
    inStock: !soldOut,
    sizes: (item.sizes || []).map((label) => ({
      label,
      inStock: !(item.soldOutSizes ?? []).includes(label),
    })),
  };
}

export default function Home() {
  const [bestSellers, setBestSellers] = useState<BestSellerProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const deleted = readDeletedProducts();

    // 1. Immediately read cached products after mount (not during SSR/initial render)
    try {
      const stored = getStoredProducts().filter((p) => !deleted.includes(p.id));
      if (stored.length > 0) {
        setBestSellers(stored.slice(0, 4).map(mapToBestSeller));
        setLoaded(true);
      }
    } catch (_) {}

    // 2. Fetch fresh products from backend API (with Cloudinary URLs)
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.products)) {
          const active = data.products
            .filter((p: any) => !deleted.includes(p.id))
            .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));
          if (active.length > 0) {
            setBestSellers(active.slice(0, 4).map(mapToBestSeller));
            try {
              localStorage.setItem("izha_admin_products", JSON.stringify(data.products));
            } catch (_) {}
          }
        }
      })
      .catch(() => {
        const stored = getStoredProducts().filter((p) => !deleted.includes(p.id));
        setBestSellers(stored.slice(0, 4).map(mapToBestSeller));
      })
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  return (
    <main>
      <HeroCarousel />
      <ShopByCategory />
      <NewArrivalBanner />
      <BestSellers products={bestSellers} loading={!loaded} viewAllHref="/shop" />
      <AboutSection />
      <InstagramGallery />
      <ReviewsSection />
    </main>
  );
}