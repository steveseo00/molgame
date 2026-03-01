"use client";

import { CardFrame } from "./CardFrame";
import type { Card } from "@molgame/shared";

interface CardGridProps {
  cards: Card[];
  onCardClick?: (card: Card) => void;
}

export function CardGrid({ cards, onCardClick }: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-text-secondary)]">
        No cards found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <CardFrame
          key={card.id}
          card={card}
          size="md"
          onClick={() => onCardClick?.(card)}
        />
      ))}
    </div>
  );
}
