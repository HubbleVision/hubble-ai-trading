import * as React from "react";
import DeepSeekIcon from "~/svg/deepseek";
import OpenAIIcon from "~/svg/openai";
import GoogleGeminiIcon from "~/svg/googlegemini";
import { TRADER_ICONS } from "../constants";

/**
 * Check if trader name or description matches hard match rules, returns corresponding icon component
 */
export function getTraderIconComponent(
  traderName: string,
  description?: string | null
): React.ComponentType<React.SVGProps<SVGSVGElement>> | null {
  const searchText = `${traderName} ${description || ""}`.toLowerCase();

  if (searchText.includes("deepseek")) {
    return DeepSeekIcon;
  }
  if (searchText.includes("openai")) {
    return OpenAIIcon;
  }
  if (searchText.includes("gemini")) {
    return GoogleGeminiIcon;
  }

  return null;
}

/**
 * Get trader icon (hard match or default icon path)
 */
export function getTraderIcon(
  traderName: string,
  traderIndex: number,
  description?: string | null
): {
  type: "component" | "path";
  component?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  d?: string;
} {
  const hardMatchComponent = getTraderIconComponent(traderName, description);
  if (hardMatchComponent) {
    return {
      type: "component",
      component: hardMatchComponent,
    };
  }

  // Use default icon
  const defaultIcon = TRADER_ICONS[(traderIndex - 1) % TRADER_ICONS.length];
  return {
    type: "path",
    d: defaultIcon.d,
  };
}


