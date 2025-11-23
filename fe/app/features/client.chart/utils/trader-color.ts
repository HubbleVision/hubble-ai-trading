import { TRADER_COLORS } from "../constants";

// Hard match color configuration
const HARD_MATCH_COLORS: Record<string, string> = {
  deepseek: "#4D6BFE",
  openai: "#004331",
  gemini: "#00A4EF",
};

/**
 * Check if trader name or description matches hard match rules
 */
function getHardMatchColor(
  traderName: string,
  description?: string | null
): string | null {
  const searchText = `${traderName} ${description || ""}`.toLowerCase();

  if (searchText.includes("deepseek")) {
    return HARD_MATCH_COLORS.deepseek;
  }
  if (searchText.includes("openai")) {
    return HARD_MATCH_COLORS.openai;
  }
  if (searchText.includes("gemini")) {
    return HARD_MATCH_COLORS.gemini;
  }

  return null;
}

/**
 * Get corresponding color based on traderId
 * Ensures the same traderId always gets the same color (based on sorted index)
 * Prioritizes hard match rules (if trader name or description contains specific keywords)
 * 
 * @param traderId - Unique identifier of the trader
 * @param allTraderIds - List of all trader IDs to determine sorted index (optional, if provided then based on sort; otherwise based on hash)
 * @param traderName - Trader name for hard matching (optional)
 * @param description - Trader description for hard matching (optional)
 * @returns Corresponding color value
 */
export function getTraderColor(
  traderId: string,
  allTraderIds?: string[],
  traderName?: string,
  description?: string | null
): string {
  // Priority: check hard match rules
  if (traderName) {
    const hardMatchColor = getHardMatchColor(traderName, description);
    if (hardMatchColor) {
      return hardMatchColor;
    }
  }

  // If no hard match, use original logic
  let index: number;

  if (allTraderIds && allTraderIds.length > 0) {
    // If all traderIds are provided, determine color based on sorted index
    // This ensures consistency with color assignment in charts
    const sortedTraderIds = [...allTraderIds].sort();
    index = sortedTraderIds.indexOf(traderId);
    
    if (index === -1) {
      // If traderId is not in the list, use hash as fallback
      index = hashTraderId(traderId);
    }
  } else {
    // If all traderIds are not provided, use simple hash function to ensure consistency
    index = hashTraderId(traderId);
  }

  return TRADER_COLORS[index % TRADER_COLORS.length];
}

/**
 * Simple hash function to convert traderId to numeric index
 * Ensures the same traderId always gets the same index
 */
function hashTraderId(traderId: string): number {
  let hash = 0;
  for (let i = 0; i < traderId.length; i++) {
    const char = traderId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get trader background color (for UI background, usually needs a lighter version)
 * Convert original color to rgba format, add opacity as background
 * 
 * @param traderId - Unique identifier of the trader
 * @param allTraderIds - List of all trader IDs (optional)
 * @param traderName - Trader name for hard matching (optional)
 * @param description - Trader description for hard matching (optional)
 * @param opacity - Opacity, default 0.1
 * @returns Color value in rgba format
 */
export function getTraderBackgroundColor(
  traderId: string,
  allTraderIds?: string[],
  traderName?: string,
  description?: string | null,
  opacity: number = 0.1
): string {
  const color = getTraderColor(traderId, allTraderIds, traderName, description);
  
  // Convert hex color to rgb
  const hex = color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

