"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Card, Element } from "@molgame/shared";
import { ELEMENT_ICONS } from "@molgame/shared";

interface CardFrameProps {
  card: Card;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

const rarityBorders: Record<string, string> = {
  common: "border-gray-500/40",
  rare: "border-blue-500/60 glow-rare",
  epic: "border-purple-500/60 glow-epic",
  legendary: "border-amber-400/60 glow-legendary",
  mythic: "border-rose-400/80 glow-mythic animate-pulse",
};

const elementGradients: Record<Element, string> = {
  fire: "from-red-900/40 to-orange-900/20",
  water: "from-blue-900/40 to-cyan-900/20",
  lightning: "from-yellow-900/40 to-amber-900/20",
  nature: "from-green-900/40 to-emerald-900/20",
  shadow: "from-purple-900/40 to-violet-900/20",
  light: "from-amber-900/40 to-yellow-900/20",
};

export function CardFrame({ card, size = "md", onClick, className }: CardFrameProps) {
  const sizeClasses = {
    sm: "w-32 h-44",
    md: "w-52 h-72",
    lg: "w-72 h-96",
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 overflow-hidden bg-[var(--color-bg-card)] transition-transform hover:scale-105",
        rarityBorders[card.rarity],
        sizeClasses[size],
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {/* Background gradient */}
      <div className={cn("absolute inset-0 bg-gradient-to-b", elementGradients[card.element])} />

      {/* Card art area */}
      <div className="relative h-[55%] overflow-hidden">
        <img
          src={card.image_url}
          alt={card.name}
          className="w-full h-full object-cover"
        />
        {/* Element badge */}
        <div className="absolute top-1 right-1">
          <Badge variant="element" element={card.element}>
            {ELEMENT_ICONS[card.element]} {card.element}
          </Badge>
        </div>
      </div>

      {/* Card info */}
      <div className="relative p-2 flex flex-col gap-1">
        {/* Name and rarity */}
        <div className="flex items-center justify-between">
          <h3 className={cn(
            "font-bold truncate",
            size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base",
          )}>
            {card.name}
          </h3>
          <Badge variant="rarity" rarity={card.rarity} className="text-[10px] shrink-0">
            {card.rarity}
          </Badge>
        </div>

        {/* Stats */}
        <div className={cn(
          "grid grid-cols-4 gap-1 text-center",
          size === "sm" ? "text-[10px]" : "text-xs",
        )}>
          <StatBlock label="HP" value={card.stats.hp} color="text-green-400" />
          <StatBlock label="ATK" value={card.stats.atk} color="text-red-400" />
          <StatBlock label="DEF" value={card.stats.def} color="text-blue-400" />
          <StatBlock label="SPD" value={card.stats.spd} color="text-yellow-400" />
        </div>

        {/* Skills (only on md/lg) */}
        {size !== "sm" && card.skills.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {card.skills.slice(0, 2).map((skill) => (
              <div key={skill.skill_id} className="text-[10px] text-[var(--color-text-secondary)] truncate">
                {skill.name} ({skill.type}) - PWR {skill.power}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[var(--color-text-secondary)] text-[9px]">{label}</span>
      <span className={cn("font-bold", color)}>{value}</span>
    </div>
  );
}
