// Small stroked icon set for the app shell and dashboard. Inline SVG so there
// is no external dependency and they inherit currentColor.
type P = { className?: string };
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const HomeIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
);
export const UtensilsIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4 3v7a2 2 0 0 0 4 0V3M6 10v11M18 3c-1.7 0-3 2-3 5s1.3 4 3 4v9" /></svg>
);
export const SparkleIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 3l1.8 4.9L18.7 9.7 13.8 11.5 12 16.4 10.2 11.5 5.3 9.7l4.9-1.8Z" /><path d="M19 15l.7 1.9 1.9.7-1.9.7L19 21l-.7-1.7-1.9-.7 1.9-.7Z" /></svg>
);
export const AppleIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 7c-1.5-2-4.5-2.5-6 0-1.4 2.4-.4 6.5 1.6 8.9C8.6 17.2 10 18 12 18s3.4-.8 4.4-2.1c2-2.4 3-6.5 1.6-8.9-1.5-2.5-4.5-2-6 0Z" /><path d="M12 7c0-1.5.5-3 2-4" /></svg>
);
export const DropIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 3c3 4 6 7 6 10.5A6 6 0 0 1 6 13.5C6 10 9 7 12 3Z" /></svg>
);
export const ScaleIcon = ({ className }: P) => (
  <svg {...base} className={className}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 8h6M12 8v3" /></svg>
);
export const ChartIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4 4v16h16" /><path d="M8 15v-3M12 15V8M16 15v-6" /></svg>
);
export const TargetIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.6" fill="currentColor" /></svg>
);
export const UserIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const GearIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>
);
export const LeafIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4 20C4 10 12 4 20 4c0 8-6 16-16 16Z" /><path d="M4 20c4-6 8-9 12-11" /></svg>
);
export const FlameIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 3c1 3-1 4-1 6 0 1 1 2 1 2s1-1 1-2c2 1 3 3 3 5a4 4 0 0 1-8 0c0-3 2-5 4-11Z" /></svg>
);
export const BellIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
);
export const SearchIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const PlusIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
export const ScanIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M8 12h8" /></svg>
);
export const ChatIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4 5h16v11H9l-4 3V5Z" /></svg>
);
export const ArrowRightIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
