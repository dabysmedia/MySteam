export interface SteamSearchItem {
  type: string;
  name: string;
  id: number;
  tiny_image: string;
  metascore?: string;
  platforms: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
  price?: {
    currency: string;
    initial: number;
    final: number;
  };
}

export interface SteamSearchResponse {
  total: number;
  items: SteamSearchItem[];
}

export interface SteamMovie {
  id: number;
  name: string;
  thumbnail: string;
  webm?: { "480"?: string; max?: string };
  mp4?: { "480"?: string; max?: string };
  hls_h264?: string;
  dash_h264?: string;
  dash_av1?: string;
  highlight: boolean;
}

export interface SteamScreenshot {
  id: number;
  path_thumbnail: string;
  path_full: string;
}

export interface SteamGameDetails {
  type: string;
  name: string;
  steam_appid: number;
  short_description: string;
  detailed_description: string;
  about_the_game?: string;
  header_image: string;
  background?: string;
  background_raw?: string;
  capsule_image?: string;
  capsule_imagev5?: string;
  is_free: boolean;
  developers?: string[];
  publishers?: string[];
  genres?: { id: string; description: string }[];
  categories?: { id: number; description: string }[];
  release_date?: { coming_soon: boolean; date: string };
  metacritic?: { score: number; url: string };
  recommendations?: { total: number };
  price_overview?: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
    initial_formatted: string;
    final_formatted: string;
  };
  platforms?: { windows: boolean; mac: boolean; linux: boolean };
  movies?: SteamMovie[];
  screenshots?: SteamScreenshot[];
  website?: string;
}

export interface SteamAppDetailsResponse {
  [appId: string]: {
    success: boolean;
    data?: SteamGameDetails;
  };
}

export interface GameStats {
  metacritic?: { score: number; url: string };
  hltb?: {
    gameId: number;
    gameName: string;
    mainHours: number | null;
    mainExtraHours: number | null;
    completionistHours: number | null;
    hltbUrl: string;
  };
}

export type BacklogStatus = "wishlist" | "playing" | "completed" | "dropped";

export interface BacklogGame {
  appId: number;
  name: string;
  headerImage: string;
  backgroundImage?: string;
  shortDescription: string;
  status: BacklogStatus;
  releaseDate?: string;
  comingSoon?: boolean;
  addedAt: string;
  updatedAt: string;
  notes?: string;
  priority?: number;
  /** Lower = earlier in the wishlist queue */
  queueOrder?: number;
  /** Custom hero/card artwork URL (screenshot, background, etc.) */
  featuredArt?: string;
  /** First Steam screenshot — used as row background bleed */
  screenshotImage?: string;
  metacriticScore?: number;
  hltbMainHours?: number;
  hltbMainExtraHours?: number;
  hltbCompletionistHours?: number;
  genres?: string[];
  /** Steam store categories — Open World, Co-op, etc. */
  tags?: string[];
}

export interface BacklogSnapshot {
  games: BacklogGame[];
  savedAt: string;
}

export const STATUS_LABELS: Record<BacklogStatus, string> = {
  wishlist: "Want to Play",
  playing: "Playing Now",
  completed: "Completed",
  dropped: "Dropped",
};

export const STATUS_LABELS_SHORT: Record<BacklogStatus, string> = {
  wishlist: "Queue",
  playing: "Now",
  completed: "Done",
  dropped: "Dropped",
};

export const STATUS_COLORS: Record<BacklogStatus, string> = {
  wishlist: "#66c0f4",
  playing: "#a4d007",
  completed: "#5ba32b",
  dropped: "#8f98a0",
};
