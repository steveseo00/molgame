"use client";

import { useState } from "react";
import { CardGrid } from "@/components/card/CardGrid";
import { Badge } from "@/components/ui/Badge";
import type { Card, Element, Rarity } from "@molgame/shared";
import { ELEMENTS, ELEMENT_ICONS, RARITY_ORDER } from "@molgame/shared";

interface GalleryClientProps {
  initialCards: Card[];
  total: number;
}

export function GalleryClient({ initialCards, total }: GalleryClientProps) {
  const [cards] = useState(initialCards);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<Rarity | null>(null);

  const filtered = cards.filter((card) => {
    if (selectedElement && card.element !== selectedElement) return false;
    if (selectedRarity && card.rarity !== selectedRarity) return false;
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-sm text-[var(--color-text-secondary)] self-center mr-2">Element:</span>
        <FilterButton active={!selectedElement} onClick={() => setSelectedElement(null)}>
          All
        </FilterButton>
        {ELEMENTS.map((el) => (
          <FilterButton
            key={el}
            active={selectedElement === el}
            onClick={() => setSelectedElement(selectedElement === el ? null : el)}
          >
            {ELEMENT_ICONS[el]} {el}
          </FilterButton>
        ))}

        <span className="text-sm text-[var(--color-text-secondary)] self-center ml-4 mr-2">Rarity:</span>
        <FilterButton active={!selectedRarity} onClick={() => setSelectedRarity(null)}>
          All
        </FilterButton>
        {RARITY_ORDER.map((r) => (
          <FilterButton
            key={r}
            active={selectedRarity === r}
            onClick={() => setSelectedRarity(selectedRarity === r ? null : r)}
          >
            {r}
          </FilterButton>
        ))}
      </div>

      <div className="text-sm text-[var(--color-text-secondary)] mb-4">
        {filtered.length} cards {total > 0 && `of ${total} total`}
      </div>

      <CardGrid cards={filtered} />
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
        active
          ? "bg-[var(--color-accent)] text-white"
          : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-white border border-white/10"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
