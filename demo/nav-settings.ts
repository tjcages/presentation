/** `apps/admin/src/nav-settings.ts` — labels, order, icons and keywords. */
import {
  Calculator,
  Contrast01,
  CpuChip01,
  LayoutLeft,
  Lock01,
  PuzzlePiece01,
  User01,
} from "@untitledui/icons";

import type { SettingsNavGroup } from "./admin-kit/settings-nav";

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    items: [
      {
        id: "general", label: "General", to: "/settings", end: true, icon: User01,
        description: "Account & session",
        keywords: [
          { label: "Signed in as", anchor: "account" },
          { label: "Email", anchor: "account" },
          { label: "Sign out", anchor: "session" },
          { label: "Log out", anchor: "session" },
        ],
      },
      {
        id: "appearance", label: "Appearance", to: "/settings/appearance", icon: Contrast01,
        description: "Theme",
        keywords: [
          { label: "Theme", anchor: "theme" },
          { label: "Dark mode", anchor: "theme" },
          { label: "Light mode", anchor: "theme" },
          { label: "System", anchor: "theme" },
        ],
      },
      {
        id: "navigation", label: "Navigation", to: "/settings/navigation", icon: LayoutLeft,
        description: "Sidebar favorites & recents",
        keywords: [
          { label: "Favorites", anchor: "favorites" },
          { label: "Recents", anchor: "recents" },
          { label: "Recently visited", anchor: "recents" },
          { label: "Reset sidebar", anchor: "ordering" },
        ],
      },
      {
        id: "access", label: "Access", to: "/settings/access", icon: Lock01,
        description: "People, roles & permissions",
        keywords: [
          { label: "Members", anchor: "people" },
          { label: "Team", anchor: "people" },
          { label: "Invite", anchor: "people" },
          { label: "Permissions", to: "/settings/access?tab=roles" },
          { label: "Roles", to: "/settings/access?tab=roles" },
          { label: "Capabilities", to: "/settings/access?tab=roles" },
          { label: "Access log", to: "/settings/access?tab=activity" },
          { label: "Audit", to: "/settings/access?tab=activity" },
        ],
      },
      {
        id: "pricing", label: "Pricing", to: "/settings/pricing", icon: Calculator,
        description: "Calculator defaults & rates",
        keywords: [
          { label: "Retail price", anchor: "defaults" },
          { label: "Wholesale", anchor: "defaults" },
          { label: "Quick-select presets", anchor: "presets" },
          { label: "VAT", anchor: "territories" },
          { label: "Territory", anchor: "territories" },
        ],
      },
      {
        id: "models", label: "Models", to: "/settings/models", icon: CpuChip01,
        description: "Which model the CRM agent uses",
        keywords: [
          { label: "Model", anchor: "crm-agent" },
          { label: "Claude", anchor: "crm-agent" },
          { label: "CRM agent", anchor: "crm-agent" },
        ],
      },
      {
        id: "integrations", label: "Integrations", to: "/settings/integrations", icon: PuzzlePiece01,
        description: "Connected services",
        keywords: [
          { label: "Gmail", anchor: "gmail" },
          { label: "Mailbox", anchor: "gmail" },
          { label: "Disconnect", anchor: "delete-data" },
        ],
      },
    ],
  },
];
