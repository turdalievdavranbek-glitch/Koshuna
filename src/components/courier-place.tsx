"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { DISTRICTS } from "@/lib/data";
import { districtLabel } from "@/lib/geo";
import { useApp } from "@/lib/store";
import { deliveryError } from "./delivery-ui";
import { Chip } from "./ui";

type Mine = { courier?: boolean; city?: string | null; district?: string | null };

/** «Мой город/район» for an approved courier. Saving does not reopen the application. */
export function CourierPlace({ onChange }: { onChange?: (city: string) => void }) {
  const { t, lang } = useApp();
  const [show, setShow] = useState(false);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    void api<Mine>("/api/me/courier").then((res) => {
      if (cancel || !res.ok || !res.data?.courier) return;
      setCity(res.data.city ?? "");
      setDistrict(res.data.district ?? "");
      setShow(true);
    });
    return () => {
      cancel = true;
    };
  }, []);

  if (!show) return null;

  const districts = DISTRICTS.filter((row) => row.city === city);
  const save = (nextCity: string, nextDistrict: string) => {
    setCity(nextCity);
    setDistrict(nextDistrict);
    setError("");
    void api("/api/courier/place", { method: "POST", json: { city: nextCity, district: nextDistrict } }).then((res) => {
      if (!res.ok) {
        setError(deliveryError(res.error, t));
        return;
      }
      onChange?.(nextCity);
    });
  };

  return (
    <section className="rounded-[18px] border border-line bg-white px-4 py-3.5">
      <div className="text-[15px] font-extrabold text-ink">{t.deliveryMyPlace}</div>
      <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.deliveryMyPlaceHint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.keys(t.cities)
          .filter((id) => id !== "all")
          .map((id) => (
            <Chip
              key={id}
              active={city === id}
              accent={city === id}
              onClick={() => save(id, DISTRICTS.some((row) => row.id === district && row.city === id) ? district : "")}
            >
              {t.cities[id]}
            </Chip>
          ))}
      </div>
      {city && districts.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={!district} accent={!district} onClick={() => save(city, "")}>
            {t.deliveryWholeCity}
          </Chip>
          {districts.map((row) => (
            <Chip key={row.id} active={district === row.id} accent={district === row.id} onClick={() => save(city, row.id)}>
              {districtLabel(row, lang)}
            </Chip>
          ))}
        </div>
      ) : null}
      {!city ? <p className="mt-2 text-[13px] font-semibold text-accent">{t.deliveryNeedPlace}</p> : null}
      {error ? <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p> : null}
    </section>
  );
}
