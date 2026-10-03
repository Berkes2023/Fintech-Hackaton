// Monochrome line icons at a 1.75px stroke, per the style reference.
const PATHS: Record<string, string> = {
  loan: "M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18M12 3l9 5H3z",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  overdraft: "M4 12h16M12 4v16M7 17l-3-3 3-3M17 7l3 3-3 3",
  bnpl: "M4 7h16v12H4zM8 3v4m8-4v4M8 13h2m3 0h2m-7 3h2",
  subscription: "M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4",
  household: "M4 11l8-7 8 7M6 9v11h12V9M10 20v-6h4v6",
  chart: "M4 20V4M4 20h16M8 16l4-5 3 3 5-7",
  compare: "M8 4v16M16 4v16M4 8h8M12 16h8",
  doc: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6m-6 4h6",
  wallet: "M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4zM4 7l11-3v3M16 13h1",
  book: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01",
  calc: "M6 3h12v18H6zM9 7h6M9 11h.01M12 11h.01M15 11h.01M9 14h.01M12 14h.01M15 14h.01M9 17h.01M12 17h.01M15 17h.01",
  arrow: "M5 12h14M13 6l6 6-6 6",
  chevron: "M6 9l6 6 6-6",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6",
};

export function Icon({ name, size = 20, stroke = 1.75 }: { name: keyof typeof PATHS | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.spark} />
    </svg>
  );
}
