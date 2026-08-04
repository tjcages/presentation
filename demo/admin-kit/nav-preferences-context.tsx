"use client";

import * as React from "react";

import type { UseNavPreferencesReturn } from "./nav-preferences";
import { useNavPreferences } from "./nav-preferences";

const NavPreferencesContext = React.createContext<
  UseNavPreferencesReturn | undefined
>(undefined);

export function NavPreferencesValueProvider({
  value,
  children,
}: {
  value: UseNavPreferencesReturn;
  children: React.ReactNode;
}) {
  return (
    <NavPreferencesContext.Provider value={value}>
      {children}
    </NavPreferencesContext.Provider>
  );
}

export function NavPreferencesProvider({
  userKey,
  children,
}: {
  userKey: string;
  children: React.ReactNode;
}) {
  const value = useNavPreferences(userKey);
  return (
    <NavPreferencesContext.Provider value={value}>
      {children}
    </NavPreferencesContext.Provider>
  );
}

export function useNavPreferencesContext(): UseNavPreferencesReturn {
  const ctx = React.useContext(NavPreferencesContext);
  if (!ctx) {
    throw new Error(
      "useNavPreferencesContext must be used within NavPreferencesProvider",
    );
  }
  return ctx;
}

export function useOptionalNavPreferences(): UseNavPreferencesReturn | null {
  return React.useContext(NavPreferencesContext) ?? null;
}
