import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../interface/authRequest.interface.js";
import type { NotificationService } from "../services/notification.service.js";
import type { ApiResponse } from "../types/apiResponse.type.js";
import { AppError } from "../types/appError.type.js";
import { validateUser } from "../utils/authorization.util.js";
import { validate as isUuid } from "uuid";
import type { Notification } from "../models/notification.model.js";
import { logger } from "../utils/logger.util.js";

const VALID_TYPES: Notification["type"][] = ["activities", "reminders", "guidance_session", "system_alerts"];

type PubSubMessageEnvelope = {
  message?: {
    data?: string;
    messageId?: string;
    attributes?: Record<string, string>;
    publishTime?: string;
  };
  subscription?: string;
};

type NotificationPubSubPayload = {
  userId: string;
  type: Notification["type"];
  title: string;
  content: string;
  sendEmail?: boolean;
  sendInApp?: boolean;
  data?: Record<string, unknown>;
};

/**
 * Controller class for handling Notification-related HTTP requests.
 *
 * @description Provides methods to create, retrieve, update, and delete notifications.
 * Interacts with the `NotificationService` to perform business logic and data manipulation.
 * Each method corresponds to an endpoint and is responsible for validating input, invoking
 * service methods, and formatting responses.
 *
 * @remarks
 * - Notification creation is restricted to internal/PubSub callers via Google OIDC auth.
 * - All user-facing endpoints require a valid Heron Wellnest access token.
 * - Responses are standardized using the `ApiResponse` type.
 *
 * @file notification.controller.ts
 *
 * @author Arthur M. Artugue
 * @created 2026-03-01
 * @updated 2026-03-01
 */
export class NotificationController {
  private notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
  }

  /**
   * Handles creation of a notification.
   * FOR INTERNAL / PUBSUB USE ONLY — protected by Google OIDC middleware.
   *
   * Expects a Google Pub/Sub push message envelope in the request body.
   * The controller will decode the base64 `message.data` field, parse the
   * JSON payload, validate it, and then create a notification.
   *
   * @param req - The request containing the Pub/Sub message envelope.
   * @param res - The response object.
   * @param _next - The next middleware function (unused).
   * @throws {AppError} If required fields are missing or invalid.
   */
  public async handleNotificationCreation(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    const envelope = req.body as PubSubMessageEnvelope;
    const ackInvalidMessage = (reason: string, details?: Record<string, unknown>): void => {
      logger.warn("[NotificationController] Dropping non-retryable Pub/Sub message", {
        reason,
        ...(details ?? {}),
      });

      // Ack invalid payloads so Pub/Sub does not retry indefinitely.
      res.status(204).send();
    };

    if (!envelope || !envelope.message) {
      ackInvalidMessage("Invalid Pub/Sub message format", { body: req.body });
      return;
    }

    if (!envelope.message.data) {
      ackInvalidMessage("No data field in Pub/Sub message", {
        messageId: envelope.message.messageId,
      });
      return;
    }

    let decoded: string;
    try {
      decoded = Buffer.from(envelope.message.data, "base64").toString("utf-8");
    } catch (error) {
      ackInvalidMessage("Unable to decode Pub/Sub message data", {
        messageId: envelope.message.messageId,
        error,
      });
      return;
    }

    let payload: NotificationPubSubPayload;
    try {
      payload = JSON.parse(decoded) as NotificationPubSubPayload;
    } catch (error) {
      ackInvalidMessage("Invalid JSON in Pub/Sub message data", {
        messageId: envelope.message.messageId,
        decoded,
        error,
      });
      return;
    }

    const { userId, type, title, content, data } = payload;

    if (!userId || userId.toString().trim() === "") {
      ackInvalidMessage("userId is required", { payload });
      return;
    }

    if (!isUuid(userId.toString())) {
      ackInvalidMessage("Invalid userId format", { userId });
      return;
    }

    if (!type || !VALID_TYPES.includes(type)) {
      ackInvalidMessage(`type must be one of ${VALID_TYPES.join(", ")}`, { type });
      return;
    }

    const trimmedTitle = title?.toString().trim();
    if (!trimmedTitle) {
      ackInvalidMessage("title is required", { title });
      return;
    }

    const trimmedContent = content?.toString().trim();
    if (!trimmedContent) {
      ackInvalidMessage("content is required", { content });
      return;
    }

    if (payload.sendInApp !== undefined && typeof payload.sendInApp !== "boolean") {
      ackInvalidMessage("sendInApp must be a boolean", { sendInApp: payload.sendInApp });
      return;
    }

    const sendInApp = payload.sendInApp ?? true;

    if(sendInApp) {
      await this.notificationService.createNotification(userId, type, trimmedTitle, trimmedContent, data);
    }

    const sendEmail = payload.sendEmail ?? false;
    if (sendEmail) {
      try {
        await this.notificationService.sendSmtpEmail(userId, trimmedTitle, trimmedContent);
      } catch (error) {
        logger.error("Failed to send notification email", {
          userId,
          title: trimmedTitle,
          content: trimmedContent,
          error: (error as Error).message,
        });
        // Do not fail the entire request if email sending fails; the notification was still created.
      }
    }
  

    const response: ApiResponse = {
      success: true,
      code: "NOTIFICATION_CREATED",
      message: "Notification created successfully",
    };

    res.status(201).json(response);
  }

  /**
   * Handles retrieval of paginated notifications for the authenticated user.
   *
   * Supports cursor-based pagination via `limit` and `lastNotificationId` query parameters.
   *
   * @param req - The authenticated request.
   * @param res - The response object.
   * @param _next - The next middleware function (unused).
   * @throws {AppError} If user validation fails.
   */
  public async handleGetNotifications(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    const userId = req.user?.sub;

    validateUser(userId);
    const limitParam = req.query.limit as string | undefined;
    const lastNotificationId = req.query.lastNotificationId as string | undefined;

    let limit = 20;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
        limit = parsed;
      }
    }

    const result = await this.notificationService.getNotificationsByUser(userId!, limit, lastNotificationId);

    const response: ApiResponse = {
      success: true,
      code: "NOTIFICATIONS_RETRIEVED",
      message: "Notifications retrieved successfully",
      data: result,
    };

    res.status(200).json(response);
  }

  /**
   * Handles retrieval of all unread notifications for the authenticated user.
   *
   * @param req - The authenticated request.
   * @param res - The response object.
   * @param _next - The next middleware function (unused).
   * @throws {AppError} If user validation fails.
   */
  public async handleGetUnreadNotifications(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    const userId = req.user?.sub;

    validateUser(userId);

    const notifications = await this.notificationService.getUnreadNotifications(userId!);

    const response: ApiResponse = {
      success: true,
      code: "UNREAD_NOTIFICATIONS_RETRIEVED",
      message: "Unread notifications retrieved successfully",
      data: notifications,
    };

    res.status(200).json(response);
  }

  /**
   * Handles retrieval of the unread notification count for the authenticated user.
   *
   * @param req - The authenticated request.
   * @param res - The response object.
   * @param _next - The next middleware function (unused).
   * @throws {AppError} If user validation fails.
   */
  public async handleGetUnreadCount(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    const userId = req.user?.sub;

    validateUser(userId);

    const count = await this.notificationService.getUnreadCount(userId!);

    const response: ApiResponse = {
      success: true,
      code: "UNREAD_COUNT_RETRIEVED",
      message: "Unread notification count retrieved successfully",
      data: { count },
    };

    res.status(200).json(response);
  }

  /**
   * Handles marking a single notification as read for the authenticated user.
   *
   * @param req - The authenticated request containing the notification ID in route params.
   * @param res - The response object.
   * @param _next - The next middleware function (unused).
   * @throws {AppError} If user validation fails or the notification ID is invalid/missing.
   */
  public async handleMarkAsRead(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    const userId = req.user?.sub;

    validateUser(userId);

    const notificationId = req.params.notificationId as string;

    if (!notificationId) {
      throw new AppError(400, "BAD_REQUEST", "Bad Request: notificationId is required", true);
    }

    if (!isUuid(notificationId)) {
      throw new AppError(400, "BAD_REQUEST", "Bad Request: Invalid notificationId format", true);
    }

    await this.notificationService.markAsRead(userId!, notificationId);

    const response: ApiResponse = {
      success: true,
      code: "NOTIFICATION_MARKED_AS_READ",
      message: "Notification marked as read",
    };

    res.status(200).json(response);
  }

  /**
   * Handles marking all notifications as read for the authenticated user.
   *
   * @param req - The authenticated request.
   * @param res - The response object.
   * @param _next - The next middleware function (unused).
   * @throws {AppError} If user validation fails.
   */
  public async handleMarkAllAsRead(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    const userId = req.user?.sub;

    validateUser(userId);

    await this.notificationService.markAllAsRead(userId!);

    const response: ApiResponse = {
      success: true,
      code: "ALL_NOTIFICATIONS_MARKED_AS_READ",
      message: "All notifications marked as read",
    };

    res.status(200).json(response);
  }

  /**
   * Handles soft deletion of a notification for the authenticated user.
   *
   * @param req - The authenticated request containing the notification ID in route params.
   * @param res - The response object.
   * @param _next - The next middleware function (unused).
   * @throws {AppError} If user validation fails or the notification ID is invalid/missing.
   */
  public async handleDeleteNotification(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    const userId = req.user?.sub;

    validateUser(userId);

    const notificationId = req.params.notificationId as string;

    if (!notificationId) {
      throw new AppError(400, "BAD_REQUEST", "Bad Request: notificationId is required", true);
    }

    if (!isUuid(notificationId)) {
      throw new AppError(400, "BAD_REQUEST", "Bad Request: Invalid notificationId format", true);
    }

    await this.notificationService.deleteNotification(userId!, notificationId);

    const response: ApiResponse = {
      success: true,
      code: "NOTIFICATION_DELETED",
      message: "Notification deleted successfully",
    };

    res.status(200).json(response);
  }
}
