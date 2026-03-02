"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { BattleViewer } from "@/components/battle/BattleViewer";
import Link from "next/link";

function normalizeBattle(data: any) {
  if (data && data.battle_state && !data.battle_id) {
    return {
      ...data.battle_state,
      battle_log: data.battle_log ?? data.battle_state.battle_log ?? [],
    };
  }
  return data;
}

export default function BattlePage() {
  const { id } = useParams<{ id: string }>();
  const [battle, setBattle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/battle/${id}`);
        if (res.ok) {
          const data = await res.json();
          setBattle(normalizeBattle(data));
        }
      } catch {
        // API not connected
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-text-secondary)]">Loading battle...</p>
      </div>
    );
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
