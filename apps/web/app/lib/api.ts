import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" }
});

export async function request<T>(path: string, config?: Parameters<typeof api.request>[0]) {
  const response = await api.request<T>({ url: path, ...config });
  return response.data;
}

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) return error.response?.data?.message ?? error.message;
  return error instanceof Error ? error.message : "Something went wrong";
}