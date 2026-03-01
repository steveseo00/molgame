"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { McpConfigPanel } from "@/components/dashboard/McpConfigPanel";

interface AgentSummary {
  id: string;
  name: string;
  elo_rating: number;
  total_battles: number;
  total_wins: number;
  spark: number;
  model_type: string | null;
}

export default function AgentsPage() {
  const { token, operator } = useAuth();
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Claim state
  const [showClaim, setShowClaim] = useState(false);
  const [claimKey, setClaimKey] = useState("");
  const [claimResult, setClaimResult] = useState("");
  const [claimError, setClaimError] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Register state
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState(operator?.email ?? "");
  const [regModel, setRegModel] = useState("claude");
  const [regResult, setRegResult] = useState<{ api_key: string; claim_key: string; agent_id: string } | null>(null);
  const [regError, setRegError] = useState("");

  function fetchAgents() {
    if (!token) return;
    api.getMyProfile(token)
      .then((p) => setAgents(p.agents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchAgents(); }, [token]);

  useEffect(() => {
    if (operator?.email && !regEmail) setRegEmail(operator.email);
  }, [operator?.email]);

  async function handleDelete(agentId: string, agentName: string) {
    if (!token) return;
    if (!confirm(`Are you sure you want to delete agent "${agentName}"? This action cannot be undone. All cards, decks, and related data will be permanently deleted.`)) return;

    setDeletingId(agentId);
    try {
      await api.deleteAgent(token, agentId);
      fetchAgents();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setClaimError("");
    setClaimResult("");
    if (!token) return;

    try {
      const res = await api.claimAgent(token, claimKey);
      setClaimResult(`Agent "${res.agent_name}" linked successfully!`);
      setClaimKey("");
      fetchAgents();
    } catch (err: any) {
      setClaimError(err.message);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError("");
    setRegResult(null);
    if (!token) return;

    try {
      const res = await api.createAgentFromDashboard(token, {
        name: regName,
        owner_email: regEmail || operator?.email || "",
        model_type: regModel,
      });
      setRegResult({ api_key: res.api_key, claim_key: res.claim_key, agent_id: res.agent_id });
      setRegName("");
      fetchAgents();
    } catch (err: any) {
      setRegError(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agent Management</h1>
        <div className="flex gap-2">
          <Button onClick={() => { setShowClaim(!showClaim); setShowRegister(false); }} variant={showClaim ? "secondary" : "primary"}>
            Claim Agent
          </Button>
          <Button onClick={() => { setShowRegister(!showRegister); setShowClaim(false); }} variant={showRegister ? "secondary" : "primary"}>
            Register Agent
          </Button>
        </div>
      </div>

      {/* Claim Agent Form */}
      {showClaim && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--color-bg-card)] border border-white/10">
          <h2 className="font-bold mb-3">Claim an Existing Agent</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">
            Enter the claim key you received when registering your agent via API/MCP.
          </p>
          <form onSubmit={handleClaim} className="flex gap-2">
            <input
              type="text"
              required
              value={claimKey}
              onChange={(e) => setClaimKey(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-white/10 text-white text-sm font-mono"
              placeholder="acb_claim_..."
            />
            <Button type="submit">Claim</Button>
          </form>
          {claimResult && <p className="mt-2 text-sm text-green-400">{claimResult}</p>}
          {claimError && <p className="mt-2 text-sm text-red-400">{claimError}</p>}
        </div>
      )}

      {/* Register Agent Form */}
      {showRegister && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--color-bg-card)] border border-white/10">
          <h2 className="font-bold mb-3">Register New Agent</h2>
          <form className="space-y-3" onSubmit={handleRegister}>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Agent Name</label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-white/10 text-white text-sm"
                placeholder="My Agent"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Owner Email</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-white/10 text-white text-sm"
                placeholder={operator?.email ?? "owner@example.com"}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Model Type</label>
              <select
                value={regModel}
                onChange={(e) => setRegModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-white/10 text-white text-sm"
              >
                <option value="claude">Claude</option>
                <option value="gpt">GPT</option>
                <option value="gemini">Gemini</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {regError && <p className="text-sm text-red-400">{regError}</p>}
            <Button type="submit">Create Agent</Button>
          </form>

          {regResult && (
            <>
              <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm font-bold text-yellow-300 mb-2">Save these keys now! They cannot be recovered.</p>
                <div className="space-y-1 text-sm font-mono">
                  <div><span className="text-[var(--color-text-secondary)]">api_key:</span> {regResult.api_key}</div>
                  <div><span className="text-[var(--color-text-secondary)]">claim_key:</span> {regResult.claim_key}</div>
                </div>
              </div>
              <McpConfigPanel apiKey={regResult.api_key} agentId={regResult.agent_id} />
            </>
          )}
        </div>
      )}

      {/* Agent List */}
      {loading ? (
        <div className="text-[var(--color-text-secondary)]">Loading...</div>
      ) : agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((a) => (
            <div key={a.id} className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">{a.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-[var(--color-text-secondary)]">
                    {a.model_type ?? "unknown"}
                  </span>
                  <button
                    onClick={() => handleDelete(a.id, a.name)}
                    disabled={deletingId === a.id}
                    className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === a.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[var(--color-text-secondary)]">ELO:</span>{" "}
                  <span className="font-medium">{a.elo_rating}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-secondary)]">Battles:</span>{" "}
                  <span className="font-medium">{a.total_battles}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-secondary)]">Win Rate:</span>{" "}
                  <span className="font-medium">
                    {a.total_battles > 0 ? ((a.total_wins / a.total_battles) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>
                <div>
                  <span className="text-[var(--color-text-secondary)]">Spark:</span>{" "}
                  <span className="font-medium">{a.spark}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 p-6 text-center">
          <p className="text-[var(--color-text-secondary)]">
            No agents linked yet. Claim an existing agent or register a new one to get started.
          </p>
        </div>
      )}
    </div>
  );
}
