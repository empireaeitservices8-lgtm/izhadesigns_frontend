"use client";

import CollectionCatalog from "@/components/CollectionCatalog";
import { COLLECTION_META } from "@/lib/products";

export default function MaternityWearCollectionPage() {
  const meta = COLLECTION_META["maternity-wear"];

  return (
    <CollectionCatalog
      title={meta.title}
      subtitle={meta.subtitle}
      products={[]}
    />
  );
}

