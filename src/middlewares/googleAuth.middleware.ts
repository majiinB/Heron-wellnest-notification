import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../interface/authRequest.interface.js";
import { AppError } from "../types/appError.type.js";
import { verifyPubSubJwt } from "../utils/jwt.util.js";
import { env } from "../config/env.config.js";

export async function googleAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader: string | undefined = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        401,
        "PUBSUB_NO_TOKEN",
        "No token provided",
        true
      );
    }

    const token: string = authHeader.split(" ")[1];

    await verifyPubSubJwt(token, env.PUBSUB_AUDIENCE, env.PUBSUB_SERVICE_ACCOUNT_EMAIL);

    next();
  } catch (error) {
    next(error);
  }
}
