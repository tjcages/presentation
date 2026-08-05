/**
 * `apps/admin/src/components/navigation/_sections.ts`.
 *
 * The section registry: for any route, the sibling views you can switch
 * between. One definition drives the pushed sidebar level. Pure data + pure
 * resolvers, exactly as in the app.
 */

import {
  Building07,
  Calculator,
  ClockRewind,
  CpuChip01,
  Disc01,
  Grid01,
  Lock01,
  Mail01,
  Percent03,
  Settings01,
  Sliders01,
  Stars01,
  Tag01,
  Tool01,
  Users01,
} from "@untitledui/icons";

export interface SectionItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Route this section lives on. Defaults to the menu's `basePath`. */
  path?: string;
  /** Value of the menu's `param` that selects this section. */
  value?: string;
  /** Detail routes that keep this section lit. */
  activePrefixes?: string[];
  /** Sub-heading above this section, starting a run of related rows. */
  group?: string;
}

export interface SectionLevel {
  basePath: string;
  title: string;
  sections: SectionItem[];
  /** @default "tab" */
  param?: string;
  defaultSection: string;
}

/** Where a section points, and the param value that selects it (if any). */
export function resolveSection(
  section: SectionItem,
  basePath: string,
): { path: string; value: string | null } {
  const path = section.path ?? basePath;
  const value = section.value ?? (section.path ? null : section.id);
  return { path, value };
}

export function sectionHref(
  section: SectionItem,
  basePath: string,
  param: string,
  defaultValue: string,
): string {
  const { path, value } = resolveSection(section, basePath);
  // The default value is the bare URL, so the sidebar never produces a
  // redundant `?lens=labels`.
  if (value === null || value === defaultValue) return path;
  return `${path}?${param}=${value}`;
}

/**
 * Which section owns the current location. Exact path (+ param) wins; a detail
 * route falls back to whichever section claims it via `activePrefixes`.
 */
export function activeSectionId(
  sections: SectionItem[],
  pathname: string,
  search: URLSearchParams,
  basePath: string,
  param: string,
  defaultValue: string,
): string | null {
  const current = search.get(param) ?? defaultValue;
  const exact = sections.find((section) => {
    const { path, value } = resolveSection(section, basePath);
    if (pathname !== path) return false;
    return value === null || value === current;
  });
  if (exact) return exact.id;

  const byPrefix = sections.find((section) =>
    section.activePrefixes?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ),
  );
  return byPrefix?.id ?? null;
}

/**
 * Roster's own pages. The four lenses share `/crm/workspace` and are selected
 * by `?lens=`, so they carry an explicit `value` and sit under a "Workspace"
 * sub-heading — otherwise "Labels" reads as a page of its own rather than one
 * view of the workspace.
 */
const CRM_SECTIONS: SectionItem[] = [
  { id: "overview", label: "Overview", icon: Grid01, path: "/crm" },
  {
    id: "labels", label: "Labels", icon: Building07, path: "/crm/workspace",
    value: "labels", activePrefixes: ["/crm/labels"], group: "Workspace",
  },
  {
    id: "albums", label: "Albums", icon: Disc01, path: "/crm/workspace",
    value: "albums", activePrefixes: ["/crm/deals"], group: "Workspace",
  },
  {
    id: "people", label: "People", icon: Users01, path: "/crm/workspace",
    value: "people", activePrefixes: ["/crm/contacts"], group: "Workspace",
  },
  {
    id: "production", label: "Production", icon: Tool01, path: "/crm/workspace",
    value: "production", group: "Workspace",
  },
  { id: "onboarding", label: "Gmail import", icon: Mail01, path: "/crm/onboarding", group: "Mailbox" },
  { id: "suggestions", label: "Suggestions", icon: Stars01, path: "/crm/suggestions", group: "Mailbox" },
  { id: "crm-settings", label: "Settings", icon: Settings01, path: "/crm/settings", group: "Mailbox" },
];

/**
 * Everything that used to be an in-page tab bar on /pricing, plus two rows
 * that are their own routes and so carry an explicit `path`.
 */
const LABELS_SECTIONS: SectionItem[] = [
  { id: "labels", label: "Labels", icon: Tag01 },
  { id: "profiles", label: "Royalty profiles", icon: Percent03 },
  { id: "calculator", label: "Calculator", icon: Calculator, path: "/pricing/ap-calculator" },
  { id: "pricing-settings", label: "Pricing settings", icon: Sliders01, path: "/settings/pricing" },
];

export const SECTION_LEVELS: SectionLevel[] = [
  { basePath: "/crm", title: "Roster", sections: CRM_SECTIONS, param: "lens", defaultSection: "labels" },
  { basePath: "/pricing", title: "Labels", sections: LABELS_SECTIONS, defaultSection: "labels" },
];

/** The level owning `pathname`, if any. Exact match or a sub-path. */
export function findSectionLevel(pathname: string): SectionLevel | undefined {
  return SECTION_LEVELS.find(
    (level) => pathname === level.basePath || pathname.startsWith(`${level.basePath}/`),
  );
}

/** Ids must match what the Access route parses `?tab=` against. */
const ACCESS_SECTIONS: SectionItem[] = [
  { id: "people", label: "People", icon: Users01 },
  { id: "agents", label: "Agents", icon: CpuChip01 },
  { id: "roles", label: "Roles", icon: Lock01 },
  { id: "activity", label: "Activity", icon: ClockRewind },
];

/**
 * A settings page whose views are siblings rather than one scroll, so it
 * pushes a SECOND sidebar level under the settings level.
 */
export const SETTINGS_SUB_LEVELS: SectionLevel[] = [
  {
    basePath: "/settings/access",
    title: "Access",
    sections: ACCESS_SECTIONS,
    defaultSection: "people",
  },
];

export function findSettingsSubLevel(pathname: string): SectionLevel | undefined {
  return SETTINGS_SUB_LEVELS.find(
    (level) => pathname === level.basePath || pathname.startsWith(`${level.basePath}/`),
  );
}
