"use client";

import { useState } from "react";
import { formatSom } from "@/lib/data";
import { parentOfShopKind, shopKindsOf, SHOP_STOCK, SHOP_UNITS, validPrice, validQuantity } from "@/lib/shops";
import { shopErrorText, shopKindLabel, shopQtyLabel } from "@/lib/shop-copy";
import { useApp } from "@/lib/store";
import type { Shop, ShopKind, ShopProduct, ShopStock, ShopProductUnit } from "@/lib/types";
import { Chip, Field, Input, Toggle } from "./ui";

export function ShopProductsEditor({ shop }: { shop: Shop }) {
  const { t, upsertShopProduct, updateShopProduct, hideShopProduct } = useApp();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [noPrice, setNoPrice] = useState(false);
  const [kind, setKind] = useState<ShopKind | undefined>(shop.kinds?.[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const kids = shopKindsOf(shop.category, ...shop.extraCategories);

  const add = async () => {
    setError("");
    if (!title.trim()) {
      setError(t.shopNeedName);
      return;
    }
    const n = noPrice || !price.trim() ? undefined : validPrice(price);
    if (!noPrice && price.trim() && n == null) {
      setError(t.shopNeedPrice);
      return;
    }
    const quantity = qty.trim() ? validQuantity(qty) : undefined;
    if (qty.trim() && quantity == null) {
      setError(t.shopNeedQuantity);
      return;
    }
    const result = await upsertShopProduct(shop.id, {
      title: title.trim(),
      price: n,
      quantity,
      category: parentOfShopKind(kind) ?? shop.category,
      kind,
    });
    if (result.error) {
      setError(shopErrorText(t, result.error));
      return;
    }
    setTitle("");
    setPrice("");
    setQty("");
    setNoPrice(false);
    setNote(t.shopProductSave);
  };

  return (
    <div>
      <div className="font-display text-[17px] font-bold text-ink">{t.shopProducts}</div>
      <div className="mt-3 flex flex-col gap-2">
        <Field label={t.shopProductName}>
          <Input value={title} onChange={setTitle} />
        </Field>
        <Field label={t.shopProductPrice}>
          <Input
            value={noPrice ? "" : price}
            onChange={(v) => {
              setNoPrice(false);
              setPrice(v);
            }}
            placeholder={t.shopAskPrice}
            disabled={noPrice}
          />
        </Field>
        <div className="flex items-start justify-between gap-3 rounded-[14px] border border-line bg-white px-3.5 py-3">
          <div>
            <div className="text-[15px] font-semibold text-ink">{t.shopNoPrice}</div>
            <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.shopNoPriceHint}</p>
          </div>
          <Toggle
            on={noPrice}
            onChange={() => {
              const next = !noPrice;
              setNoPrice(next);
              if (next) setPrice("");
            }}
          />
        </div>
        <Field label={t.shopProductQuantity}>
          <Input value={qty} onChange={setQty} placeholder={t.shopQuantityPh} />
        </Field>
        <p className="-mt-1 text-[12px] leading-[1.4] text-muted">{t.shopQuantityHint}</p>
        {kids.length ? (
          <div>
            <div className="text-[12px] font-semibold text-muted">{t.shopProductKind}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {kids.map((id) => (
                <Chip key={id} active={kind === id} onClick={() => setKind(kind === id ? undefined : id)}>
                  {t.shopKinds[id]}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
        <button type="button" onClick={() => void add()} className="h-11 rounded-2xl bg-ink text-[14px] font-semibold text-screen">
          {t.shopAddProduct}
        </button>
      </div>
      {error ? <p className="mt-2 text-[13px] text-accent">{error}</p> : null}
      {note ? <p className="mt-2 text-[13px] font-semibold text-success-ink">{note}</p> : null}
      <div className="mt-4 flex flex-col gap-2">
        {shop.products.map((item) => (
          <ProductRow
            key={item.id}
            shop={shop}
            product={item}
            onPrice={(next) => void updateShopProduct(shop.id, item.id, { price: next })}
            onQty={(quantity) => void updateShopProduct(shop.id, item.id, { quantity })}
            onStock={(stock) => void updateShopProduct(shop.id, item.id, { stock })}
            onUnit={(unit) => void updateShopProduct(shop.id, item.id, { unit })}
            onKind={(next) => void updateShopProduct(shop.id, item.id, { kind: next, category: parentOfShopKind(next) ?? shop.category })}
            onHide={() => hideShopProduct(shop.id, item.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ProductRow({
  shop,
  product,
  onPrice,
  onQty,
  onStock,
  onUnit,
  onKind,
  onHide,
}: {
  shop: Shop;
  product: ShopProduct;
  onPrice: (n?: number) => void;
  onQty: (n?: number) => void;
  onStock: (s: ShopStock) => void;
  onUnit: (u: ShopProductUnit) => void;
  onKind: (k?: ShopKind) => void;
  onHide: () => void;
}) {
  const { t } = useApp();
  const [raw, setRaw] = useState(product.price != null ? String(product.price) : "");
  const [qty, setQty] = useState(product.quantity != null ? String(product.quantity) : "");
  const kids = shopKindsOf(shop.category, ...shop.extraCategories);
  const qtyLine = shopQtyLabel(t, product);
  return (
    <div className="rounded-[16px] border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[14px] font-semibold text-ink">{product.title}</div>
          <div className="mt-0.5 text-[11px] text-muted-2">
            {product.kind ? `${shopKindLabel(t, product.kind)} · ` : ""}
            {qtyLine ? `${qtyLine} · ` : ""}
            {t.shopStockStale} · {product.updatedAt.slice(0, 10)}
          </div>
        </div>
        {product.published === false ? <span className="text-[11px] font-bold text-muted">{t.status.withdrawn}</span> : null}
      </div>
      <div className="mt-2">
        <Input
          value={raw}
          onChange={(v) => {
            setRaw(v);
            if (!v.trim()) onPrice(undefined);
            else {
              const n = validPrice(v);
              if (n != null) onPrice(n);
            }
          }}
          placeholder={t.shopAskPrice}
        />
        <div className="mt-2">
          <Chip
            active={product.price == null}
            onClick={() => {
              setRaw("");
              onPrice(undefined);
            }}
          >
            {t.shopNoPrice}
          </Chip>
        </div>
        <div className="mt-1 text-[12px] text-muted">{product.price != null ? `${formatSom(product.price)} KGS` : t.shopAskPrice}</div>
      </div>
      <div className="mt-2">
        <Field label={t.shopProductQuantity}>
          <Input
            value={qty}
            placeholder={t.shopQuantityPh}
            onChange={(v) => {
              setQty(v);
              if (!v.trim()) onQty(undefined);
              else {
                const n = validQuantity(v);
                if (n != null) onQty(n);
              }
            }}
          />
        </Field>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SHOP_UNITS.map((id) => (
          <Chip key={id} active={product.unit === id} onClick={() => onUnit(id)}>
            {t.shopUnits[id]}
          </Chip>
        ))}
      </div>
      {kids.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {kids.map((id) => (
            <Chip key={id} active={product.kind === id} onClick={() => onKind(product.kind === id ? undefined : id)}>
              {t.shopKinds[id]}
            </Chip>
          ))}
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SHOP_STOCK.map((id) => (
          <Chip key={id} active={product.stock === id} onClick={() => onStock(id)}>
            {id === "in" ? t.shopStockIn : id === "out" ? t.shopStockOut : id === "order" ? t.shopStockOrder : t.shopStockAsk}
          </Chip>
        ))}
      </div>
      <div className="mt-2">
        <button type="button" onClick={onHide} className="h-10 w-full rounded-2xl border border-line text-[12px] font-semibold text-muted">
          {t.shopWithdraw}
        </button>
      </div>
    </div>
  );
}
