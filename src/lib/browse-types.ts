export interface SteamFeaturedItem {
  id: number;
  type: number;
  name: string;
  discounted: boolean;
  discount_percent: number;
  original_price: number;
  final_price: number;
  currency: string;
  header_image: string;
  small_capsule_image: string;
  large_capsule_image?: string;
  windows_available: boolean;
  mac_available: boolean;
  linux_available: boolean;
  /** Lower = bigger publisher (0 platform holder, 1 AAA, …). Set by browse API sort. */
  publisherTier?: number;
  /** Release timestamp for browse sort; Infinity = undated. */
  releaseSortKey?: number;
}

export interface SteamBrowseCategory {
  id: string;
  name: string;
  items: SteamFeaturedItem[];
}

export interface SteamBrowseResponse {
  popular: SteamFeaturedItem[];
  upcomingReleases: SteamFeaturedItem[];
}
