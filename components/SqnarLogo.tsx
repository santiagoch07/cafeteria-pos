type Props = { size?: "sm" | "md" | "lg" };

export default function SqnarLogo({ size = "md" }: Props) {
  const dims = {
    sm: { icon: 14, text: "text-base", gap: "gap-1.5" },
    md: { icon: 18, text: "text-xl",   gap: "gap-2"   },
    lg: { icon: 28, text: "text-3xl",  gap: "gap-3"   },
  }[size];

  return (
    <div className={`flex items-center ${dims.gap}`}>
      <svg
        width={dims.icon}
        height={dims.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFD944"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="2.5" fill="#FFD944" />
        <path d="M 12 6 A 6 6 0 0 1 17.2 9" opacity="0.7" />
        <path d="M 12 2 A 10 10 0 0 1 20.7 7" opacity="0.4" />
      </svg>
      <span className={`${dims.text} font-semibold text-text-strong tracking-tight`}>
        SQNAR
      </span>
    </div>
  );
}
