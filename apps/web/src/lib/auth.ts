"use client";

import { createContext, useContext } from "react";

const TOKEN_KEY = "acb_operator_token";
const OPERATOR_KEY = "acb_operator_data";

export interface StoredOperator {
  operator_id: string;
  email: string;
  display_name: string;
  tier: string;
}

// localStorage wrappers
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredOperator(): StoredOperator | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(OPERATOR_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeAuth(token: string, operator: StoredOperator) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(OPERATOR_KEY, JSON.stringify(operator));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(OPERATOR_KEY);
}

// React Context
export interface AuthContextType {
  token: string | null;
  operator: StoredOperator | null;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  operator: null,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
