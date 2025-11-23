import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getEnvContext } from "~/context";
import { authenticate, setUserContext } from "~/middleware/common";
import { positionRecords } from "~/features/positions/database/schema";
import { eq, inArray } from "drizzle-orm";
import type * as schema from "@/schema";

/**
 * Convert datetime string with wrong format to ISO 8601 format
 * 例如: "2025-11-03 12:36:46" -> "2025-11-03T12:36:46.000Z"
 */
function fixDateTimeString(dateTimeStr: string): string {
  // Match "YYYY-MM-DD HH:mm:ss" format
  const match = dateTimeStr.match(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
  );
  if (!match) {
    // If format is wrong, return original string or throw error
    return dateTimeStr;
  }

  const [, date, hour, minute, second] = match;
  // Convert to ISO 8601 format, set milliseconds to 0
  return `${date}T${hour}:${minute}:${second}.000Z`;
}

/**
 * Check if datetime string is in wrong format
 */
function isWrongFormat(dateTimeStr: string): boolean {
  // If contains space instead of T, and no milliseconds part, it is wrong format
  return /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(dateTimeStr);
}

/**
 * Get records to fix list
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  // Admin authentication
  const authResult = await authenticate(request, context);
  if (!authResult.success) {
    return Response.json(
      {
        success: false,
        error: authResult.error?.message ?? "Unauthorized",
        code: authResult.error?.code ?? "UNAUTHORIZED",
      },
      { status: 401 }
    );
  }

  if (authResult.user.role !== "admin") {
    return Response.json(
      {
        success: false,
        error: "Forbidden: Admin access required",
        code: "FORBIDDEN",
      },
      { status: 403 }
    );
  }

  setUserContext(context, authResult.user);

  const { db } = getEnvContext(context);

  try {
    // Query all position_records
    const allRecords = await db.select().from(positionRecords);

    // Find records to fix
    const recordsToFix = allRecords
      .filter((record) => isWrongFormat(record.createdAt))
      .map((record) => ({
        id: record.id,
        traderId: record.traderId,
        currentCreatedAt: record.createdAt,
        fixedCreatedAt: fixDateTimeString(record.createdAt),
      }));

    return Response.json({
      success: true,
      data: {
        totalRecords: allRecords.length,
        recordsToFix: recordsToFix.length,
        records: recordsToFix,
      },
    });
  } catch (error) {
    console.error("Failed to query position records:", error);
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to query position records",
        code: "QUERY_FAILED",
      },
      { status: 500 }
    );
  }
}

/**
 * Fix createdAt field in position_records
 */
export async function action({ request, context }: ActionFunctionArgs) {
  // Admin authentication
  const authResult = await authenticate(request, context);
  if (!authResult.success) {
    return Response.json(
      {
        success: false,
        error: authResult.error?.message ?? "Unauthorized",
        code: authResult.error?.code ?? "UNAUTHORIZED",
      },
      { status: 401 }
    );
  }

  if (authResult.user.role !== "admin") {
    return Response.json(
      {
        success: false,
        error: "Forbidden: Admin access required",
        code: "FORBIDDEN",
      },
      { status: 403 }
    );
  }

  setUserContext(context, authResult.user);

  const { db } = getEnvContext(context);

  // 只处理POST请求
  if (request.method !== "POST") {
    return Response.json(
      {
        success: false,
        error: "Method not allowed",
        code: "METHOD_NOT_ALLOWED",
      },
      { status: 405 }
    );
  }

  try {
    const body = (await request.json()) as {
      recordIds?: string[];
      fixAll?: boolean;
    };

    let recordsToFix: Array<{ id: string; createdAt: string }> = [];

    if (body.fixAll) {
      // Fix all records with wrong format
      const allRecords = await db.select().from(positionRecords);
      recordsToFix = allRecords
        .filter((record) => isWrongFormat(record.createdAt))
        .map((record) => ({
          id: record.id,
          createdAt: fixDateTimeString(record.createdAt),
        }));
    } else if (body.recordIds && Array.isArray(body.recordIds)) {
      // Fix specified records
      const records = await db
        .select()
        .from(positionRecords)
        .where(inArray(positionRecords.id, body.recordIds));
      recordsToFix = records
        .filter((record) => isWrongFormat(record.createdAt))
        .map((record) => ({
          id: record.id,
          createdAt: fixDateTimeString(record.createdAt),
        }));
    } else {
      return Response.json(
        {
          success: false,
          error: "Invalid request: either fixAll or recordIds must be provided",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Batch update records
    let fixedCount = 0;
    for (const record of recordsToFix) {
      await db
        .update(positionRecords)
        .set({
          createdAt: record.createdAt,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(positionRecords.id, record.id));
      fixedCount++;
    }

    return Response.json({
      success: true,
      data: {
        fixedCount,
        message: `Successfully fixed ${fixedCount} record(s)`,
      },
    });
  } catch (error) {
    console.error("Failed to fix position records:", error);
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fix position records",
        code: "FIX_FAILED",
      },
      { status: 500 }
    );
  }
}
