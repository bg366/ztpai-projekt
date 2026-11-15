import type { RequestHandler, ErrorRequestHandler } from "express";
import type { Pool } from "pg";
import { ZodError } from "zod";
import { AppError } from "./errors.js";
import { AuthRepository } from "./repositories/auth.js";
import { tokenHash } from "./services/auth.js";
import type { Role } from "./types.js";
export function authenticate(pool: Pool, now: () => Date): RequestHandler {
  return async (req, _res, next) => {
    const token = req.cookies?.mazurport_session;
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
      throw new AppError(
        401,
        "UNAUTHENTICATED",
        "Zaloguj się, aby kontynuować.",
      );
    const session = await new AuthRepository(pool).findSession(
      tokenHash(token),
      now(),
    );
    if (!session)
      throw new AppError(
        401,
        "UNAUTHENTICATED",
        "Sesja wygasła. Zaloguj się ponownie.",
      );
    req.auth = {
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        active: session.active,
      },
      sessionId: session.session_id,
      csrfToken: session.csrf_token,
    };
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.header("x-csrf-token") !== session.csrf_token
    )
      throw new AppError(403, "CSRF", "Odśwież stronę i ponów operację.");
    next();
  };
}
export const roles =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth || !allowed.includes(req.auth.user.role))
      throw new AppError(403, "FORBIDDEN", "Brak uprawnień do tej operacji.");
    next();
  };
export const errors: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res
      .status(422)
      .json({
        error: {
          code: "VALIDATION",
          message: "Sprawdź dane formularza.",
          details: error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
      });
    return;
  }
  if (error instanceof AppError) {
    res
      .status(error.status)
      .json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error.code === "23P01" || error.code === "23505") {
    res
      .status(409)
      .json({
        error: {
          code: "CONFLICT",
          message:
            error.code === "23P01"
              ? "Wybrany termin jest już zajęty."
              : "Rekord o tych danych już istnieje lub miejsce jest zajęte.",
        },
      });
    return;
  }
  if (error.type === "entity.parse.failed") {
    res
      .status(400)
      .json({
        error: { code: "INVALID_JSON", message: "Nieprawidłowy JSON." },
      });
    return;
  }
  if (error.type === "entity.too.large") {
    res
      .status(413)
      .json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Przesłane dane są zbyt duże.",
        },
      });
    return;
  }
  console.error("Nieobsłużony błąd:", error.message);
  res
    .status(500)
    .json({
      error: { code: "INTERNAL_ERROR", message: "Wystąpił błąd serwera." },
    });
};
