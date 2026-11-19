"use client";

import CollectionCatalog from "@/components/CollectionCatalog";
import { COLLECTION_META } from "@/lib/products";

export default function KurtasCollectionPage() {
  const meta = COLLECTION_META.kurtas;

  return (
    <CollectionCatalog
      title={meta.title}
      subtitle={meta.subtitle}
      products={[]}
    />
  );
}

