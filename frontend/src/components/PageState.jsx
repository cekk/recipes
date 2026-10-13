import { AlertIcon } from "./Icons";

export function Loading({ label = "Caricamento…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-32 text-muted" role="status">
      <div className="w-10 h-10 border-[3px] border-line border-t-ink rounded-full animate-spin" />
      <p className="font-semibold">{label}</p>
    </div>
  );
}

export function Message({ title, children, tone = "neutral" }) {
  return (
    <div className="max-w-lg mx-auto mt-10 text-center flex flex-col items-center gap-3 py-12 px-6 bg-white border-2 border-ink rounded-3xl shadow-hard">
      {tone === "error" && <AlertIcon size={32} className="text-danger" />}
      <p className="font-display text-2xl">{title}</p>
      {children && <div className="text-muted leading-relaxed">{children}</div>}
    </div>
  );
}
