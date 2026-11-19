import { cn } from "@/lib/utils"

/** Ikon aplikasi FDP-CMS: batang naik (performa) dengan garis tren menanjak (karier). Sama dengan public/favicon.svg. */
export function AppLogo({ className }: { className?: any }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-10 shrink-0 drop-shadow-lg", className)} role="img" aria-label="FDP-CMS">
      <defs>
        <linearGradient id="fdp-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#fdp-logo-bg)" />
      <rect x="13" y="42" width="9" height="11" rx="2.5" fill="#fff" fillOpacity=".55" />
      <rect x="27.5" y="35" width="9" height="18" rx="2.5" fill="#fff" fillOpacity=".8" />
      <rect x="42" y="28" width="9" height="25" rx="2.5" fill="#fff" />
      <path d="M14 31 L27 22 L35 27 L49 13" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M41 12.5 H49.5 V21" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
