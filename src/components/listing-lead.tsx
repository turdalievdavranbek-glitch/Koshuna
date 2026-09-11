"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { Field, Input } from "@/components/ui";

export function ListingLeadForm({ listing }: { listing: Listing }) {
  const { t, user, submitLead } = useApp();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [note, setNote] = useState("");

  const send = () => {
    const res = submitLead({
      source: "listing",
      listingId: listing.id,
      realtorPhone: listing.sellerType === "realtor" ? listing.sellerPhone : undefined,
      dealerId: listing.dealerId,
      name,
      phone,
      message,
      honeypot,
    });
    setNote(res.ok ? t.leadSent : res.error === "rate" ? t.leadRate : t.leadNeedPhone);
  };

  return (
    <div className="mt-4 rounded-[18px] border border-line bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.leaveLead}</div>
      <div className="mt-3">
        <Field label={t.yourName}>
          <Input value={name} onChange={setName} />
        </Field>
      </div>
      <div className="mt-2">
        <Field label={t.phone}>
          <Input value={phone} onChange={setPhone} placeholder="+996" />
        </Field>
      </div>
      <label className="hidden">
        website
        <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </label>
      <div className="mt-2">
        <Field label={t.description}>
          <Input value={message} onChange={setMessage} />
        </Field>
      </div>
      {note ? <p className="mt-2 text-[13px] text-success">{note}</p> : null}
      <button type="button" onClick={send} className="shadow-btn mt-3 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on">
        {t.askPrice}
      </button>
    </div>
  );
}
