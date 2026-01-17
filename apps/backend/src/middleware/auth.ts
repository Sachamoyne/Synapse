import { Request, Response, NextFunction } from "express";

/**
 * Middleware to verify backend API key from header.
 * In dev, if BACKEND_API_KEY is not set, allows all requests with warning.
 */
export function requireBackendKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const expectedKey = process.env.BACKEND_API_KEY;

  // In dev, if no key is configured, allow with warning
  if (!expectedKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[BACKEND AUTH] WARNING: BACKEND_API_KEY not set. Allowing request in dev mode."
      );
      next();
      return;
    } else {
      console.error("[BACKEND AUTH] ERROR: BACKEND_API_KEY not set in production!");
      res.status(500).json({
        error: "Server configuration error",
        details: "Backend API key is not configured",
      });
      return;
    }
  }

  // In production or when key is set, require it
  const providedKey = req.header("x-soma-backend-key");

  if (!providedKey || providedKey !== expectedKey) {
    console.warn("[BACKEND AUTH] Invalid or missing API key");
    res.status(401).json({
      error: "Unauthorized",
      details: "Invalid or missing backend API key",
    });
    return;
  }

  next();
}
