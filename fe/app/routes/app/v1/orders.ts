import type { Route } from "./+types/orders";
import { getEnvContext } from "~/context";
import { getOrders } from "~/features/order/api/handlers";
import { getOrdersQuerySchema } from "@/schema";

/**
 * GET /api/v1/orders
 *
 * Get paginated historical orders, sorted by time from newest to oldest
 *
 * Query Parameters:
 * - traderId: string (optional) - Filter by specific trader
 * - symbol: string (optional) - Filter by specific trading pair
 * - side: "BUY" | "SELL" (optional) - Filter by buy/sell direction
 * - status: OrderStatus (optional) - Filter by order status
 * - startTime: number (optional) - Start timestamp (milliseconds)
 * - endTime: number (optional) - End timestamp (milliseconds)
 * - limit: number (optional, default: 50, max: 1000) - Number per page
 * - offset: number (optional, default: 0) - Pagination offset
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     orders: Order[],
 *     total: number,
 *     limit: number,
 *     offset: number
 *   }
 * }
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = getEnvContext(context);
  const url = new URL(request.url);

  // Parse query parameters
  const params = {
    traderId: url.searchParams.get("traderId") || undefined,
    symbol: url.searchParams.get("symbol") || undefined,
    side: url.searchParams.get("side") || undefined,
    status: url.searchParams.get("status") || undefined,
    startTime: url.searchParams.get("startTime")
      ? Number(url.searchParams.get("startTime"))
      : undefined,
    endTime: url.searchParams.get("endTime")
      ? Number(url.searchParams.get("endTime"))
      : undefined,
    limit: url.searchParams.get("limit")
      ? Number(url.searchParams.get("limit"))
      : 50,
    offset: url.searchParams.get("offset")
      ? Number(url.searchParams.get("offset"))
      : 0,
  };

  // Validate query parameters
  const validation = getOrdersQuerySchema.safeParse(params);
  if (!validation.success) {
    return Response.json(
      {
        success: false,
        error: "Invalid query parameters",
        details: validation.error.issues,
      },
      { status: 400 }
    );
  }

  try {
    const result = await getOrders(db, validation.data);
    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to fetch orders",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
