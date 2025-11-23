import { useQuery } from "@tanstack/react-query";

interface ConfigData {
  initialAccountBalance: number;
}

interface ConfigResponse {
  success: boolean;
  data: ConfigData;
}

async function fetchConfig(): Promise<ConfigData> {
  const response = await fetch("/api/v1/config");
  if (!response.ok) {
    throw new Error("Failed to fetch config");
  }
  const json: ConfigResponse = await response.json();
  return json.data;
}

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
    staleTime: Infinity, // Config doesn't change during session
  });
}
