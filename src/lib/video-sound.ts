"use client";

import { useSyncExternalStore } from "react";

/**
 * Full-screen video sound (reels + listing video player). Sound is ON by default.
 * - `pref` is the person's choice, remembered in localStorage (default on).
 * - `blocked` is per session: the browser refused autoplay with sound, so videos play muted
 *   until the first tap on «tap for sound». After that tap sound stays on for the next videos.
 * Home circles never use this: they stay muted previews.
 */
const KEY = "konshu-video-sound";

type State = { pref: boolean; blocked: boolean };

let state: State = { pref: true, blocked: false };
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    state = { ...state, pref: window.localStorage.getItem(KEY) !== "off" };
  } catch {
    /* ignore */
  }
}

function emit(next: State) {
  state = next;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  load();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const SERVER: State = { pref: true, blocked: false };

function snapshot(): State {
  load();
  return state;
}

/** Sound actually wanted right now (pref on and not blocked by the browser). */
export function videoSoundOn(s: State = snapshot()): boolean {
  return s.pref && !s.blocked;
}

/** The browser rejected play() with sound: fall back to muted and show the «tap for sound» hint. */
export function markVideoSoundBlocked() {
  load();
  if (!state.blocked) emit({ ...state, blocked: true });
}

/** A tap (user gesture): set sound on/off and remember it. Turning it on also clears the autoplay block. */
export function setVideoSound(on: boolean) {
  load();
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
  emit({ pref: on, blocked: false });
}

export function useVideoSound(): { sound: boolean; blocked: boolean; toggle: () => void; turnOn: () => void } {
  const s = useSyncExternalStore(subscribe, snapshot, () => SERVER);
  const sound = videoSoundOn(s);
  return {
    sound,
    // «Tap for sound» only when the person wants sound but the browser blocked it.
    blocked: s.pref && s.blocked,
    toggle: () => setVideoSound(!sound),
    turnOn: () => setVideoSound(true),
  };
}

/**
 * Play a full-screen video: unmuted first when sound is wanted; if the browser refuses autoplay with
 * sound, retry muted and mark the session as blocked so the hint shows.
 */
export function playWithSound(el: HTMLVideoElement, sound: boolean): () => void {
  let cancelled = false;
  el.muted = !sound;
  void el.play().catch(() => {
    if (cancelled || el.muted) return;
    el.muted = true;
    markVideoSoundBlocked();
    void el.play().catch(() => undefined);
  });
  return () => {
    cancelled = true;
  };
}
