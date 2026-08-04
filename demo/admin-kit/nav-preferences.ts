"use client";

import * as React from "react";

export type FavoriteRef =
  | { type: "partner"; id: string }
  | { type: "label"; id: string }
  | { type: "album"; id: string };

export interface NavPreferences {
  favorites: FavoriteRef[];
  recents: FavoriteRef[];
  partnerOrder: string[];
  labelOrder: string[];
}

const STORAGE_PREFIX = "totem:admin:nav-prefs:";

const EMPTY_PREFS: NavPreferences = {
  favorites: [],
  recents: [],
  partnerOrder: [],
  labelOrder: [],
};

function storageKey(userKey: string) {
  return `${STORAGE_PREFIX}${userKey}`;
}

function readPrefs(userKey: string): NavPreferences {
  if (typeof window === "undefined") return EMPTY_PREFS;
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    if (!raw) return EMPTY_PREFS;
    const parsed = JSON.parse(raw) as Partial<NavPreferences>;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      recents: Array.isArray(parsed.recents) ? parsed.recents.slice(0, 4) : [],
      partnerOrder: Array.isArray(parsed.partnerOrder)
        ? parsed.partnerOrder
        : [],
      labelOrder: Array.isArray(parsed.labelOrder) ? parsed.labelOrder : [],
    };
  } catch {
    return EMPTY_PREFS;
  }
}

function writePrefs(userKey: string, prefs: NavPreferences) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userKey), JSON.stringify(prefs));
}

export function favoriteKey(ref: FavoriteRef): string {
  switch (ref.type) {
    case "partner":
      return `partner:${ref.id}`;
    case "label":
      return `label:${ref.id}`;
    case "album":
      return `album:${ref.id}`;
    default: {
      const _exhaustive: never = ref;
      return _exhaustive;
    }
  }
}

export function parseFavoriteKey(key: string): FavoriteRef | null {
  const sep = key.indexOf(":");
  if (sep <= 0) return null;
  const kind = key.slice(0, sep);
  const id = key.slice(sep + 1);
  if (!id) return null;
  switch (kind) {
    case "partner":
      return { type: "partner", id };
    case "label":
      return { type: "label", id };
    case "album":
      return { type: "album", id };
    default:
      return null;
  }
}

export function applyIdOrder<T extends { id: string }>(
  items: T[],
  order: string[],
): T[] {
  if (order.length === 0) return items;
  const remaining = new Map(items.map((item) => [item.id, item]));
  const ordered: T[] = [];
  for (const id of order) {
    const item = remaining.get(id);
    if (item) {
      ordered.push(item);
      remaining.delete(id);
    }
  }
  for (const item of items) {
    if (remaining.has(item.id)) ordered.push(item);
  }
  return ordered;
}

function favoriteEquals(a: FavoriteRef, b: FavoriteRef): boolean {
  return favoriteKey(a) === favoriteKey(b);
}

export function useNavPreferences(userKey: string) {
  const [prefs, setPrefs] = React.useState<NavPreferences>(() =>
    readPrefs(userKey),
  );
  const [activeKey, setActiveKey] = React.useState(userKey);

  // Remount prefs when the signed-in user changes — adjust during render
  // (React-recommended) instead of setState-in-effect.
  if (activeKey !== userKey) {
    setActiveKey(userKey);
    setPrefs(readPrefs(userKey));
  }

  const persist = React.useCallback(
    (next: NavPreferences) => {
      setPrefs(next);
      writePrefs(userKey, next);
    },
    [userKey],
  );

  const toggleFavorite = React.useCallback(
    (ref: FavoriteRef) => {
      const alreadyFavorite = prefs.favorites.some((favorite) =>
        favoriteEquals(favorite, ref),
      );
      persist({
        ...prefs,
        favorites: alreadyFavorite
          ? prefs.favorites.filter((f) => !favoriteEquals(f, ref))
          : [...prefs.favorites, ref],
        recents: alreadyFavorite
          ? prefs.recents
          : prefs.recents.filter((recent) => !favoriteEquals(recent, ref)),
      });
    },
    [persist, prefs],
  );

  const isFavorite = React.useCallback(
    (ref: FavoriteRef) => prefs.favorites.some((f) => favoriteEquals(f, ref)),
    [prefs.favorites],
  );

  const reorderFavorites = React.useCallback(
    (orderedKeys: string[]) => {
      const byKey = new Map(prefs.favorites.map((f) => [favoriteKey(f), f]));
      const next: FavoriteRef[] = [];
      for (const key of orderedKeys) {
        const ref = byKey.get(key);
        if (ref) {
          next.push(ref);
          byKey.delete(key);
        }
      }
      for (const ref of prefs.favorites) {
        const key = favoriteKey(ref);
        if (byKey.has(key)) next.push(ref);
      }
      persist({ ...prefs, favorites: next });
    },
    [persist, prefs],
  );

  const reorderPartners = React.useCallback(
    (orderedIds: string[]) => {
      persist({ ...prefs, partnerOrder: orderedIds });
    },
    [persist, prefs],
  );

  const reorderLabels = React.useCallback(
    (orderedIds: string[]) => {
      persist({ ...prefs, labelOrder: orderedIds });
    },
    [persist, prefs],
  );

  const recordRecent = React.useCallback(
    (ref: FavoriteRef) => {
      setPrefs((current) => {
        const key = favoriteKey(ref);
        if (
          current.favorites.some((favorite) => favoriteEquals(favorite, ref))
        ) {
          return current;
        }
        if (
          favoriteKey(current.recents[0] ?? ref) === key &&
          current.recents.length > 0
        ) {
          return current;
        }
        const recents = [
          ref,
          ...current.recents.filter((item) => favoriteKey(item) !== key),
        ].slice(0, 4);
        const next = { ...current, recents };
        writePrefs(userKey, next);
        return next;
      });
    },
    [userKey],
  );

  const clearFavorites = React.useCallback(
    () => persist({ ...prefs, favorites: [] }),
    [persist, prefs],
  );

  const clearRecents = React.useCallback(
    () => persist({ ...prefs, recents: [] }),
    [persist, prefs],
  );

  /** Drop manual drag ordering; groups fall back to their natural sort. */
  const resetOrdering = React.useCallback(
    () => persist({ ...prefs, partnerOrder: [], labelOrder: [] }),
    [persist, prefs],
  );

  return {
    prefs,
    toggleFavorite,
    isFavorite,
    reorderFavorites,
    reorderPartners,
    reorderLabels,
    recordRecent,
    clearFavorites,
    clearRecents,
    resetOrdering,
  };
}

export type UseNavPreferencesReturn = ReturnType<typeof useNavPreferences>;
