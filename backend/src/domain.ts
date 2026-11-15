import { AppError } from "./errors.js";
export const DAY = 86_400_000;
export interface Dimensions {
  length_cm: number;
  width_cm: number;
  draft_cm: number;
}
export function fits(
  boat: Dimensions,
  berth: { max_length_cm: number; max_width_cm: number; max_draft_cm: number },
) {
  return (
    boat.length_cm <= berth.max_length_cm &&
    boat.width_cm <= berth.max_width_cm &&
    boat.draft_cm <= berth.max_draft_cm
  );
}
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}
export function validatePeriod(start: Date, end: Date, now: Date) {
  const duration = end.getTime() - start.getTime();
  if (
    !Number.isFinite(duration) ||
    start < now ||
    duration < 3_600_000 ||
    duration > 30 * DAY
  )
    throw new AppError(
      422,
      "INVALID_PERIOD",
      "Rezerwacja musi zaczynać się w przyszłości i trwać od godziny do 30 dni.",
    );
}
export function price(start: Date, end: Date, rate: number) {
  if (end <= start || rate <= 0)
    throw new AppError(422, "INVALID_PRICE", "Nieprawidłowy okres lub stawka.");
  return Math.ceil((end.getTime() - start.getTime()) / DAY) * rate;
}
export function checkoutPrice(start: Date, end: Date, now: Date, rate: number) {
  return price(start, new Date(Math.max(end.getTime(), now.getTime())), rate);
}
export function requireTransition(actual: string, expected: string) {
  if (actual !== expected)
    throw new AppError(
      409,
      "INVALID_STATE",
      "Operacja niedostępna w obecnym stanie rezerwacji.",
    );
}
