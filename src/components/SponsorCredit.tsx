// 2026-09-28 21:35, "Brought to you by Official Priorities" sponsor credit. Logo cut from the
// supplied artwork into black (light backgrounds) and white (dark backgrounds) transparent PNGs.
import Image from "next/image";

export function SponsorCredit({
  tone = "light",
  size = "md",
  className = "",
}: {
  /** light = on a light background (black logo), dark = on a dark background (white logo) */
  tone?: "light" | "dark";
  size?: "sm" | "md";
  className?: string;
}) {
  const h = size === "sm" ? 28 : 40;
  return (
    <div
      className={`inline-flex items-center gap-3 ${tone === "dark" ? "text-paper/55" : "text-ink-soft/70"} ${className}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Brought to you by</span>
      <Image
        src={tone === "dark" ? "/logos/official-priorities-white.png" : "/logos/official-priorities-black.png"}
        alt="Official Priorities"
        width={Math.round(h * (640 / 280))}
        height={h}
        style={{ height: h, width: "auto" }}
        className={tone === "dark" ? "opacity-90" : "opacity-85"}
      />
    </div>
  );
}
