export interface User {
  id: string;
  name: string;
  email: string;
  role: "SAILOR" | "STAFF" | "ADMIN";
  active: boolean;
}
export interface Row {
  [key: string]: any;
  id: string;
}
export interface Page {
  data: Row[];
  total: number;
  page: number;
  limit: number;
}
let csrf = "";
export function setCsrf(token: string) {
  csrf = token;
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(!["GET", "HEAD"].includes(method) ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 204) return undefined as T;
  const data = await response
    .json()
    .catch(() => ({
      error: { message: "Serwer zwrócił niepoprawną odpowiedź." },
    }));
  if (!response.ok) {
    const details = data.error?.details
      ?.map(
        (d: { field: string; message: string }) => `${d.field}: ${d.message}`,
      )
      .join(" ");
    throw new Error(
      details || data.error?.message || "Nie udało się wykonać operacji.",
    );
  }
  return data as T;
}
export const money = (cents: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(
    cents / 100,
  );
export const date = (value: string) =>
  new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export const names: Record<string, string> = {
  SAILOR: "Żeglarz",
  STAFF: "Obsługa portu",
  ADMIN: "Administrator",
  CONFIRMED: "Potwierdzona",
  CHECKED_IN: "W porcie",
  COMPLETED: "Zakończona",
  CANCELLED: "Anulowana",
  AVAILABLE: "Otwarte",
  CLOSED: "Zamknięte",
  OPEN: "Nowa",
  IN_PROGRESS: "W naprawie",
  RESOLVED: "Rozwiązana",
  MINOR: "Drobna",
  CRITICAL: "Krytyczna",
};
