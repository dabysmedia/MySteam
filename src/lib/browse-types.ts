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
}

export interface SteamBrowseCategory {
  id: string;
  name: string;
  items: SteamFeaturedItem[];
}

export interface SteamBrowseResponse {
  popular: SteamFeaturedItem[];
  newReleases: SteamFeaturedItem[];
  comingSoon: SteamFeaturedItem[];
}
