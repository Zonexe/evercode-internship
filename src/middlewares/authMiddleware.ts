import { RequestHandler } from "express";
import crypto from "crypto";

/**
 * Создает middleware для авторизации
 * @param expectedToken  <= Ожидаемый 64-значный токен)
 */
export function createAuthMiddleware(expectedToken: string): RequestHandler {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res
        .status(403)
        .json({ error: "Forbidden: Missing Authorization header" });
      return;
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer" || parts[1].trim() === "") {
      res
        .status(403)
        .json({ error: "Forbidden: Invalid Authorization header format" });
      return;
    }

    const providedToken = parts[1];

    const expectedHash = crypto
      .createHash("sha256")
      .update(expectedToken)
      .digest();
    const providedHash = crypto
      .createHash("sha256")
      .update(providedToken)
      .digest();

    const isTokenValid = crypto.timingSafeEqual(expectedHash, providedHash);

    if (!isTokenValid) {
      res.status(403).json({ error: "Forbidden: Invalid API token" });
      return;
    }

    next();
  };
}
