/**
 * The `/settings/*` pages, reproduced from Totem admin.
 *
 * Same titles, same descriptions, same card copy, same order — from
 * apps/admin/src/app/settings/**\/page.tsx and
 * apps/admin/src/components/app-settings/*. The data is static: these pages
 * are normally fed by tRPC, and the point here is the navigation and the
 * surfaces, not the queries behind them.
 */

import * as React from "react";
import { ClockRewind } from "@untitledui/icons";
import {
  InfoIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  ShieldCheckIcon,
  SunIcon,
} from "lucide-react";

import {
  Avatar,
  Button,
  SettingsCard,
  SettingsCardFooter,
  SettingsShell,
  cn,
} from "./kit";

/* ── General ─────────────────────────────────────────────────────────────── */

const USER = { name: "Ty Cagle", email: "ty@off-brand.studio" };

export function GeneralPage() {
  return (
    <SettingsShell title="General" description="Your account and this browser's session.">
      <SettingsCard
        id="account"
        title="Account"
        description="The Google identity this dashboard authenticates with. Names and avatars come from Google — change them there."
      >
        <div className="flex items-center gap-3">
          <Avatar name={USER.name} className="size-11" />
          <div className="flex min-w-0 flex-col">
            <span className="text-foreground-100 truncate text-sm font-medium">{USER.name}</span>
            <span className="text-foreground-300 truncate text-xs">{USER.email}</span>
          </div>
          <div className="bg-accent-100/10 ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5">
            <ShieldCheckIcon className="text-accent-100 size-3" />
            <span className="text-accent-100 font-mono text-[10px] font-medium tracking-[0.02em] uppercase">
              Admin
            </span>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        id="session"
        title="Session"
        description="Ends this browser's session only. Other devices stay signed in."
        footer={
          <SettingsCardFooter
            icon={<InfoIcon className="size-5" />}
            label="You'll land back on the sign-in screen."
          />
        }
      >
        <Button variant="secondary">
          <LogOutIcon className="size-4" />
          Sign out
        </Button>
      </SettingsCard>
    </SettingsShell>
  );
}

/* ── Appearance ──────────────────────────────────────────────────────────── */

const THEME_OPTIONS = [
  { value: "light", icon: SunIcon, label: "Light" },
  { value: "dark", icon: MoonIcon, label: "Dark" },
  { value: "system", icon: MonitorIcon, label: "System" },
] as const;

export function AppearancePage() {
  const [theme, setTheme] = React.useState<string>("system");
  return (
    <SettingsShell title="Appearance" description="How the dashboard looks on this device.">
      <SettingsCard
        id="theme"
        title="Theme"
        description="Stored on this device — no save needed, and it doesn't travel with your account. System follows your OS setting and flips with it through the day."
        footer={
          <SettingsCardFooter
            icon={<InfoIcon className="size-5" />}
            label={
              theme === "system"
                ? "Following your system — currently dark."
                : `Pinned to ${theme}.`
            }
          />
        }
      >
        <div className="flex w-fit gap-2" role="group" aria-label="Theme">
          {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              type="button"
              data-state={theme === value ? "on" : "off"}
              onClick={() => setTheme(value)}
              className={cn(
                "bg-background-200 data-[state=on]:bg-accent-100 data-[state=on]:text-background-100",
                "inline-flex h-10 w-auto cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3 text-sm shadow-none",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </SettingsCard>
    </SettingsShell>
  );
}

/* ── Navigation ──────────────────────────────────────────────────────────── */

export function NavigationPage() {
  return (
    <SettingsShell
      title="Navigation"
      description="What the sidebar remembers about where you work."
    >
      <SettingsCard
        id="favorites"
        title="Favorites"
        description="Pinned to the top of the sidebar. Add or remove one by hovering its row in the rail and hitting the star."
      >
        <p className="text-foreground-300 text-sm">No favorites yet.</p>
      </SettingsCard>
      <SettingsCard
        id="recents"
        title="Recents"
        description="The last four albums, partners, or labels you opened. Favorites are excluded — they're already pinned."
      >
        <p className="text-foreground-300 text-sm">Nothing opened recently.</p>
      </SettingsCard>
      <SettingsCard
        id="ordering"
        title="Group ordering"
        description="Manual drag order for the Partners and Labels groups. Resetting returns both to their natural sort."
      >
        <Button variant="secondary">Reset ordering</Button>
      </SettingsCard>
      <SettingsCard
        id="device"
        title="Dismissed banners & view modes"
        description="Small choices this browser remembered — which banners you closed, which view a page opens in."
      >
        <Button variant="secondary">Clear on this device</Button>
      </SettingsCard>
    </SettingsShell>
  );
}

/* ── Models ──────────────────────────────────────────────────────────────── */

export function ModelsPage() {
  return (
    <SettingsShell title="Models" description="Which model the CRM agent runs on.">
      <SettingsCard
        id="crm-agent"
        title="CRM agent"
        description="Classifies inbound mail into contacts, threads, and deal stage suggestions."
      >
        <div className="flex flex-col gap-2">
          {["Opus 5", "Sonnet 5", "Haiku 4.5"].map((model, i) => (
            <label key={model} className="flex items-center gap-3 text-sm">
              <input type="radio" name="model" defaultChecked={i === 1} />
              {model}
            </label>
          ))}
        </div>
      </SettingsCard>
    </SettingsShell>
  );
}

/* ── Integrations ────────────────────────────────────────────────────────── */

export function IntegrationsPage() {
  return (
    <SettingsShell title="Integrations" description="Connected services.">
      <SettingsCard
        id="gmail"
        title="Gmail"
        description="The mailbox the CRM reads to discover contacts, threads, and deals."
        footer={
          <SettingsCardFooter
            icon={<InfoIcon className="size-5" />}
            label="Not connected."
            action={<span className="text-accent-100 text-sm underline">Connect</span>}
          />
        }
      >
        <p className="text-foreground-300 text-sm">No mailbox connected.</p>
      </SettingsCard>
      <SettingsCard
        id="delete-data"
        title="Delete synced data"
        description="Removes the mailbox connection and everything synced from it — contacts, threads, and deal history. Can't be undone."
        tone="danger"
      >
        <Button variant="secondary">Delete synced data</Button>
      </SettingsCard>
    </SettingsShell>
  );
}

/* ── Pricing ─────────────────────────────────────────────────────────────── */

const RATES = [
  ["Retail price", "$34.99"],
  ["Wholesale", "$17.50"],
  ["E-commerce fee", "2.9% + $0.30"],
  ["Fulfillment", "$4.20"],
  ["Master royalty", "18%"],
  ["Mechanical royalty", "9.1¢"],
  ["Packaging deduction", "25%"],
  ["Manufacturing (COGS)", "$6.80"],
];

export function PricingPage() {
  return (
    <SettingsShell title="Pricing" description="Calculator defaults and rates.">
      <SettingsCard
        id="defaults"
        title="Defaults"
        description="Applied to every new calculation until a product overrides them."
      >
        <dl className="flex flex-col">
          {RATES.map(([label, value], i) => (
            <div
              key={label}
              className={cn(
                "flex items-center justify-between py-2.5 text-sm",
                i > 0 && "border-border-100 border-t",
              )}
            >
              <dt className="text-foreground-300">{label}</dt>
              <dd className="text-foreground-100 font-mono text-[13px]">{value}</dd>
            </div>
          ))}
        </dl>
      </SettingsCard>
      <SettingsCard
        id="presets"
        title="Quick-select presets"
        description="Named bundles of the values above, offered at the top of the calculator."
      >
        <p className="text-foreground-300 text-sm">Standard vinyl · Deluxe · Indie exclusive</p>
      </SettingsCard>
      <SettingsCard
        id="territories"
        title="Territories"
        description="VAT and territory-specific adjustments."
      >
        <p className="text-foreground-300 text-sm">US · UK · EU · JP</p>
      </SettingsCard>
    </SettingsShell>
  );
}

/* ── Access ──────────────────────────────────────────────────────────────── */

const PEOPLE = [
  ["Ty Cagle", "ty@off-brand.studio", "Owner"],
  ["Jordan Reese", "jordan@off-brand.studio", "Admin"],
  ["Sam Okafor", "sam@off-brand.studio", "Editor"],
  ["Priya Raman", "priya@partner.example", "Analyst"],
  ["Alex Chen", "alex@partner.example", "Viewer"],
];

const CAPABILITIES = [
  "Read albums", "Write albums", "Publish", "Delete", "Manage songs",
  "Manage pricing", "Invite people", "Assign roles", "View analytics",
  "Export data", "Manage billing", "Manage API keys",
];
const ROLE_COLUMNS = ["Owner", "Admin", "Editor", "Analyst", "Viewer"];

function AccessPeople() {
  return (
    <SettingsCard
      id="people"
      title="People"
      description="Everyone with access to this dashboard, and the role each one carries."
    >
      <div className="flex flex-col">
        {PEOPLE.map(([name, email, role], i) => (
          <div
            key={email}
            className={cn(
              "flex items-center gap-3 py-3",
              i > 0 && "border-border-100 border-t",
            )}
          >
            <Avatar name={name!} className="size-8 text-xs" />
            <div className="flex min-w-0 flex-col">
              <span className="text-foreground-100 truncate text-sm font-medium">{name}</span>
              <span className="text-foreground-300 truncate text-xs">{email}</span>
            </div>
            <span className="text-foreground-300 ml-auto text-decorative">{role}</span>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

function AccessAgents() {
  return (
    <SettingsCard
      id="agents"
      title="Agents"
      description="Non-human principals that act on this workspace, and what each is allowed to touch."
    >
      <div className="flex flex-col">
        {[["CRM agent", "Classifies inbound mail"], ["Import worker", "Ingests catalog exports"]].map(
          ([name, note], i) => (
            <div
              key={name}
              className={cn("flex items-center gap-3 py-3", i > 0 && "border-border-100 border-t")}
            >
              <div className="flex min-w-0 flex-col">
                <span className="text-foreground-100 truncate text-sm font-medium">{name}</span>
                <span className="text-foreground-300 truncate text-xs">{note}</span>
              </div>
              <span className="text-foreground-300 ml-auto text-decorative">Service</span>
            </div>
          ),
        )}
      </div>
    </SettingsCard>
  );
}

/**
 * The capability matrix. Wider than its card on purpose — this is the
 * horizontal scroller the back gesture must not steal from.
 */
function AccessRoles() {
  return (
    <SettingsCard
      id="roles"
      title="Roles"
      description="What each role can do. Scrolls sideways — and a left-edge back swipe must still work over it."
    >
      <div className="-mx-6 overflow-x-auto overscroll-x-contain px-6" tabIndex={0} role="region" aria-label="Capability matrix">
        <table className="min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-foreground-300 text-decorative border-border-100 border-b py-2 pr-4 text-left font-normal">
                Capability
              </th>
              {ROLE_COLUMNS.map((role) => (
                <th
                  key={role}
                  className="text-foreground-300 text-decorative border-border-100 border-b px-4 py-2 text-center font-normal"
                >
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((capability, i) => (
              <tr key={capability}>
                <th className="text-foreground-100 border-border-100 border-b py-2.5 pr-4 text-left text-sm font-normal whitespace-nowrap">
                  {capability}
                </th>
                {ROLE_COLUMNS.map((role, j) => (
                  <td
                    key={role}
                    className="border-border-100 text-foreground-300 border-b px-4 py-2.5 text-center"
                  >
                    {j <= 1 || (i + j) % 3 === 0 ? (
                      <span className="text-accent-100">●</span>
                    ) : (
                      "—"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SettingsCard>
  );
}

function AccessActivity() {
  return (
    <SettingsCard
      id="activity"
      title="Activity"
      description="Every grant, revocation, and role change, most recent first."
    >
      <div className="flex flex-col">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className={cn("flex items-center gap-3 py-3", i > 0 && "border-border-100 border-t")}
          >
            <ClockRewind className="text-foreground-300 size-4 shrink-0" />
            <div className="flex min-w-0 flex-col">
              <span className="text-foreground-100 truncate text-sm">
                Role changed to <span className="font-medium">Editor</span>
              </span>
              <span className="text-foreground-300 truncate text-xs">
                sam@off-brand.studio · {i + 1} hour{i === 0 ? "" : "s"} ago
              </span>
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

export type AccessSection = "people" | "agents" | "roles" | "activity";

export function toAccessSection(value: string | null): AccessSection {
  return value === "agents" || value === "roles" || value === "activity" ? value : "people";
}

export function AccessPage({ section }: { section: AccessSection }) {
  return (
    <SettingsShell title="Access" description="People, roles, and permissions.">
      {section === "people" ? <AccessPeople /> : null}
      {section === "agents" ? <AccessAgents /> : null}
      {section === "roles" ? <AccessRoles /> : null}
      {section === "activity" ? <AccessActivity /> : null}
    </SettingsShell>
  );
}
