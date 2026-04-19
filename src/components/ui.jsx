import { useEffect, useState } from "react";
import { copyToClipboard } from "../utils.js";

export function Panel({ children }) {
  return (
    <section className="rounded-[28px] border border-stone-300/55 bg-white/70 shadow-[0_22px_60px_rgba(68,43,19,0.12)] backdrop-blur-xl">
      <div className="p-6">{children}</div>
    </section>
  );
}

export function MetaCard({ label, value }) {
  return (
    <div className="rounded-[18px] border border-stone-300/55 bg-white/72 p-4 shadow-[0_22px_60px_rgba(68,43,19,0.12)] backdrop-blur-xl">
      <div className="mb-2 text-xs uppercase tracking-[0.12em] text-stone-500">{label}</div>
      <div className="break-all text-[1.2rem] font-semibold text-stone-900">{value}</div>
    </div>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <div className="grid gap-2">
      <label className="text-[0.95rem] font-semibold text-stone-900">{label}</label>
      {hint ? <div className="text-sm text-stone-500">{hint}</div> : null}
      {children}
      {error ? <ErrorBox>{error}</ErrorBox> : null}
    </div>
  );
}

export function StatusPill({ children, tone }) {
  const toneClass = {
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-rose-700",
    neutral: "text-stone-600",
  }[tone];

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-stone-300/60 bg-white/85 px-4 py-2 text-sm ${toneClass}`}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_0_4px_rgba(0,0,0,0.06)]" />
      {children}
    </div>
  );
}

export function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-transparent bg-gradient-to-br from-orange-500 to-orange-700 text-orange-50 shadow-[0_14px_28px_rgba(182,63,24,0.18)]"
          : "border-stone-300/70 bg-white/84 text-stone-700 hover:-translate-y-0.5 hover:border-orange-300",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function TabEmptyState({ children }) {
  return (
    <div className="rounded-[22px] border border-dashed border-stone-300/70 bg-white/45 px-6 py-8 text-center text-stone-600">
      {children}
    </div>
  );
}

export function StatusCard({ title, children }) {
  return (
    <section className="rounded-[22px] border border-stone-300/55 bg-white/78 p-5">
      <h3 className="text-[1.02rem] font-semibold text-stone-900">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ResultCard({ title, description, action, children }) {
  return (
    <section className="rounded-[22px] border border-stone-300/55 bg-white/78 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[1.02rem] font-semibold text-stone-900">{title}</h3>
          {description ? <p className="mt-1 text-sm text-stone-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MetricGrid({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-stone-300/55 bg-white/85 p-4">
          <div className="mb-1.5 text-xs uppercase tracking-[0.12em] text-stone-500">{label}</div>
          <div className="break-words font-semibold text-stone-900">{value}</div>
        </div>
      ))}
    </div>
  );
}

export function CopyButton({
  text,
  children,
  copiedLabel = "Copied",
  onError,
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setCopied(false);
    }, 1800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copied]);

  function handleCopy() {
    copyToClipboard(text)
      .then(() => {
        setCopied(true);
      })
      .catch(() => {
        onError?.("Copy failed. Browser clipboard permissions may be blocked for this page.");
      });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-full border border-stone-300/70 bg-white/85 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:-translate-y-0.5"
    >
      {copied ? copiedLabel : children}
    </button>
  );
}

export function InfoBox({ children }) {
  return (
    <div className="rounded-[18px] border border-orange-300/35 bg-orange-500/8 px-4 py-3 leading-6 text-stone-600">
      {children}
    </div>
  );
}

export function ErrorBox({ children, className = "" }) {
  return (
    <div
      className={`rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 leading-6 text-rose-900 ${className}`}
    >
      {children}
    </div>
  );
}

export const inputClassName =
  "min-w-0 w-full rounded-2xl border border-stone-300/70 bg-white/80 px-4 py-3.5 text-stone-900 outline-none transition duration-150 placeholder:text-stone-400 focus:-translate-y-0.5 focus:border-orange-400 focus:ring-4 focus:ring-orange-200/70";

export const dateTimeInputClassName = `${inputClassName} pr-12 text-[0.96rem]`;
