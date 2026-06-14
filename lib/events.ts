/**
 * Dispatched on `window` whenever the player's coin balance changes
 * (e.g. after rewards, purchases, or persisted-state hydration).
 * Listeners should re-read the canonical coin value from storage; this
 * event itself carries no payload.
 */
export const HYPERGRID_COINS_CHANGED = "hypergrid:coins-changed" as const;

/**
 * Dispatched on `window` whenever the player's inventory mutates —
 * items acquired in the shop, equipped/unequipped, or otherwise added
 * or removed. Listeners should re-read inventory state from storage.
 */
export const HYPERGRID_INVENTORY_CHANGED = "hypergrid:inventory-changed" as const;

/**
 * Dispatched on `window` whenever an AI opponent's affinity value
 * changes (won/lost matches, gifts given, story progress). Listeners
 * should re-read affinity state from storage to refresh UI.
 */
export const HYPERGRID_AFFINITY_CHANGED = "hypergrid:affinity-changed" as const;

/**
 * Dispatched on `window` when an achievement is unlocked and a toast
 * should be displayed. The event's `detail` follows the
 * `AchievementToastDetail` shape below.
 */
export const HYPERGRID_ACHIEVEMENT_TOAST = "hypergrid:achievement-toast" as const;

export type AchievementToastDetail = {
  name: string;
  tier: "Bronze" | "Silver" | "Gold";
  icon: string;
};
