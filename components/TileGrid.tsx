import Link from "next/link";
import type { Category } from "@/lib/types";

export function TileGrid({ tiles }: { tiles: Category[] }) {
  return (
    <div className="tiles">
      {tiles.map((tile) => (
        <Link
          key={tile.slug}
          href={`/c/${tile.slug}`}
          className="tile"
          style={{ background: tile.tint }}
        >
          <span className="emoji">{tile.emoji}</span>
          <span className="title">{tile.title}</span>
        </Link>
      ))}
    </div>
  );
}
