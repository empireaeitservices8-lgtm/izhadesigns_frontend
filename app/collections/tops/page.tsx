"use client";

import CollectionCatalog from "@/components/CollectionCatalog";
import { COLLECTION_META } from "@/lib/products";

export default function TopsCollectionPage() {
  const meta = COLLECTION_META.tops;

  return (
    <CollectionCatalog
      title={meta.title}
      subtitle={meta.subtitle}
      products={[]}
    />
  );
}

