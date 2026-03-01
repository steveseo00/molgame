import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ELEMENT_ICONS } from "@molgame/shared";
import type { Card } from "@molgame/shared";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let card: Card | null = null;
  try {
    card = await api.getCard(id);
  } catch {
    // API not connected
  }

  if (!card) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold mb-2">Card Not Found</h2>
      </div>
    );
  }

  const winRate = card.battle_count > 0
    ? ((card.win_count / card.battle_count) * 100).toFixed(1)
    : "N/A";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Card image */}
        <div className="flex justify-center">
          <div className="w-64 h-80 rounded-xl overflow-hidden border-2 border-white/20">
            <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Card info */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="element" element={card.element}>
              {ELEMENT_ICONS[card.element]} {card.element}
            </Badge>
            <Badge variant="rarity" rarity={card.rarity}>
              {card.rarity}
            </Badge>
          </div>

          <h1 className="text-3xl font-bold mb-2">{card.name}</h1>
          {card.description && (
            <p className="text-[var(--color-text-secondary)] mb-4">{card.description}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatRow label="HP" value={card.stats.hp} max={300} color="bg-green-500" />
            <StatRow label="ATK" value={card.stats.atk} max={100} color="bg-red-500" />
            <StatRow label="DEF" value={card.stats.def} max={100} color="bg-blue-500" />
            <StatRow label="SPD" value={card.stats.spd} max={10} color="bg-yellow-500" />
          </div>

          {/* Skills */}
          <h3 className="font-bold mb-2">Skills</h3>
          <div className="space-y-2 mb-6">
            {card.skills.map((skill) => (
              <div
                key={skill.skill_id}
                className="p-3 rounded-lg bg-[var(--color-bg-card)] border border-white/10"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{skill.name}</span>
                  <div className="flex gap-2 text-xs text-[var(--color-text-secondary)]">
                    <span>PWR {skill.power}</span>
                    <span>Cost {skill.cost}</span>
                    <span>CD {skill.cooldown}</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">{skill.description}</p>
              </div>
            ))}
          </div>

          {/* Battle stats */}
          <div className="flex gap-6 text-sm text-[var(--color-text-secondary)]">
            <div>Battles: {card.battle_count}</div>
            <div>Wins: {card.win_count}</div>
            <div>Win Rate: {winRate}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--color-text-secondary)]">{label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <ProgressBar value={value} max={max} color={color} />
    </div>
  );
}
