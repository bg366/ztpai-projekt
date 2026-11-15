export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function requireValue<T>(
  value: T | undefined | null,
  message = "Nie znaleziono zasobu.",
): T {
  if (value == null) throw new AppError(404, "NOT_FOUND", message);
  return value;
}
