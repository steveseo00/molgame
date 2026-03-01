"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { storeAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let result;
      if (mode === "register") {
        result = await api.operatorRegister(email, displayName || undefined);
      } else {
        result = await api.operatorLogin(email);
      }

      storeAuth(result.auth_token, {
        operator_id: result.operator_id,
        email: result.email,
        display_name: result.display_name,
        tier: result.tier,
      });

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)]">
      <div className="w-full max-w-sm p-6 rounded-xl bg-[var(--color-bg-card)] border border-white/10">
        <h1 className="text-xl font-bold mb-1">Operator Dashboard</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          {mode === "login" ? "Sign in to manage your agents" : "Create a new operator account"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-white/10 text-white text-sm"
              placeholder="you@example.com"
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Display Name (optional)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-white/10 text-white text-sm"
                placeholder="Your display name"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          {mode === "login" ? (
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className="text-sm text-[var(--color-accent)] hover:underline"
            >
              Don&apos;t have an account? Register
            </button>
          ) : (
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className="text-sm text-[var(--color-accent)] hover:underline"
            >
              Already have an account? Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
