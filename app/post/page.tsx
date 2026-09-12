"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { CATEGORIES, ROOT_TILES, childrenOf } from "@/lib/catalog";
import { useStore } from "@/lib/store";

const CITIES = ["Бишкек", "Ош", "Джалал-Абад", "Каракол", "Нарын", "Талас", "Баткен", "Токмок"];

export default function PostPage() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const addListing = useStore((s) => s.addListing);
  const [root, setRoot] = useState("auto");
  const [child, setChild] = useState("cars");
  const [leaf, setLeaf] = useState("cars-sale");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("Бишкек");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");

  const mid = childrenOf(root);
  const leaves = useMemo(() => childrenOf(child), [child]);
  const category = leaves[0] ? leaf : child;

  function onRoot(next: string) {
    setRoot(next);
    const nextMid = childrenOf(next)[0]?.slug ?? next;
    setChild(nextMid);
    const nextLeaf = childrenOf(nextMid)[0]?.slug ?? nextMid;
    setLeaf(nextLeaf);
  }

  function onChild(next: string) {
    setChild(next);
    setLeaf(childrenOf(next)[0]?.slug ?? next);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push("/login?next=/post");
      return;
    }
    if (!title.trim() || !price.trim()) {
      setError("Название и цена обязательны");
      return;
    }
    const cat = CATEGORIES[category] ?? CATEGORIES[root];
    const path = [root, child, category].filter((item, i, arr) => arr.indexOf(item) === i);
    const listing = addListing({
      title: title.trim(),
      price: price.trim(),
      city,
      category,
      path,
      emoji: cat?.emoji ?? "📌",
      tint: cat?.tint ?? "#EDF1EC",
      desc: desc.trim() || "Без описания",
    });
    router.push(`/listing/${listing.id}`);
  }

  return (
    <div>
      <div className="section-title">
        <h2>Подать объявление</h2>
      </div>
      {!user && <p className="hero-note">Сначала войдите по телефону. Код: 123456.</p>}
      <form onSubmit={onSubmit}>
        {error && <p className="error">{error}</p>}
        <label className="field">
          <span>Раздел</span>
          <select
            value={root}
            onChange={(e) => onRoot(e.target.value)}
          >
            {ROOT_TILES.map((tile) => (
              <option key={tile.slug} value={tile.slug}>
                {tile.emoji} {tile.title}
              </option>
            ))}
          </select>
        </label>
        {mid.length > 0 && (
          <label className="field">
            <span>Подраздел</span>
            <select value={child} onChange={(e) => onChild(e.target.value)}>
              {mid.map((tile) => (
                <option key={tile.slug} value={tile.slug}>
                  {tile.emoji} {tile.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {leaves.length > 0 && (
          <label className="field">
            <span>Ещё уровень</span>
            <select value={leaf} onChange={(e) => setLeaf(e.target.value)}>
              {leaves.map((tile) => (
                <option key={tile.slug} value={tile.slug}>
                  {tile.emoji} {tile.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span>Название</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Toyota Camry 2018" />
        </label>
        <label className="field">
          <span>Цена</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1 450 000 сом" />
        </label>
        <label className="field">
          <span>Город</span>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {CITIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Описание</span>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Расскажите голосом или текстом, что продаёте" />
        </label>
        <button className="primary" type="submit">
          {user ? "Опубликовать" : "Войти и опубликовать"}
        </button>
      </form>
    </div>
  );
}
