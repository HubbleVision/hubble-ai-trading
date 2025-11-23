import type { Route } from "./+types/orders.latest";
import { getEnvContext } from "~/context";
import { getLatestOrders } from "~/features/order/api/handlers";

/**
 * GET /api/v1/orders/latest
 *
 * Get latest orders, sorted by time from newest to oldest
 *
 * Query Parameters:
 * - traderId: string (optional) - Filter latest orders for specific trader
 * - limit: number (optional, default: 20, max: 100) - Number of orders to return
 *
 * Response:
 * {
 *   success: true,
 *   data: Order[]
 * }
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = getEnvContext(context);
  const url = new URL(request.url);

  // Parse query parameters
  const traderId = url.searchParams.get("traderId") || undefined;
  const limitParam = url.searchParams.get("limit");
  let limit = 20;

  if (limitParam) {
    const parsedLimit = Number(limitParam);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return Response.json(
        {
          success: false,
          error: "Invalid limit parameter",
        },
        { status: 400 }
      );
    }
    limit = Math.min(parsedLimit, 100); // Max 100
  }

  try {
    const orders = await getLatestOrders(db, { traderId, limit });

    return Response.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching latest orders:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to fetch latest orders",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
