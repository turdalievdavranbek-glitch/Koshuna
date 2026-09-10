"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatSom } from "@/lib/data";
import { jpegDataUrl, makeDemoPriceTag, priceFromPhoto, stillFromVideo } from "@/lib/photo-price";
import { displayPhotoForProduct, isGeneratedPriceTag, isStockShopPhoto, looksLikeRenderedPriceTag, photoForProductTitle } from "@/lib/shop-photos";
import { shopErrorText, shopKindLabel } from "@/lib/shop-copy";
import {
  assortmentKey,
  assortmentUseCount,
  canReuseAssortment,
  isOwnShop,
  pickShopForKind,
  PRODUCT_REUSE_MAX,
  publicProduct,
  validPrice,
} from "@/lib/shops";
import { useApp } from "@/lib/store";
import type { Shop, ShopCategory, ShopKind, ShopProduct } from "@/lib/types";
import { IconCamera } from "./icons";
import { Field, Input, Toggle } from "./ui";

export function ShopItemCapture({
  parent,
  kind,
}: {
  parent: ShopCategory;
  kind: ShopKind;
}) {
  const { t, user, shops, ready, upsertShopProduct, setPendingPath } = useApp();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const priceTouched = useRef(false);
  const noPriceRef = useRef(false);
  const [live, setLive] = useState(false);
  const [photo, setPhoto] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [noPrice, setNoPrice] = useState(false);
  const [fromPhoto, setFromPhoto] = useState(false);
  const [ai, setAi] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const shop = pickShopForKind(shops, user, parent, kind);
  noPriceRef.current = noPrice;

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!photo) return;
    const next = photoForProductTitle(title, kind);
    if (!next || next === photo) return;
    if (isStockShopPhoto(photo) || isGeneratedPriceTag(photo)) {
      setPhoto(next);
      return;
    }
    let cancelled = false;
    void looksLikeRenderedPriceTag(photo).then((tag) => {
      if (!cancelled && tag) setPhoto(next);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, photo, title]);

  const startCam = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t.mediaNoCamera);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setLive(true);
    } catch {
      setError(t.mediaNoCamera);
    }
  };

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
  };

  const applyPhoto = async (dataUrl: string) => {
    setError("");
    setAi(t.shopItemAiBusy);
    const compact = await jpegDataUrl(dataUrl, 900);
    const tag =
      isGeneratedPriceTag(dataUrl) ||
      isGeneratedPriceTag(compact) ||
      (await looksLikeRenderedPriceTag(dataUrl)) ||
      (await looksLikeRenderedPriceTag(compact));
    setPhoto(tag ? photoForProductTitle(title, kind) || photoForProductTitle("", kind) || compact : compact);
    try {
      const guess = await priceFromPhoto(dataUrl);
      if (noPriceRef.current) {
        setFromPhoto(false);
        setAi("");
      } else if (guess.price != null && !priceTouched.current) {
        setPrice(String(guess.price));
        setFromPhoto(true);
        setAi(t.shopItemPriceAi);
      } else if (guess.price != null && priceTouched.current) {
        setAi(t.shopItemPriceAi);
      } else {
        setFromPhoto(false);
        setAi(t.shopItemPriceNoAi);
      }
    } catch {
      setFromPhoto(false);
      setAi(t.shopItemPriceNoAi);
    }
  };

  const shot = async () => {
    if (!videoRef.current) return;
    const still = stillFromVideo(videoRef.current);
    if (!still) return;
    stopCam();
    await applyPhoto(still);
  };

  const onFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => void applyPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const demoTag = async () => {
    priceTouched.current = false;
    setError("");
    setAi(t.shopItemAiBusy);
    const itemPhoto = photoForProductTitle(title, kind) || photoForProductTitle("", kind);
    if (itemPhoto) setPhoto(itemPhoto);
    if (!title.trim()) setTitle(shopKindLabel(t, kind));
    try {
      const guess = await priceFromPhoto(makeDemoPriceTag(85));
      if (noPriceRef.current) {
        setFromPhoto(false);
        setAi("");
      } else if (guess.price != null && !priceTouched.current) {
        setPrice(String(guess.price));
        setFromPhoto(true);
        setAi(t.shopItemPriceAi);
      } else if (guess.price != null) {
        setAi(t.shopItemPriceAi);
      } else {
        setFromPhoto(false);
        setAi(t.shopItemPriceNoAi);
      }
    } catch {
      setFromPhoto(false);
      setAi(t.shopItemPriceNoAi);
    }
  };

  const publish = async () => {
    setError("");
    setNote("");
    if (!user) {
      setPendingPath(`/shops/c/${parent}/${kind}`);
      router.push("/login");
      return;
    }
    if (!shop) {
      setPendingPath(`/shops/c/${parent}/${kind}`);
      router.push("/shops/new");
      return;
    }
    if (!photo) {
      setError(t.shopItemNeedPhoto);
      return;
    }
    if (!title.trim()) {
      setError(t.shopNeedName);
      return;
    }
    const n = noPrice || !price.trim() ? undefined : validPrice(price);
    if (!noPrice && price.trim() && n == null) {
      setError(t.shopNeedPrice);
      return;
    }
    const result = await upsertShopProduct(shop.id, {
      title: title.trim(),
      price: n,
      photo,
      category: parent,
      kind,
      priceFromPhoto: fromPhoto,
    });
    if (result.error) {
      setError(shopErrorText(t, result.error));
      return;
    }
    setNote(t.shopItemPublished);
    setPhoto("");
    setTitle("");
    setPrice("");
    setNoPrice(false);
    setFromPhoto(false);
    setAi("");
    priceTouched.current = false;
  };

  const reuse = async (item: ShopProduct) => {
    if (!shop) return;
    const result = await upsertShopProduct(shop.id, {
      title: item.title,
      price: item.price,
      photo: item.photo,
      category: item.category,
      kind: item.kind,
      unit: item.unit,
      sourceId: assortmentKey(item),
      priceFromPhoto: item.priceFromPhoto,
    });
    if (result.error) setError(shopErrorText(t, result.error));
    else setNote(t.shopItemReused);
  };

  const mine = shop ? shop.products.filter((item) => item.kind === kind) : [];
  const publicItems = shops.flatMap((row) =>
    row.products
      .filter((item) => item.kind === kind && publicProduct(item, row) && !isOwnShop(row, user))
      .map((product) => ({ shop: row, product })),
  );

  return (
    <div className="pb-5">
      <p className="text-[12px] text-muted">
        {t.shopCats[parent]} · {shopKindLabel(t, kind)}
      </p>
      <p className="mt-1 text-[13px] leading-[1.45] text-muted">{t.shopItemHint}</p>

      <div className="mt-3 overflow-hidden rounded-[18px] bg-ink">
        <video ref={videoRef} muted playsInline className={live ? "aspect-[4/5] w-full object-cover" : "hidden"} />
        {!live && photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="aspect-[4/5] w-full bg-[#f4efe6] object-contain" />
        ) : null}
        {!live && !photo ? (
          <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 px-6 text-center">
            <IconCamera size={28} color="#FFF7F0" />
            <div className="text-[14px] font-semibold text-screen">{t.shopItemLive}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {live ? (
          <button type="button" onClick={() => void shot()} className="h-11 rounded-2xl bg-accent text-[13px] font-semibold text-accent-on">
            {t.shopItemShot}
          </button>
        ) : (
          <button type="button" onClick={() => void startCam()} className="h-11 rounded-2xl bg-ink text-[13px] font-semibold text-screen">
            {t.camera}
          </button>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="h-11 rounded-2xl border border-line bg-white text-[13px] font-semibold"
        >
          {t.gallery}
        </button>
      </div>
      <button type="button" onClick={() => void demoTag()} className="mt-2 h-11 w-full rounded-2xl border border-line bg-white text-[13px] font-semibold text-muted">
        {t.shopItemDemoTag}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = "";
        }}
      />

      <div className="mt-4 flex flex-col gap-3">
        <Field label={t.shopItemName}>
          <Input value={title} onChange={setTitle} />
        </Field>
        <Field label={t.shopItemPrice}>
          <Input
            value={noPrice ? "" : price}
            placeholder={noPrice ? t.shopAskPrice : undefined}
            disabled={noPrice}
            onChange={(v) => {
              priceTouched.current = true;
              setNoPrice(false);
              setFromPhoto(false);
              setPrice(v);
            }}
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
              if (next) {
                priceTouched.current = true;
                setPrice("");
                setFromPhoto(false);
                setAi("");
              }
            }}
          />
        </div>
        {ai ? <p className="text-[12px] leading-[1.4] text-muted">{ai}</p> : null}
        <p className="text-[12px] text-muted-2">{t.shopItemReuseRule}</p>
      </div>

      {error ? <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p> : null}
      {note ? <p className="mt-2 text-[13px] font-semibold text-success-ink">{note}</p> : null}

      {!ready ? <p className="mt-3 text-[13px] text-muted">{t.shopLoad}</p> : null}
      {user && !shop ? (
        <button
          type="button"
          onClick={() => {
            setPendingPath(`/shops/c/${parent}/${kind}`);
            router.push("/shops/new");
          }}
          className="mt-4 h-12 w-full rounded-2xl border border-line bg-white text-[14px] font-semibold"
        >
          {t.shopItemNeedShop}
        </button>
      ) : (
        <button type="button" onClick={() => void publish()} className="shadow-btn mt-4 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on">
          {t.shopItemPublish}
        </button>
      )}
      {!user ? (
        <p className="mt-2 text-center text-[12px] text-muted">{t.shopNeedAuth}</p>
      ) : null}

      {mine.length ? (
        <div className="mt-6">
          <div className="font-display text-[16px] font-bold text-ink">{t.shopItemMine}</div>
          <div className="mt-2 flex flex-col gap-2">
            {mine.map((item) => (
              <ItemCard
                key={item.id}
                product={item}
                shop={shop as Shop}
                uses={assortmentUseCount(shop as Shop, assortmentKey(item))}
                canReuse={canReuseAssortment(shop as Shop, assortmentKey(item))}
                onReuse={() => void reuse(item)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {publicItems.length ? (
        <div className="mt-6">
          <div className="font-display text-[16px] font-bold text-ink">{t.shopCatalog}</div>
          <div className="mt-2 flex flex-col gap-2">
            {publicItems.map(({ shop: row, product }) => (
              <button
                key={`${row.id}-${product.id}`}
                type="button"
                onClick={() => router.push(`/shops/${row.id}`)}
                className="flex gap-3 rounded-[16px] border border-line bg-white p-3 text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayPhotoForProduct(product)} alt="" className="h-16 w-16 rounded-[12px] object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ink">{product.title}</span>
                  <span className="mt-0.5 block text-[13px] font-semibold text-accent">
                    {product.price != null ? `${formatSom(product.price)} KGS` : t.shopAskPrice}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-2">{row.name}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ItemCard({
  product,
  uses,
  canReuse,
  onReuse,
}: {
  product: ShopProduct;
  shop: Shop;
  uses: number;
  canReuse: boolean;
  onReuse: () => void;
}) {
  const { t } = useApp();
  return (
    <div className="flex gap-3 rounded-[16px] border border-line bg-white p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={displayPhotoForProduct(product)} alt="" className="h-16 w-16 rounded-[12px] object-cover" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-ink">{product.title}</div>
        <div className="mt-0.5 text-[13px] font-semibold text-accent">
          {product.price != null ? `${formatSom(product.price)} KGS` : t.shopAskPrice}
        </div>
        {product.priceFromPhoto ? <div className="mt-0.5 text-[11px] text-muted">{t.shopItemPriceAiShort}</div> : null}
        <div className="mt-0.5 text-[11px] text-muted-2">{t.shopItemReuseLeft(PRODUCT_REUSE_MAX - uses, PRODUCT_REUSE_MAX)}</div>
        <button
          type="button"
          disabled={!canReuse}
          onClick={onReuse}
          className="mt-2 h-9 rounded-xl border border-line px-3 text-[12px] font-semibold disabled:opacity-40"
        >
          {t.shopItemReuse}
        </button>
      </div>
    </div>
  );
}
