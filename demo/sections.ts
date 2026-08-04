/** `apps/admin/src/components/navigation/_sections.ts`, settings half only. */
import { ClockRewind, CpuChip01, Lock01, Users01 } from "@untitledui/icons";

export interface SectionItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface SectionLevel {
  basePath: string;
  title: string;
  sections: SectionItem[];
  defaultSection: string;
  param?: string;
}

/** Ids must match what the route parses `?tab=` against. */
const ACCESS_SECTIONS: SectionItem[] = [
  { id: "people", label: "People", icon: Users01 },
  { id: "agents", label: "Agents", icon: CpuChip01 },
  { id: "roles", label: "Roles", icon: Lock01 },
  { id: "activity", label: "Activity", icon: ClockRewind },
];

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

/** `sectionHref` — the default section is addressed without a param. */
export function sectionHref(level: SectionLevel, id: string): string {
  const param = level.param ?? "tab";
  return id === level.defaultSection ? level.basePath : `${level.basePath}?${param}=${id}`;
}
