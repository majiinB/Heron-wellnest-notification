/**
 * Wraps an asynchronous Express middleware or route handler, forwarding any rejected promises to the next error handler.
 *
 * @param fn - The asynchronous middleware or route handler function to wrap.
 * @returns A function compatible with Express middleware signature that handles promise rejections.
 *
 * @example
 * router.get('/route', asyncHandler(async (req, res, next) => {
 *   // Your async code here
 * }));
 */

import type { Response, NextFunction} from "express";
import type { AuthenticatedRequest } from "../interface/authRequest.interface.js";

export const asyncHandler = (
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    void fn(req, res, next).catch(next);
  };
};
