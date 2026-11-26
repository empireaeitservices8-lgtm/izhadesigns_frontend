"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Heart, Minus, Plus, ShieldCheck, Trash2, Truck } from "lucide-react";
import {
  KEYS,
  inr,
  useStored,
  readDeletedProducts,
  type CartItem,
  type WishItem,
} from "@/lib/izha-store";
import { DEFAULT_ADMIN_PRODUCTS, DEFAULT_OFFER_SETTINGS, type AdminProduct, type OfferSettings } from "@/lib/demo-store";
import { PRODUCTS, getStoredProducts } from "@/lib/products";
import { CatalogProductCard } from "@/components/CollectionCatalog";
import { WhatsAppSvg } from "@/components/WhatsAppFloat";
import AlertBox from "@/components/izha/AlertBox";
import { apiUrl } from "@/lib/api-config";
import {
  EmptyBlock,
  FlowerBadge,
  PageTitle,
  PageShell,
  card,
  cardCream,
  focusRing,
  outlineBtn,
  serif,
  solidBtn,
} from "@/components/izha/ui";

export default function CartPage() {
  const [cart, setCart, ready] = useStored<CartItem[]>(KEYS.cart, []);
  const [wish, setWish] = useStored<WishItem[]>(KEYS.wish, []);
  const [adminProducts, setAdminProducts] = useStored<AdminProduct[]>(KEYS.adminProducts, []);
  const [offers, setOffers] = useStored<OfferSettings>(KEYS.offers, DEFAULT_OFFER_SETTINGS);
  const [liveStockMap, setLiveStockMap] = useState<Record<string, number>>({});
  const [liveProductMap, setLiveProductMap] = useState<Record<string, { image?: string; name?: string; price?: number }>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(KEYS.adminProducts);
      const parsed = raw ? JSON.parse(raw) : [];
      const pMap: Record<string, { image?: string; name?: string; price?: number }> = {};
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          pMap[p.id] = { image: p.image, name: p.name, price: p.price };
        }
      }
      return pMap;
    } catch (_) {
      return {};
    }
  });
  const [stockAlert, setStockAlert] = useState<string | null>(null);

  useEffect(() => {
    fetch(apiUrl("/products"))
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.products)) {
          const deleted = new Set(readDeletedProducts());
          const map: Record<string, number> = {};
          const pMap: Record<string, { image?: string; name?: string; price?: number }> = {};
          const valid: AdminProduct[] = [];
          for (const p of data.products) {
            map[p.id] = p.stock !== undefined && p.stock !== null ? Number(p.stock) : 15;
            pMap[p.id] = { image: p.image, name: p.name, price: p.price };
            if (!deleted.has(p.id) && !deleted.has(p.name) && !/^p\d{1,2}$/.test(String(p.id))) {
              valid.push({
                id: p.id,
                name: p.name,
                category: p.category,
                categorySlug: p.categorySlug,
                price: p.price,
                mrp: p.mrp,
                stock: p.stock !== undefined && p.stock !== null ? Number(p.stock) : 15,
                color: p.color || "Dusty Rose",
                sizes: p.sizes || [],
                soldOutSizes: p.soldOutSizes || [],
                soldCount: p.soldCount || 0,
                image: p.image,
                gallery: p.gallery || [p.image],
                isNew: p.isNew,
                newDays: p.newDays || 30,
                createdAt: p.createdAt,
                popularity: p.popularity,
                description: p.description,
                fabric: p.fabric,
                craft: p.craft,
                fit: p.fit,
                care: p.care,
                reviews: [],
              });
            }
          }
          setLiveStockMap(map);
          setLiveProductMap(pMap);
          if (valid.length > 0) {
            setAdminProducts(valid);
          }
        }
      })
      .catch(() => {});

    fetch(apiUrl("/content/offers"))
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data && typeof data.data === "object") {
          setOffers((prev) => ({ ...prev, ...data.data }));
        }
      })
      .catch(() => {});
  }, [setOffers]);

  const getStock = (id: string): number => {
    if (liveStockMap[id] !== undefined) return liveStockMap[id];
    const ap = adminProducts.find((p) => p.id === id);
    if (ap && ap.stock !== undefined && ap.stock !== null) return Number(ap.stock);
    return 15;
  };

  const hasStockIssues = useMemo(() => {
    return cart.some((i) => {
      const avail = getStock(i.id);
      return avail <= 0 || i.qty > avail;
    });
  }, [cart, liveStockMap, adminProducts]);

  const { subtotal, savings, count } = useMemo(() => {
    let subtotal = 0;
    let savings = 0;
    let count = 0;
    for (const i of cart) {
      subtotal += i.price * i.qty;
      count += i.qty;
      if (i.oldPrice && i.oldPrice > i.price)
        savings += (i.oldPrice - i.price) * i.qty;
    }
    return { subtotal, savings, count };
  }, [cart]);

  const comboDiscount = useMemo(() => {
    if (offers.comboEnabled && count >= offers.comboMinItems && offers.comboDiscountPct > 0) {
      return Math.round((subtotal * offers.comboDiscountPct) / 100);
    }
    return 0;
  }, [offers, count, subtotal]);

  const recommendations = useMemo(() => {
    const inCartIds = new Set(cart.map((c) => String(c.id)));
    const deleted = new Set(readDeletedProducts());
    const candidates = adminProducts && adminProducts.length > 0 ? adminProducts : getStoredProducts();
    return candidates
      .filter(
        (p) =>
          !inCartIds.has(String(p.id)) &&
          !deleted.has(String(p.id)) &&
          !deleted.has(p.name) &&
          !/^p\d{1,2}$/.test(String(p.id))
      )
      .slice(0, 4);
  }, [cart, adminProducts]);

  const isLiked = (id: string) => wish.some((x) => x.id === id);

  const toggleWish = (p: (typeof PRODUCTS)[number]) => {
    setWish((list) =>
      list.some((x) => x.id === p.id)
        ? list.filter((x) => x.id !== p.id)
        : [
            ...list,
            {
              id: p.id,
              name: p.name,
              image: p.image,
              price: p.price,
              oldPrice: p.mrp,
              soldOutSizes: p.soldOutSizes,
            },
          ]
    );
  };

  const changeQty = (id: string, size: string, delta: number) => {
    const maxAvailable = getStock(id);
    setCart((items) =>
      items.map((i) => {
        if (i.id === id && i.size === size) {
          if (delta > 0 && i.qty >= maxAvailable) {
            setStockAlert(`Sorry! Only ${maxAvailable} unit${maxAvailable === 1 ? "" : "s"} are currently available in stock.`);
            return i;
          }
          setStockAlert(null);
          const nextQty = Math.max(1, Math.min(maxAvailable, i.qty + delta));
          return { ...i, qty: nextQty };
        }
        return i;
      })
    );
  };

  const remove = (id: string, size: string) =>
    setCart((items) => items.filter((i) => !(i.id === id && i.size === size)));

  const moveToWishlist = (item: CartItem) => {
    setWish((w) =>
      w.some((x) => x.id === item.id)
        ? w
        : [
            ...w,
            {
              id: item.id,
              name: item.name,
              image: item.image,
              price: item.price,
              oldPrice: item.oldPrice,
            },
          ]
    );
    remove(item.id, item.size);
  };

  return (
    <PageShell>
      <PageTitle
        title="Your Shopping Bag"
        sub={
          ready && count > 0
            ? `Your favourites, one step closer to you. · ${count} ${count === 1 ? "piece" : "pieces"}`
            : "Your favourites, one step closer to you."
        }
      />

      {ready && cart.length === 0 && (
        <EmptyBlock
          text="Your shopping bag is currently empty"
          href="/shop"
          action="Continue Shopping"
        />
      )}

      {ready && cart.length > 0 && (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/shop"
                className={`inline-flex items-center gap-1.5 text-[13px] font-medium text-[#B20947] underline-offset-4 hover:underline ${focusRing}`}
              >
                <ArrowLeft size={15} />
                Continue Shopping
              </Link>
              <span className="text-[13px] text-[#6f6565]">
                {offers.freeShippingKerala ? "Free doorstep shipping in Kerala" : `Standard shipping ₹${offers.outsideKeralaShipping}`}
                {offers.freeShippingThreshold > 0 && subtotal < offers.freeShippingThreshold
                  ? ` · Add ₹${offers.freeShippingThreshold - subtotal} more for Pan-India Free Shipping`
                  : offers.freeShippingThreshold > 0
                  ? " · Pan-India Free Shipping unlocked!"
                  : " · Pan-India delivery available"}
              </span>
            </div>

            {stockAlert && (
              <AlertBox
                variant="error"
                message={stockAlert}
                onClose={() => setStockAlert(null)}
                className="mb-2"
              />
            )}

            <ul className="space-y-4">
              {cart.map((item) => {
                const avail = getStock(item.id);
                const isOutOfStock = avail <= 0;
                const exceedsStock = item.qty > avail && !isOutOfStock;
                const displayImg =
                  (item.image && item.image !== "/images/about.jpg" ? item.image : null) ||
                  liveProductMap[item.id]?.image ||
                  adminProducts.find((p) => String(p.id) === String(item.id))?.image ||
                  item.image ||
                  "/images/about.jpg";

                return (
                <li
                  key={`${item.id}-${item.size}`}
                  className={`${card} flex gap-4 p-3 sm:p-4`}
                >
                  {/* arch photo frame */}
                  <Link
                    href={`/product/${item.id}`}
                    className="h-36 w-28 shrink-0 rounded-t-full rounded-b-xl border border-[#E8B8C5] bg-white p-1 sm:h-44 sm:w-32"
                  >
                    <div className="relative h-full w-full overflow-hidden rounded-t-full rounded-b-lg bg-[#FFF5F7]">
                      <Image
                        src={displayImg}
                        alt={item.name || "Product"}
                        fill
                        sizes="128px"
                        quality={75}
                        unoptimized={Boolean(displayImg?.startsWith("data:"))}
                        className="object-cover"
                      />
                    </div>
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/product/${item.id}`}
                          className={`${serif} line-clamp-2 text-[20px] font-medium leading-snug text-[#332B2B] hover:text-[#B20947]`}
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 text-[13px] text-[#6f6565]">
                          Size {item.size}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(item.id, item.size)}
                        aria-label={`Remove ${item.name} from shopping bag`}
                        className={`rounded-full p-2 text-[#6f6565] hover:bg-[#FFF5F7] hover:text-[#B20947] ${focusRing}`}
                      >
                        <Trash2 size={18} strokeWidth={1.6} />
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-baseline gap-2">
                      <span
                        className={`${serif} text-[20px] font-semibold text-[#332B2B]`}
                      >
                        {inr(item.price)}
                      </span>
                      {item.oldPrice && item.oldPrice > item.price && (
                        <>
                          <span className="text-[12px] text-[#9b9090] line-through">
                            {inr(item.oldPrice)}
                          </span>
                          <span className="rounded bg-[#F9E3E9] px-1.5 py-0.5 text-[10px] font-semibold text-[#B5607A]">
                            {Math.round(
                              ((item.oldPrice - item.price) / item.oldPrice) * 100
                            )}
                            % OFF
                          </span>
                        </>
                      )}
                      {/* Stock warnings */}
                      {isOutOfStock && (
                        <div className="mt-2 rounded-lg border border-[#E8CFD2] bg-[#FFF5F7] p-2 text-[12px] font-medium text-[#B20947]">
                          Sorry! This product is currently out of stock.
                        </div>
                      )}
                      {exceedsStock && (
                        <div className="mt-2 rounded-lg border border-[#E8CFD2] bg-[#FFF5F7] p-2 text-[12px] font-medium text-[#B20947]">
                          Only {avail} unit{avail === 1 ? "" : "s"} available. Please update your quantity to continue.
                        </div>
                      )}
                    </div>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                      <div
                        className="flex items-center gap-3"
                        role="group"
                        aria-label={`Quantity for ${item.name}`}
                      >
                        <button
                          onClick={() => changeQty(item.id, item.size, -1)}
                          disabled={item.qty <= 1}
                          aria-label="Decrease quantity"
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-[#E99A9F] bg-white text-[#332B2B] disabled:cursor-not-allowed disabled:border-[#d9cfd2] disabled:text-[#b3a9ab] ${focusRing}`}
                        >
                          <Minus size={16} strokeWidth={1.8} />
                        </button>
                        <span className="min-w-[1.5rem] text-center text-[15px] font-medium text-[#332B2B]">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => changeQty(item.id, item.size, 1)}
                          disabled={item.qty >= avail || isOutOfStock}
                          aria-label="Increase quantity"
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-[#E99A9F] bg-white text-[#332B2B] disabled:cursor-not-allowed disabled:border-[#d9cfd2] disabled:text-[#b3a9ab] ${focusRing}`}
                        >
                          <Plus size={16} strokeWidth={1.8} />
                        </button>
                      </div>

                      <button
                        onClick={() => moveToWishlist(item)}
                        className={`inline-flex items-center gap-1.5 rounded text-[13px] text-[#B20947] underline-offset-4 hover:underline ${focusRing}`}
                      >
                        <Heart size={15} strokeWidth={1.7} />
                        Move to wishlist
                      </button>
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>

            {/* Helpful shipping & trust card */}
            <div className={`${cardCream} grid gap-4 p-4 sm:grid-cols-2 sm:p-5`}>
              <div className="flex items-start gap-3">
                <Truck size={20} className="mt-0.5 shrink-0 text-[#B20947]" />
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#332B2B]">
                    Pan-India Delivery
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#6f6565]">
                    Check your PIN code &amp; apply coupon codes cleanly on the next step.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#B20947]" />
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#332B2B]">
                    Guest Checkout Available
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#6f6565]">
                    Complete your order as a guest, or sign in with your mobile OTP.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order summary with flower badge on the top edge */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className={`${card} relative px-5 pb-6 pt-9 sm:px-6`}>
              <FlowerBadge />
              <h2
                className={`${serif} text-center text-[26px] font-medium text-[#332B2B]`}
              >
                Order Summary
              </h2>
              <span className="mx-auto mt-2 block h-[2px] w-14 bg-[#E8B8C5]" />

              <dl className="mt-6 space-y-3 text-[15px]">
                <div className="flex justify-between">
                  <dt className="text-[#6f6565]">
                    Subtotal ({count} {count === 1 ? "item" : "items"})
                  </dt>
                  <dd className="font-medium text-[#332B2B]">
                    {inr(subtotal)}
                  </dd>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-[#6f6565]">Product Savings</dt>
                    <dd className="font-medium text-[#5f7a62]">
                      {inr(savings)}
                    </dd>
                  </div>
                )}
                {comboDiscount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-[#6f6565]">{offers.comboTitle || "Combo Savings"}</dt>
                    <dd className="font-medium text-[#5f7a62]">
                      −{inr(comboDiscount)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-[#6f6565]">Shipping &amp; Coupons</dt>
                  <dd className="text-[#6f6565]">Calculated at checkout</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-[#E8CFD2] pt-4">
                  <dt
                    className={`${serif} text-[22px] font-semibold text-[#332B2B]`}
                  >
                    Estimated Total
                  </dt>
                  <dd
                    className={`${serif} text-[26px] font-semibold text-[#B20947]`}
                  >
                    {inr(Math.max(0, subtotal - comboDiscount))}
                  </dd>
                </div>
              </dl>

              {hasStockIssues ? (
                <div className="mt-6 space-y-2">
                  <button
                    type="button"
                    disabled
                    className={`${solidBtn} w-full opacity-60 cursor-not-allowed !bg-[#9E9090] !border-[#9E9090]`}
                  >
                    Update Quantities to Checkout
                  </button>
                  <p className="text-center text-[12px] font-medium text-[#B20947]">
                    Please update items with stock warnings to proceed.
                  </p>
                </div>
              ) : (
                <Link href="/checkout" className={`${solidBtn} mt-6 w-full`}>
                  Proceed to Checkout
                </Link>
              )}
              <Link href="/shop" className={`${outlineBtn} mt-3 w-full`}>
                Continue Shopping
              </Link>
              <Link href="/wishlist" className={`${outlineBtn} mt-2.5 w-full`}>
                View Wishlist
              </Link>

              <p className="mt-5 text-center text-[13px] text-[#6f6565]">
                Not sure about a size?{" "}
                <a
                  href={`https://wa.me/919995757612?text=${encodeURIComponent(
                    "Hi IZHA BLOOMS! I'm interested in your collection. Could you please assist me?"
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 text-[#B20947] underline underline-offset-4 ${focusRing}`}
                >
                  <WhatsAppSvg size={14} />
                  Chat with us on WhatsApp
                </a>
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* Product Recommendations */}
      {recommendations.length > 0 && (
        <section
          aria-labelledby="bag-recs-heading"
          className="mt-16 border-t border-[#E8CFD2] pt-12"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#B5607A]">
                Curated For You
              </p>
              <h2
                id="bag-recs-heading"
                className={`${serif} mt-1 text-[28px] font-medium text-[#332B2B] sm:text-[34px]`}
              >
                You May Also Love
              </h2>
            </div>
            <Link
              href="/collections"
              className="text-[13px] font-medium text-[#B20947] underline underline-offset-4"
            >
              Explore Collections
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {recommendations.map((p) => (
              <CatalogProductCard
                key={p.id}
                p={p}
                liked={isLiked(p.id)}
                onLike={() => toggleWish(p)}
              />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
