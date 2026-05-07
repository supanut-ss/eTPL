import { API_BASE_URL } from "../api/axiosInstance";

/**
 * Central configuration for external image assets and links
 */
export const IMAGE_BASE_URLS = {
  // PESDB Assets (Default)
  PESDB_FACE: "https://pesdb.net/assets/img/player/{id}.png",
  PESDB_CARD: "https://pesdb.net/assets/img/card/b{id}.png",
  PESDB_CARD_F: "https://pesdb.net/assets/img/card/f{id}.png",

  // PESMaster Assets (Specific for ClubSquadPage)
  PESMASTER_FACE_PNG: "https://www.pesmaster.com/pes-2021/graphics/players/player_{id}.png",
  PESMASTER_FACE_WEBP: "https://www.pesmaster.com/efootball-2022/graphics/players/{id}_.webp",

  // Link to PESDB database (Updated for eFootball)
  PESDB_INFO: "https://pesdb.net/efootball/?id={id}",
};

/**
 * Generates the URL for a club's logo image
 * @param {string} teamName - The name of the team
 * @returns {string}
 */
export const getLogoUrl = (teamName) => {
  if (!teamName) return "";
  // In production, images are hosted on the API subdomain (apicore.thaipesleague.com)
  // while the frontend is on the main domain (thaipesleague.com).
  return `${API_BASE_URL}/_image/CLUB_LOGO/${encodeURIComponent(teamName)}.png`;
};

/**
 * Generates the URL for a player's face image (Defaults to PESDB)
 * @param {number|string} playerId - The player's ID
 * @returns {string}
 */
export const getPlayerFaceUrl = (playerId) => {
  if (!playerId) return "";
  return IMAGE_BASE_URLS.PESDB_FACE.replace("{id}", playerId);
};

/**
 * Generates the URL for a player's face image from PESMaster
 * @param {number|string} playerId - The player's ID
 * @param {string} format - 'png' or 'webp'
 * @returns {string}
 */
export const getPlayerFaceUrlPesmaster = (playerId, format = "png") => {
  if (!playerId) return "";
  if (format === "webp") {
    return IMAGE_BASE_URLS.PESMASTER_FACE_WEBP.replace("{id}", playerId);
  }
  return IMAGE_BASE_URLS.PESMASTER_FACE_PNG.replace("{id}", playerId);
};

/**
 * Generates the URL for a player's card image (b-style)
 * @param {number|string} playerId - The player's ID
 * @returns {string}
 */
export const getPlayerCardUrl = (playerId) => {
  if (!playerId) return "";
  return IMAGE_BASE_URLS.PESDB_CARD.replace("{id}", playerId);
};

/**
 * Generates the URL for a player's card image (f-style - Featured)
 * @param {number|string} playerId - The player's ID
 * @returns {string}
 */
export const getPlayerCardFUrl = (playerId) => {
  if (!playerId) return "";
  return IMAGE_BASE_URLS.PESDB_CARD_F.replace("{id}", playerId);
};

/**
 * Generates the URL for a player's Info page on PESDB
 * @param {number|string} playerId - The player's ID
 * @returns {string|null}
 */
export const getPesdbInfoUrl = (playerId) => {
  if (!playerId) return null;
  return IMAGE_BASE_URLS.PESDB_INFO.replace("{id}", playerId);
};

/**
 * Extends the existing logic to extract playerId from an image URL and return PESDB link
 * @param {string} imageUrl
 * @returns {string|null}
 */
/**
 * Generates the URL for an announcement/news image
 * @param {string} imageUrl - The stored image URL/path
 * @returns {string}
 */
export const getAnnouncementImageUrl = (imageUrl) => {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  
  // Strictly use production domain even in local development
  const mainDomain = "https://thaipesleague.com";
  
  // If the path already contains "/uploads/", just ensure it uses the main domain
  if (imageUrl.includes("/uploads/")) {
    const cleanPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    return `${mainDomain}${cleanPath}`;
  }
  
  // If it's just a filename, default to the news upload directory
  const baseUploadPath = `${mainDomain}/uploads/news/`;
  const cleanPath = imageUrl.startsWith("/") ? imageUrl.substring(1) : imageUrl;
  
  return `${baseUploadPath}${cleanPath}`;
};

export const getPesdbLinkFromUrl = (imageUrl) => {
  if (!imageUrl) return null;
  const match = imageUrl.match(/(?:[bf])?(\d+)\.(?:png|webp)(?:\?.*)?$/i);
  return match ? getPesdbInfoUrl(match[1]) : null;
};

/**
 * Extracts player ID from a URL (PESDB or PESMaster format)
 * @param {string} url 
 * @returns {string|null}
 */
export const getPlayerIdFromUrl = (url) => {
  if (!url) return null;
  const match = url.match(/(?:player_|[bf])?(\d+)(?:_)?\.(?:png|webp)(?:\?.*)?$/i);
  return match ? match[1] : null;
};
