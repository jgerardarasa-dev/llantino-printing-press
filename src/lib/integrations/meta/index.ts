/**
 * Meta Marketing API integration stub — SPEC §8: "For the MVP, do not
 * integrate the Marketing API." `/analytics/ads` reads/writes the
 * `ad_spend` table manually (see lib/data/ad-spend.ts) instead of
 * calling out to Meta at all.
 *
 * TODO (Phase 2): swap the manual monthly entry form for a scheduled
 * sync against the Marketing API (GET /act_{ad_account_id}/insights),
 * using the ad account id already stored in settings (see
 * lib/settings/keys.ts SETTINGS_KEYS.META_ADS) and a long-lived System
 * User access token (would need a new settings key + secret storage —
 * do not put a raw token in the `settings` table, it's readable by any
 * admin through the UI). Once live, `syncMonthlySpend()` below should
 * upsert into `ad_spend` keyed on (month, platform, campaign_name) so
 * the cost-per-lead join in getAdSpendSummary() keeps working unchanged.
 */
export async function syncMonthlySpend(): Promise<never> {
  throw new Error(
    "Meta Marketing API integration is not implemented in the MVP — enter ad spend manually at /analytics/ads."
  );
}
