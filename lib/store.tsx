"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_LISTINGS } from "./catalog";
import type { Listing } from "./types";

export const DEMO_OTP = "123456";

type AuthUser = {
  phone: string;
};

type StoreState = {
  user: AuthUser | null;
  listings: Listing[];
  favorites: string[];
  city: string;
  login: (phone: string, code: string) => { ok: boolean; error?: string };
  logout: () => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  addListing: (draft: Omit<Listing, "id" | "createdAt">) => Listing;
  setCity: (city: string) => void;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      user: null,
      listings: SEED_LISTINGS,
      favorites: [],
      city: "Бишкек",
      login: (phone, code) => {
        const clean = normalizePhone(phone);
        if (clean.replace(/\D/g, "").length < 9) {
          return { ok: false, error: "Введите номер телефона" };
        }
        if (code.trim() !== DEMO_OTP) {
          return { ok: false, error: "Код: 123456" };
        }
        set({ user: { phone: clean } });
        return { ok: true };
      },
      logout: () => set({ user: null }),
      toggleFavorite: (id) => {
        const current = get().favorites;
        set({
          favorites: current.includes(id)
            ? current.filter((item) => item !== id)
            : [...current, id],
        });
      },
      isFavorite: (id) => get().favorites.includes(id),
      addListing: (draft) => {
        const listing: Listing = {
          ...draft,
          id: `user-${Date.now()}`,
          createdAt: Date.now(),
        };
        set({ listings: [listing, ...get().listings] });
        return listing;
      },
      setCity: (city) => set({ city }),
    }),
    {
      name: "koshuna-tiles",
      partialize: (state) => ({
        user: state.user,
        listings: state.listings,
        favorites: state.favorites,
        city: state.city,
      }),
    },
  ),
);
