import { API_BASE_URL } from "../api/axiosInstance";

/**
 * Central configuration for external image assets and links
 */
export const IMAGE_BASE_URLS = {
  // Player Face Images (PESMaster)
  FACE_PNG: "https://www.pesmaster.com/pes-2021/graphics/players/player_{id}.png",
  FACE_WEBP: "https://www.pesmaster.com/efootball-2022/graphics/players/{id}_.webp",
  
  // Player Card Images (PESDB)
  CARD: "https://pesdb.net/assets/img/card/b{id}.png",
  
  // Link to PESDB database
  PESDB_INFO: "https://pesdb.net/efootball/?id={id}"
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
 * Generates the URL for a player's face image
 * @param {number|string} playerId - The player's ID
 * @param {string} format - 'png' or 'webp'
 * @returns {string}
 */
export const getPlayerFaceUrl = (playerId, format = "png") => {
  if (format === "webp") {
      return IMAGE_BASE_URLS.FACE_WEBP.replace("{id}", playerId);
  }
  return IMAGE_BASE_URLS.FACE_PNG.replace("{id}", playerId);
};

/**
 * Generates the URL for a player's card image
 * @param {number|string} playerId - The player's ID
 * @returns {string}
 */
export const getPlayerCardUrl = (playerId) => {
  if (!playerId) return "";
  return IMAGE_BASE_URLS.CARD.replace("{id}", playerId);
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
export const getPesdbLinkFromUrl = (imageUrl) => {
  if (!imageUrl) return null;
  const match = imageUrl.match(/(\d+)\.png/);
  return match ? getPesdbInfoUrl(match[1]) : null;
};
