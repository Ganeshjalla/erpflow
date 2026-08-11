import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { ApiError } from "../utils/ApiError";

export function authenticateJWT(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or invalid Authorization header"));
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyToken(token);
    req.user = payload;
    return next();
  } catch (err) {
    return next(ApiError.unauthorized("Invalid or expired token"));
  }
}

export function authorizeRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    return next();
  };
}
