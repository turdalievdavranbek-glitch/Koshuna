"use client";

import { forwardRef, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

const MAX_LINES = 6;

/** Fit the field to its text, then scroll inside once it reaches six lines. */
export function growComposer(el: HTMLTextAreaElement | null) {
  if (!el || el.offsetParent === null) return;
  const style = getComputedStyle(el);
  const line = Number.parseFloat(style.lineHeight) || 22;
  const pad = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
  const border = (Number.parseFloat(style.borderTopWidth) || 0) + (Number.parseFloat(style.borderBottomWidth) || 0);
  const max = line * MAX_LINES + pad + border;
  el.style.height = "auto";
  const next = Math.min(Math.max(el.scrollHeight, line + pad + border), max);
  el.style.height = `${next}px`;
  el.style.overflowY = el.scrollHeight > max + 1 ? "auto" : "hidden";
}

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Chat and comment composer. Enter inserts a newline; sending stays on the button. */
export const ComposerField = forwardRef<HTMLTextAreaElement, Props>(function ComposerField({ value, className, ...rest }, forwarded) {
  const inner = useRef<HTMLTextAreaElement>(null);
  const setRefs = (node: HTMLTextAreaElement | null) => {
    inner.current = node;
    if (typeof forwarded === "function") forwarded(node);
    else if (forwarded) forwarded.current = node;
  };
  useLayoutEffect(() => {
    growComposer(inner.current);
  }, [value, className]);
  return (
    <textarea
      {...rest}
      ref={setRefs}
      rows={1}
      value={value}
      enterKeyHint="enter"
      className={`resize-none leading-[22px] ${className ?? ""}`}
    />
  );
});
