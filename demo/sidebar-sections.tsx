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
import { activeSectionId, sectionHref } from "./sections";

export function SectionsMenu({
  level,
  search,
}: {
  level: SectionLevel;
  search: URLSearchParams;
}) {
  const { Link, pathname } = useAdminKit();
  const param = level.param ?? "tab";
  const activeId = activeSectionId(
    level.sections,
    pathname,
    search,
    level.basePath,
    param,
    level.defaultSection,
  );

  return (
    <div className="flex flex-col gap-1">
      <SidebarGroupLabel className="text-foreground-300/70 flex items-center gap-1 pr-1">
        <span className="min-w-0 flex-1 truncate">{level.title}</span>
      </SidebarGroupLabel>
      <SidebarMenu className="**:data-[sidebar=menu-button]:gap-3">
        {level.sections.map((section, i) => (
          <React.Fragment key={section.id}>
            {/* A sub-heading starts a run of related rows — the workspace
                lenses read as views of one thing, not as separate pages. */}
            {section.group && section.group !== level.sections[i - 1]?.group && (
              // No `hidden` when collapsed: a sub-heading that disappears
              // takes its height with it, so every row below it moves up. It
              // becomes a rule instead, like the level's own heading.
              <SidebarGroupLabel className="text-foreground-300/70 mt-2">
                <span className="min-w-0 flex-1 truncate">{section.group}</span>
              </SidebarGroupLabel>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={section.id === activeId}
                tooltip={section.label}
              >
                <Link
                  to={sectionHref(section, level.basePath, param, level.defaultSection)}
                >
                  <section.icon />
                  <span>{section.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </React.Fragment>
        ))}
      </SidebarMenu>
    </div>
  );
}

/** Pushed sidebar level for a registered area (Roster, Labels, Access). */
export function SectionLevelNav({
  level,
  search,
}: {
  level: SectionLevel;
  search: string;
}) {
  return <SectionsMenu level={level} search={new URLSearchParams(search)} />;
}
