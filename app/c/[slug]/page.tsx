"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CATEGORIES, childrenOf, trailOf } from "@/lib/catalog";
import { TileGrid } from "@/components/TileGrid";
import { ListingList } from "@/components/ListingList";

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const category = CATEGORIES[slug];
  const kids = childrenOf(slug);
  const trail = trailOf(slug);

  if (!category) {
    return <div className="empty">Раздел не найден.</div>;
  }

  return (
    <div>
      <div className="crumbs">
        <Link href="/">Главная</Link>
        {trail.map((item) => (
          <span key={item.slug}>
            /{" "}
            <Link href={`/c/${item.slug}`}>{item.title}</Link>
          </span>
        ))}
      </div>
      <div className="section-title">
        <h2>
          {category.emoji} {category.title}
        </h2>
        <span className="muted">{kids.length ? "выберите плитку" : "объявления"}</span>
      </div>
      {kids.length > 0 && (
        <>
          <TileGrid tiles={kids} />
          <div className="section-title" style={{ marginTop: 22 }}>
            <h2>В этом разделе</h2>
          </div>
        </>
      )}
      <ListingList slug={slug} />
    </div>
  );
}
