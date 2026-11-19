"use client";

import CollectionCatalog from "@/components/CollectionCatalog";
import { KEYS, useStored } from "@/lib/izha-store";
import { type AdminProduct } from "@/lib/demo-store";

export default function CollectionsPage() {
  const [adminProducts] = useStored<AdminProduct[]>(
    KEYS.adminProducts,
    []
  );

  return (
    <CollectionCatalog
      title="Collections"
      subtitle="Explore Dresses, Kurtas, Kurta Sets, Tops & Maternity Wear"
      products={adminProducts && adminProducts.length > 0 ? adminProducts : []}
      showCategoryFilter
    />
  );
}

