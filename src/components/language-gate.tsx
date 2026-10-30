"use client";

import { BrandMark } from "@/components/brand";
import { LANG_LABEL } from "@/lib/i18n";
import { useApp } from "@/lib/store";

export function LanguageGate() {
  const { ready, langChosen, setLang } = useApp();
  if (!ready || langChosen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-screen px-7">
      <BrandMark size={40} wordClass="text-[32px] leading-none text-ink" />
      {/* Hard-coded in both languages: the person has not chosen a UI language yet, so these lines cannot come from the dictionary. */}
      <h1 className="mt-8 text-center font-display text-[26px] font-bold leading-[1.25] text-ink">
        Тилди тандаңыз
        <br />
        Выберите язык
      </h1>
      <button
        type="button"
        onClick={() => setLang("ky")}
        className="shadow-btn mt-8 flex h-14 w-full items-center justify-center rounded-2xl bg-accent text-base font-semibold text-accent-on"
      >
        {LANG_LABEL.ky.full}
      </button>
      <button
        type="button"
        onClick={() => setLang("ru")}
        className="mt-3 flex h-14 w-full items-center justify-center rounded-2xl border border-line bg-white text-base font-semibold text-ink"
      >
        {LANG_LABEL.ru.full}
      </button>
      <p className="mt-5 text-center text-[13px] leading-[1.45] text-muted">
        Тилди кийин Профилден өзгөртсө болот
        <br />
        Язык можно сменить в Профиле
      </p>
    </div>
  );
}
