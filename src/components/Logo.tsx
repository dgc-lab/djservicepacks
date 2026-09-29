import Link from "next/link";
import { cn } from "@/lib/cn";
import { AuroraText } from "@/components/godui/aurora-text";

/**
 * DJ Service Packs brand lockup: the golden D/J turntable mark + wordmark.
 * The mark already reads "DJ", so the wordmark carries "SERVICE PACKS" —
 * 2026-09-29 Round 6: the wordmark runs the aurora gradient everywhere it appears.
 * `tone` is kept for API compatibility.
 */
export function Logo({
  tone = "dark",
  className,
  href = "/",
}: {
  tone?: "light" | "dark";
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/dj-logo.png"
        alt="DJ Service Packs"
        className="h-9 w-auto shrink-0 object-contain"
        width={126}
        height={90}
      />
      {/* 2026-09-29 Round 7: SERVICE stays solid (paper on dark, ink on light),
          PACKS runs the aurora gradient */}
      <span className="text-[17px] font-black uppercase leading-none tracking-tight">
        <span className={tone === "light" ? "text-paper" : "text-ink"}>Service</span>{" "}
        <AuroraText
          colors={["#fcd34d", "#f59e0b", "#fb923c", "#f43f5e"]}
          speed={0.9}
        >
          Packs
        </AuroraText>
      </span>
    </Link>
  );
}