import { AlbumVersion } from "@/data/albums";

const VERSION_CONFIG: Record<AlbumVersion, { label: string; color: string; bg: string }> = {
  PHOTOBOOK: { label: "PHOTOBOOK", color: "var(--pb)", bg: "var(--pb-bg)" },
  ID_PASS: { label: "ID PASS", color: "var(--id)", bg: "var(--id-bg)" },
  INVENTORY: { label: "INVENTORY", color: "var(--iv)", bg: "var(--iv-bg)" },
  POCAALBUM: { label: "POCAALBUM", color: "var(--pa)", bg: "var(--pa-bg)" },
};

export default function VersionBadge({ version, size = "sm" }: { version: AlbumVersion; size?: "sm" | "md" }) {
  const config = VERSION_CONFIG[version];
  const sizeClass = size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-block rounded-full font-medium ${sizeClass}`}
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      {config.label}
    </span>
  );
}
