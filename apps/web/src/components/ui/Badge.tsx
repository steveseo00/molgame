import { cn } from "@/lib/utils";
import type { Element, Rarity } from "@molgame/shared";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "element" | "rarity";
  element?: Element;
  rarity?: Rarity;
  className?: string;
}

const elementColors: Record<Element, string> = {
  fire: "bg-red-500/20 text-red-400 border-red-500/30",
  water: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  lightning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  nature: "bg-green-500/20 text-green-400 border-green-500/30",
  shadow: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  light: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const rarityColors: Record<Rarity, string> = {
  common: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  rare: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  legendary: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  mythic: "bg-rose-500/20 text-rose-300 border-rose-400/40 animate-pulse",
};

export function Badge({ children, variant = "default", element, rarity, className }: BadgeProps) {
  const colorClass =
    variant === "element" && element
      ? elementColors[element]
      : variant === "rarity" && rarity
        ? rarityColors[rarity]
        : "bg-white/10 text-[var(--color-text-secondary)] border-white/10";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
        colorClass,
        className,
      )}
    >
      {children}
    </span>
  );
}
