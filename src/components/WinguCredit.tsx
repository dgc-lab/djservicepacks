// 2026-09-28 12:20, "Built by Wingu Digital" footer credit linking to wingudigital.com.
// 2026-09-28 12:40, uses the brand icon file the user specified (copied from
// CLIENT/wingu/wingu-google-app-logo.png to public/logos/wingu-icon.png).
import Image from "next/image";

export function WinguCredit({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://wingudigital.com"
      target="_blank"
      rel="noopener"
      className={`group inline-flex items-center gap-2 text-xs text-ink-soft/70 transition-colors hover:text-ink ${className}`}
      aria-label="Built by Wingu Digital"
    >
      <span>Built by</span>
      <Image
        src="/logos/wingu-icon.png"
        alt=""
        width={24}
        height={24}
        className="h-6 w-6 transition-transform group-hover:scale-110"
      />
      <span className="font-semibold tracking-wide">Wingu Digital</span>
    </a>
  );
}
