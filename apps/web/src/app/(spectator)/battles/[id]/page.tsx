import { api } from "@/lib/api-client";
import { BattleViewer } from "@/components/battle/BattleViewer";
import Link from "next/link";

export default async function BattlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let battle = null;
  try {
    battle = await api.getBattle(id);
  } catch {
    // API not connected
  }

  // For finished battles stored in DB, the shape is different (flat DB row)
  // Normalize: if battle_state exists as a nested object, use it
  if (battle && battle.battle_state && !battle.battle_id) {
    battle = {
      ...battle.battle_state,
      battle_log: battle.battle_log ?? battle.battle_state.battle_log ?? [],
    };
  }

  if (!battle) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold mb-2">Battle Not Found</h2>
        <p className="text-[var(--color-text-secondary)]">
          This battle may have ended or doesn&apos;t exist
        </p>
        <Link href="/battles" className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline">
          Back to Battles
        </Link>
      </div>
    );
  }

  return <BattleViewer battleId={id} initialState={battle} />;
}
