"use client";

import { useEffect, useState } from "react";

/** Wide browser layout. False on the server, on phones, and inside the app. */
export function useDesk(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setOn(mq.matches && !document.documentElement.classList.contains("native"));
    apply();
    mq.addEventListener("change", apply);
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      mq.removeEventListener("change", apply);
      obs.disconnect();
    };
  }, []);
  return on;
}
