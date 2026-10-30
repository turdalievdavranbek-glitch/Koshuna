"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { formatSom } from "@/lib/data";
import { listingEditHref } from "@/lib/listing-edit";
import { isAdminUser } from "@/lib/partners";
import { useApp } from "@/lib/store";
import type { Listing, Shop } from "@/lib/types";
import { ScreenBack } from "@/components/back-button";
import { MasterBadge } from "@/components/master-badge";
import { PhoneShell } from "@/components/shell";

type Data = { user: { id: string; name: string; email: string; master: boolean }; shops: Shop[]; listings: Listing[] };

/** Admin view of one account (promoters list → here): every point and listing, with «Править». */
export default function AdminUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, user, adminAdopt, editListingToDraft } = useApp();
  const [data, setData] = useState<Data | null>(null);
  const [missing, setMissing] = useState(false);
  const admin = isAdminUser(user);

  useEffect(() => {
    if (!admin) return;
    void api<Data>(`/api/admin/users/${encodeURIComponent(id)}/items`).then((res) => {
      if (!res.ok || !res.data) {
        setMissing(true);
        return;
      }
      setData(res.data);
      adminAdopt({ shops: res.data.shops, listings: res.data.listings });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, id]);

  if (!admin) {
    return (
      <PhoneShell>
        <div className="p-6">
          <ScreenBack fallback="/profile" />
          <p className="mt-4 text-muted">{t.empty}</p>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-1">
        <ScreenBack fallback="/profile" />
        {missing ? <p className="mt-4 text-muted">{t.empty}</p> : null}
        {data ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="font-display text-[22px] font-bold text-ink">{data.user.name || data.user.email}</span>
              <MasterBadge userId={data.user.id} on={data.user.master || undefined} />
            </div>
            <div className="text-[13px] text-muted">{data.user.email}</div>
            <div className="mt-1 text-[12px] text-muted">{t.promoAdminView}</div>
            <button type="button" onClick={() => router.push(`/owner/${data.user.id}`)} className="mt-2 text-[13px] font-semibold text-accent">
              {t.ownerProfile}
            </button>

            <h2 className="mt-5 font-display text-[18px] font-bold text-ink">{t.promoPoints}</h2>
            {data.shops.length === 0 ? <div className="mt-1 text-[13px] text-muted">{t.promoNothing}</div> : null}
            <div className="mt-2 flex flex-col gap-2">
              {data.shops.map((shop) => (
                <div key={shop.id} className="flex items-center gap-3 rounded-[14px] border border-line bg-white px-3.5 py-3">
                  <button type="button" onClick={() => router.push(`/shops/${shop.id}`)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-[15px] font-semibold text-ink">{shop.name || shop.id}</div>
                    <div className="text-[12px] text-muted">
                      {t.shopCats[shop.category] ?? shop.category} · {shop.products.length} · {shop.status}
                    </div>
                  </button>
                  <button type="button" onClick={() => router.push(`/shops/${shop.id}/edit`)} className="h-9 shrink-0 rounded-xl border border-line px-3 text-[13px] font-semibold">
                    {t.promoEdit}
                  </button>
                </div>
              ))}
            </div>

            <h2 className="mt-5 font-display text-[18px] font-bold text-ink">{t.promoListings}</h2>
            {data.listings.length === 0 ? <div className="mt-1 text-[13px] text-muted">{t.promoNothing}</div> : null}
            <div className="mt-2 flex flex-col gap-2">
              {data.listings.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-[14px] border border-line bg-white px-3.5 py-3">
                  <button type="button" onClick={() => router.push(`/listing/${item.id}`)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-[15px] font-semibold text-ink">{item.title}</div>
                    <div className="text-[12px] text-muted">
                      {item.price ? `${formatSom(item.price)} сом · ` : ""}
                      {item.status}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editListingToDraft(item);
                      router.push(listingEditHref(item));
                    }}
                    className="h-9 shrink-0 rounded-xl border border-line px-3 text-[13px] font-semibold"
                  >
                    {t.promoEdit}
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </PhoneShell>
  );
}
