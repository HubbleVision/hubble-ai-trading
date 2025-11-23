import type { Route } from "./+types/orders.import";
import { getEnvContext } from "~/context";
import { importOrders } from "~/features/order/api/handlers";
import { z } from "zod";
import { insertOrderSchema } from "@/schema";

const importOrdersSchema = z.object({
  traderId: z.string().min(1, "Trader ID is required"),
  orders: z.array(insertOrderSchema).min(1, "At least one order is required"),
});

/**
 * POST /api/v1/orders/import
 * Batch import orders from exchange API
 */
export async function action({ request, context }: Route.ActionArgs) {
  const { db } = getEnvContext(context);

  try {
    const body = await request.json();

    // Validate input
    const validation = importOrdersSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        {
          success: false,
          error: "Invalid import data",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    // Transform data to ensure null values are converted to undefined
    const importData = {
      traderId: validation.data.traderId,
      orders: validation.data.orders.map(order => ({
        ...order,
        clientOrderId: order.clientOrderId ?? undefined,
        timeInForce: order.timeInForce ?? undefined,
        avgPrice: order.avgPrice ?? undefined,
        stopPrice: order.stopPrice ?? undefined,
        activatePrice: order.activatePrice ?? undefined,
        priceRate: order.priceRate ?? undefined,
        executedQty: order.executedQty ?? undefined,
        cumQuote: order.cumQuote ?? undefined,
        reduceOnly: order.reduceOnly ?? undefined,
        closePosition: order.closePosition ?? undefined,
        priceProtect: order.priceProtect ?? undefined,
        workingType: order.workingType ?? undefined,
        origType: order.origType ?? undefined,
        time: order.time ?? undefined,
        updateTime: order.updateTime ?? undefined,
        createdAt: order.createdAt ?? undefined,
        updatedAt: order.updatedAt ?? undefined,
      })),
    };

    const result = await importOrders(db, importData);

    return Response.json({
      success: true,
      data: result,
      message: `Imported ${result.imported} orders, skipped ${result.skipped} duplicates`,
    });
  } catch (error) {
    console.error("Error importing orders:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to import orders",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
