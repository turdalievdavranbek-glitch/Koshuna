import { genericOgCard } from "@/lib/open-graph";
import { shopPageMetadata } from "@/server/page-metadata";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function generic(): Metadata {
  const card = genericOgCard();
  return {
    title: card.title,
    description: card.description,
    openGraph: { title: card.title, description: card.description, images: [card.image], type: "website" },
    twitter: { card: "summary_large_image", images: [card.image] },
  };
}

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  try {
    const { id } = await params;
    return await shopPageMetadata(id);
  } catch {
    return generic();
  }
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
