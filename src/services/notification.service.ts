import { Notification } from "../models/notification.model.js";
import { NotificationRepository } from "../repository/notification.repository.js";
import { AppError } from "../types/appError.type.js";
import { logger } from "../utils/logger.util.js";

export type PaginatedNotifications = {
  notifications: Notification[];
  hasMore: boolean;
  nextCursor?: string;
};

/**
 * Service class for managing Notification entities.
 *
 * @description Provides methods to create, retrieve, update, and delete notifications.
 * Acts as the business logic layer between controllers and the repository.
 *
 * @remarks
 * - Soft deletes are used for user-facing deletion to preserve data integrity.
 * - Hard deletes are reserved for administrative or cleanup operations.
 * - Pagination is cursor-based using `notification_id` as the cursor.
 *
 * @example
 * ```typescript
 * const service = new NotificationService(new NotificationRepository());
 * await service.createNotification(userId, "system_alerts", "Welcome", "Your account is ready.");
 * const { notifications, hasMore } = await service.getNotificationsByUser(userId);
 * ```
 *
 * @file notification.service.ts
 *
 * @author Arthur M. Artugue
 * @created 2026-03-01
 * @updated 2026-03-01
 */
export class NotificationService {
  private notificationRepo: NotificationRepository;

  /**
   * Creates an instance of NotificationService.
   *
   * @param notificationRepo - The repository used for accessing and managing notifications.
   */
  constructor(notificationRepo: NotificationRepository) {
    this.notificationRepo = notificationRepo;
  }

  /**
   * Creates and persists a new notification for a user.
   *
   * @param userId - The unique identifier of the recipient user.
   * @param type - The category of the notification.
   * @param title - The notification title.
   * @param content - The notification body text.
   * @param data - Optional arbitrary metadata to attach to the notification.
   * @returns A promise that resolves to the saved notification entity.
   */
  public async createNotification(
    userId: string,
    type: Notification["type"],
    title: string,
    content: string,
    data?: Record<string, unknown>,
  ): Promise<Notification> {
    return await this.notificationRepo.createNotification(userId, type, title, content, data);
  }

  /**
   * Retrieves a single notification by its ID for a specific user.
   *
   * @param userId - The unique identifier of the user who owns the notification.
   * @param notificationId - The unique identifier of the notification to retrieve.
   * @returns A promise that resolves to the notification entity.
   * @throws {AppError} If the notification is not found or does not belong to the user.
   */
  public async getNotificationById(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findById(notificationId, userId);

    if (!notification) {
      throw new AppError(
        404,
        "NOTIFICATION_NOT_FOUND",
        "Notification not found",
        true
      );
    }

    return notification;
  }

  /**
   * Retrieves a paginated list of notifications for a user, ordered newest first.
   *
   * @param userId - The unique identifier of the user.
   * @param limit - The maximum number of notifications to return. Defaults to 20.
   * @param lastNotificationId - (Optional) The ID of the last notification from the previous page, used for cursor-based pagination.
   * @returns A promise that resolves to a paginated result containing notifications, a `hasMore` flag, and an optional `nextCursor`.
   */
  public async getNotificationsByUser(
    userId: string,
    limit: number = 20,
    lastNotificationId?: string,
  ): Promise<PaginatedNotifications> {
    const fetchLimit = limit + 1; // fetch one extra to determine if more pages exist

    const notifications = await this.notificationRepo.findByUser(userId, lastNotificationId, fetchLimit);

    const hasMore = notifications.length > limit;
    const sliced = hasMore ? notifications.slice(0, limit) : notifications;

    return {
      notifications: sliced,
      hasMore,
      nextCursor: hasMore ? sliced[sliced.length - 1].notification_id : undefined,
    };
  }

  /**
   * Retrieves all unread notifications for a user.
   *
   * @param userId - The unique identifier of the user.
   * @returns A promise that resolves to an array of unread notifications ordered newest first.
   */
  public async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await this.notificationRepo.findUnreadByUser(userId);
  }

  /**
   * Returns the number of unread notifications for a user.
   *
   * @param userId - The unique identifier of the user.
   * @returns A promise that resolves to the unread notification count.
   */
  public async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepo.countUnread(userId);
  }

  /**
   * Marks a single notification as read.
   *
   * Verifies the notification exists and belongs to the user before marking it.
   *
   * @param userId - The unique identifier of the user who owns the notification.
   * @param notificationId - The unique identifier of the notification to mark as read.
   * @returns A promise that resolves when the operation is complete.
   * @throws {AppError} If the notification is not found or does not belong to the user.
   */
  public async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findById(notificationId, userId);

    if (!notification) {
      throw new AppError(
        404,
        "NOTIFICATION_NOT_FOUND",
        "Notification not found",
        true
      );
    }

    if (notification.is_read) {
      logger.info(`Notification ${notificationId} is already marked as read for user ${userId}.`);
      return;
    }

    await this.notificationRepo.markAsRead(notificationId, userId);
  }

  /**
   * Marks all unread notifications for a user as read.
   *
   * @param userId - The unique identifier of the user.
   * @returns A promise that resolves when the operation is complete.
   */
  public async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.markAllAsRead(userId);
  }

  /**
   * Soft deletes a notification by setting its `is_deleted` flag to `true`.
   *
   * Verifies the notification exists and belongs to the user before deleting.
   *
   * @param userId - The unique identifier of the user who owns the notification.
   * @param notificationId - The unique identifier of the notification to delete.
   * @returns A promise that resolves when the soft delete operation is complete.
   * @throws {AppError} If the notification is not found or does not belong to the user.
   */
  public async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findById(notificationId, userId);

    if (!notification) {
      throw new AppError(
        404,
        "NOTIFICATION_NOT_FOUND",
        "Notification not found",
        true
      );
    }

    await this.notificationRepo.softDelete(notificationId, userId);
  }
}
