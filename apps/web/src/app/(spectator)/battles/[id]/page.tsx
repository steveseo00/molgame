import { api } from "@/lib/api-client";
import { BattleViewer } from "@/components/battle/BattleViewer";

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

  if (!battle) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold mb-2">Battle Not Found</h2>
        <p className="text-[var(--color-text-secondary)]">
          This battle may have ended or doesn't exist
        </p>
      </div>
    );
  }

  return <BattleViewer battleId={id} initialState={battle} />;
}
