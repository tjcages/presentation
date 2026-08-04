"use client";

import * as React from "react";

/**
 * Props the kit passes to whatever link component the host app supplies.
 * Matches the shape of next/link and react-router's Link — the kit never
 * imports a router itself, so it survives a future framework migration.
 *
 * Extends anchor props because the kit renders links via Radix `Slot`
 * (`SidebarMenuButton asChild`), which merges `data-*` state attributes and
 * tooltip handlers into the link — hosts must spread the rest through.
 */
export interface AdminKitLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  end?: boolean;
}

export type AdminKitLink = React.ComponentType<AdminKitLinkProps>;

interface AdminKitContextValue {
  /** Host-provided link component (e.g. a next/link wrapper). */
  Link: AdminKitLink;
  /** Current pathname, used to compute active nav state. */
  pathname: string;
}

const AdminKitContext = React.createContext<AdminKitContextValue | null>(null);

export function useAdminKit(): AdminKitContextValue {
  const ctx = React.useContext(AdminKitContext);
  if (!ctx) {
    throw new Error("admin-kit components must be rendered inside <AppShell>.");
  }
  return ctx;
}

export function AdminKitProvider({
  Link,
  pathname,
  children,
}: AdminKitContextValue & { children: React.ReactNode }) {
  const value = React.useMemo(() => ({ Link, pathname }), [Link, pathname]);
  return (
    <AdminKitContext.Provider value={value}>
      {children}
    </AdminKitContext.Provider>
  );
}

/** Whether a nav item is active for the given pathname. */
export function isNavItemActive(
  pathname: string,
  to: string,
  end?: boolean,
): boolean {
  return end
    ? pathname === to
    : pathname === to || pathname.startsWith(`${to}/`);
}
