import type { Route } from "./+types/position-fix";
import { useState } from "react";
import { adminAuthMiddleware } from "~/middleware/admin-auth";
import { getEnvContext } from "~/context";
import { positionRecords } from "~/features/positions/database/schema";
import {
  useRecordsToFix,
  useFixAllRecords,
  useFixSelectedRecords,
  type RecordToFix,
} from "~/features/positions/hooks/use-fix-datetime";

export const middleware = [adminAuthMiddleware];

function isWrongFormat(dateTimeStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(dateTimeStr);
}

function fixDateTimeString(dateTimeStr: string): string {
  const match = dateTimeStr.match(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
  );
  if (!match) {
    return dateTimeStr;
  }
  const [, date, hour, minute, second] = match;
  return `${date}T${hour}:${minute}:${second}.000Z`;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = getEnvContext(context);

  const allRecords = await db.select().from(positionRecords);

  const recordsToFix = allRecords
    .filter((record) => isWrongFormat(record.createdAt))
    .map((record) => ({
      id: record.id,
      traderId: record.traderId,
      currentCreatedAt: record.createdAt,
      fixedCreatedAt: fixDateTimeString(record.createdAt),
    }));

  return {
    totalRecords: allRecords.length,
    recordsToFix: recordsToFix.length,
    records: recordsToFix,
  };
}

export default function AdminPositionFix({ loaderData }: Route.ComponentProps) {
  // Use loaderData as initial value, but prioritize React Query data
  const { data: queryData, isLoading: isQueryLoading } = useRecordsToFix();
  const fixAllMutation = useFixAllRecords();
  const fixSelectedMutation = useFixSelectedRecords();

  // Use query data or loader data
  const data = queryData || {
    totalRecords: loaderData.totalRecords,
    recordsToFix: loaderData.recordsToFix,
    records: loaderData.records,
  };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isLoading =
    isQueryLoading || fixAllMutation.isPending || fixSelectedMutation.isPending;

  const handleFixAll = async () => {
    if (
      !confirm(`Are you sure you want to fix all ${data.recordsToFix} records?`)
    ) {
      return;
    }

    fixAllMutation.mutate(undefined, {
      onSuccess: (data) => {
        alert(`✅ ${data?.message || "Fix success"}`);
      },
      onError: (error) => {
        alert(
          `❌ Fix failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      },
    });
  };

  const handleFixSelected = async () => {
    if (selectedIds.size === 0) {
      alert("Please select at least one record");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to fix selected ${selectedIds.size} records?`
      )
    ) {
      return;
    }

    fixSelectedMutation.mutate(Array.from(selectedIds), {
      onSuccess: (data) => {
        alert(`✅ ${data?.message || "Fix success"}`);
        setSelectedIds(new Set()); // 清空选中
      },
      onError: (error) => {
        alert(
          `❌ Fix failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      },
    });
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === data.records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.records.map((r) => r.id)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4">
            Fix Position Records datetime format
          </h1>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Total records:</strong>
              {data.totalRecords}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Need to fix:</strong>
              <span className="text-orange-600 font-semibold">
                {data.recordsToFix}
              </span>
            </p>
          </div>

          {fixAllMutation.isError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">
                ❌ Fix failed:{" "}
                {fixAllMutation.error instanceof Error
                  ? fixAllMutation.error.message
                  : "Unknown error"}
              </p>
            </div>
          )}

          {fixSelectedMutation.isError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">
                ❌ Fix failed:{" "}
                {fixSelectedMutation.error instanceof Error
                  ? fixSelectedMutation.error.message
                  : "Unknown error"}
              </p>
            </div>
          )}

          {data.recordsToFix === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>✅ All records' datetime format are correct!</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex gap-2">
                <button
                  onClick={handleFixAll}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Fix all ({data.recordsToFix})
                </button>
                <button
                  onClick={handleFixSelected}
                  disabled={isLoading || selectedIds.size === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Fix selected ({selectedIds.size})
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={
                            selectedIds.size === data.records.length &&
                            data.records.length > 0
                          }
                          onChange={handleSelectAll}
                          className="cursor-pointer"
                        />
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left">
                        ID
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left">
                        Trader ID
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left">
                        Current format
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left">
                        Fixed format
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(record.id)}
                            onChange={() => handleToggleSelect(record.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2 font-mono text-xs">
                          {record.id.slice(0, 8)}...
                        </td>
                        <td className="border border-gray-300 px-4 py-2 font-mono text-xs">
                          {record.traderId.slice(0, 8)}...
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-red-600 font-mono text-sm">
                          {record.currentCreatedAt}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-green-600 font-mono text-sm">
                          {record.fixedCreatedAt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
