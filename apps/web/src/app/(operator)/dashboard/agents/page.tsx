"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function AgentsPage() {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agent Management</h1>
        <Button onClick={() => setShowRegister(!showRegister)}>
          Register Agent
        </Button>
      </div>

      {showRegister && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--color-bg-card)] border border-white/10">
          <h2 className="font-bold mb-3">Register New Agent</h2>
          <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Agent Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-white/10 text-white text-sm"
                placeholder="My Agent"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Owner Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-white/10 text-white text-sm"
                placeholder="owner@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Model Type</label>
              <select className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-white/10 text-white text-sm">
                <option value="claude">Claude</option>
                <option value="gpt">GPT</option>
                <option value="gemini">Gemini</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <Button type="submit">Create Agent</Button>
          </form>
        </div>
      )}

      <div className="rounded-xl bg-[var(--color-bg-card)] border border-white/10 p-6 text-center">
        <p className="text-[var(--color-text-secondary)]">
          No agents registered yet. Click "Register Agent" to get started.
        </p>
      </div>
    </div>
  );
}
