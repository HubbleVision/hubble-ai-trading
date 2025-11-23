export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `/api/v1/${endpoint}`;

  // Check if there's FormData, if so don't set Content-Type
  const isFormData = options.body instanceof FormData;

  const config: RequestInit = {
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data: ApiResponse<T> = await response.json();

    if (!response.ok || !data.success) {
      throw new ApiError(
        response.status,
        data.code || "UNKNOWN_ERROR",
        data.error || "Request failed"
      );
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      0,
      "NETWORK_ERROR",
      error instanceof Error ? error.message : "Network connection failed"
    );
  }
}

export function apiGet<T = any>(
  endpoint: string,
  options?: RequestInit & { disableCache?: boolean }
): Promise<T> {
  const { disableCache, ...fetchOptions } = options || {};

  return apiRequest<T>(endpoint, {
    method: "GET",
    ...(disableCache ? { cache: "no-store" } : {}),
    ...fetchOptions,
  });
}

export function apiPost<T = any>(endpoint: string, data?: any): Promise<T> {
  // If it's FormData, don't set Content-Type to let browser automatically set boundary
  if (data instanceof FormData) {
    return apiRequest<T>(endpoint, {
      method: "POST",
      body: data,
      headers: {
        // Don't set Content-Type, let browser handle FormData automatically
      },
    });
  }

  return apiRequest<T>(endpoint, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

export function apiPut<T = any>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

export function apiDelete<T = any>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "DELETE",
    body: data ? JSON.stringify(data) : undefined,
  });
}
