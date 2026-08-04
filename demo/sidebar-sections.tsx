"use client";

/** `_sidebar-sections.tsx`'s `SectionsMenu` / `SectionLevelNav`. */
import * as React from "react";

import type { SectionLevel } from "./sections";
import { useAdminKit } from "./admin-kit/context";
import {
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./admin-kit/primitives/sidebar";
import { sectionHref } from "./sections";

function SectionsMenu({ level, activeId }: { level: SectionLevel; activeId: string }) {
  const { Link } = useAdminKit();
  return (
    <div className="flex flex-col gap-1">
      <SidebarGroupLabel className="text-foreground-300/70 flex items-center gap-1 pr-1">
        <span className="min-w-0 flex-1 truncate">{level.title}</span>
      </SidebarGroupLabel>
      <SidebarMenu className="**:data-[sidebar=menu-button]:gap-3">
        {level.sections.map((section) => (
          <SidebarMenuItem key={section.id}>
            <SidebarMenuButton asChild isActive={section.id === activeId} tooltip={section.label}>
              <Link to={sectionHref(level, section.id)}>
                <section.icon />
                <span>{section.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </div>
  );
}

/** Pushed sidebar level for a registered area. */
export function SectionLevelNav({ level }: { level: SectionLevel }) {
  const { pathname } = useAdminKit();
  const search = typeof window === "undefined" ? "" : window.location.search;
  const raw = new URLSearchParams(search).get(level.param ?? "tab");
  const activeId = level.sections.some((s) => s.id === raw) ? raw! : level.defaultSection;
  void pathname;
  return <SectionsMenu level={level} activeId={activeId} />;
}
