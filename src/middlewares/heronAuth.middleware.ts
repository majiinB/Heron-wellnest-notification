import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../interface/authRequest.interface.js";
import { AppError } from "../types/appError.type.js";
import { verifyToken } from "../utils/jwt.util.js";
import type { AccessTokenClaims } from "../types/accessTokenClaim.type.js";

export async function heronAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader : string | undefined = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        401, 
        "AUTH_NO_TOKEN", 
        "No token provided", 
        true
      );
    }

    const token: string = authHeader.split(" ")[1];
    
    const payload : AccessTokenClaims = await verifyToken(token);

    // Attach user info to request object
    req.user = {
      email: payload.email!,
      name: payload.name!,
      sub: payload.sub!,
      role: payload.role!,
    };

    next();
  } catch (error) {
    next(error);
  }
}