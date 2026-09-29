import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * DJ Service Packs brand lockup: the golden D/J turntable mark + wordmark.
 * The mark already reads "DJ", so the wordmark carries "SERVICE PACKS".
 * `tone="light"` is for dark backgrounds (paper text), `"dark"` for light
 * surfaces (ink text). The gold mark reads on either.
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
      <span
        className={cn(
          "text-[17px] font-black uppercase tracking-tight leading-none",
          tone === "light" ? "text-paper" : "text-ink"
        )}
      >
        Service Packs
      </span>
    </Link>
  );
}