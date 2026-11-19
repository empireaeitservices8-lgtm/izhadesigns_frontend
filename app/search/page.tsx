"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import CollectionCatalog from "@/components/CollectionCatalog";
import { PRODUCTS, type Product } from "@/lib/products";
import { PageShell, serif } from "@/components/izha/ui";

function SearchCatalogContent() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();

  const filteredProducts = useMemo(() => {
    if (!q) return PRODUCTS;
    const term = q.toLowerCase();
    return PRODUCTS.filter((p: Product) => {
      return (
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.fabric.toLowerCase().includes(term) ||
        p.craft.toLowerCase().includes(term)
      );
    });
  }, [q]);

  const title = q ? `Search: "${q}"` : "Search";
  const subtitle = q
    ? `Results matching "${q}"`
    : "Explore our full collection";

  return (
    <CollectionCatalog
      title={title}
      subtitle={subtitle}
      products={filteredProducts}
      showCategoryFilter
    />
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="py-20 text-center">
            <h1 className={`${serif} text-[32px] font-medium text-[#332B2B]`}>
              Searching...
            </h1>
          </div>
        </PageShell>
      }
    >
      <SearchCatalogContent />
    </Suspense>
  );
}

