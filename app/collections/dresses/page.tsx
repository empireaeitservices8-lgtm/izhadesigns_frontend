"use client";

import CollectionCatalog from "@/components/CollectionCatalog";
import { COLLECTION_META } from "@/lib/products";

export default function DressesCollectionPage() {
  const meta = COLLECTION_META.dresses;

  return (
    <CollectionCatalog
      title={meta.title}
      subtitle={meta.subtitle}
      products={[]}
    />
  );
}

