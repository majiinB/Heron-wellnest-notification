import { LessThan, type Repository } from "typeorm";
import { AppDataSource } from "../config/datasource.config.js";
import { Notification } from "../models/notification.model.js";

/**
 * Repository class for managing Notification entities in the database.
 *
 * @description Provides methods to create, retrieve, update, and delete notifications.
 *
 * @remarks
 * - Soft deletes are performed by setting the `is_deleted` flag to `true`, preserving the entry in the database.
 * - Hard deletes permanently remove the entry from the database.
 * - Entries marked as deleted (`is_deleted: true`) are excluded from most retrieval operations.
 *
 * @example
 * ```typescript
 * const repo = new NotificationRepository();
 * const notif = await repo.createNotification(userId, "system_alerts", "Welcome", "You have a new message.");
 * const unread = await repo.findUnreadByUser(userId);
 * ```
 *
 * @file notification.repository.ts
 *
 * @author Arthur M. Artugue
 * @created 2026-03-01
 * @updated 2026-03-01
 */
export class NotificationRepository {
  private repo: Repository<Notification>;

  constructor() {
    this.repo = AppDataSource.getRepository(Notification);
  }

  /**
   * Creates and persists a new notification for a user.
   *
   * @param user_id - The unique identifier of the recipient user.
   * @param type - The category of the notification.
   * @param title - The notification title.
   * @param content - The notification body text.
   * @param data - Optional arbitrary metadata to attach to the notification.
   * @returns A promise that resolves to the saved notification entity.
   */
  async createNotification(
    user_id: string,
    type: Notification["type"],
    title: string,
    content: string,
    data?: Record<string, unknown>,
  ): Promise<Notification> {
    const entry = this.repo.create({ user_id, type, title, content, data });
    return await this.repo.save(entry);
  }

  /**
   * Retrieves a single notification by its ID for a specific user.
   *
   * @param notification_id - The unique identifier of the notification.
   * @param user_id - The unique identifier of the user who owns the notification.
   * @returns A promise that resolves to the notification if found and not deleted, otherwise `null`.
   */
  async findById(notification_id: string, user_id: string): Promise<Notification | null> {
    return await this.repo.findOne({
      where: { notification_id, user_id, is_deleted: false },
    });
  }

  /**
   * Retrieves notifications for a user with cursor-based pagination, ordered newest first.
   *
   * @param user_id - The unique identifier of the user.
   * @param lastNotificationId - (Optional) The ID of the last notification from the previous page, used for pagination.
   * @param limit - (Optional) Maximum number of notifications to return. Defaults to 20.
   * @returns A promise that resolves to an array of notifications.
   */
  async findByUser(
    user_id: string,
    lastNotificationId?: string,
    limit: number = 20,
  ): Promise<Notification[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseWhere: any = { user_id, is_deleted: false };

    let where = baseWhere;

    if (lastNotificationId) {
      const lastEntry = await this.repo.findOne({ where: { notification_id: lastNotificationId } });
      if (lastEntry) {
        where = [
          { user_id, is_deleted: false, created_at: LessThan(lastEntry.created_at) },
          { user_id, is_deleted: false, created_at: lastEntry.created_at, notification_id: LessThan(lastEntry.notification_id) },
        ];
      }
    }

    return await this.repo.find({
      where,
      order: { created_at: "DESC", notification_id: "DESC" },
      take: limit,
    });
  }

  /**
   * Retrieves all unread notifications for a user.
   *
   * @param user_id - The unique identifier of the user.
   * @returns A promise that resolves to an array of unread notifications ordered newest first.
   */
  async findUnreadByUser(user_id: string): Promise<Notification[]> {
    return await this.repo.find({
      where: { user_id, is_read: false, is_deleted: false },
      order: { created_at: "DESC" },
    });
  }

  /**
   * Marks a single notification as read.
   *
   * @param notification_id - The unique identifier of the notification to mark as read.
   * @param user_id - The unique identifier of the user who owns the notification.
   * @returns A promise that resolves when the operation is complete.
   */
  async markAsRead(notification_id: string, user_id: string): Promise<void> {
    await this.repo.update({ notification_id, user_id }, { is_read: true });
  }

  /**
   * Marks all unread notifications for a user as read.
   *
   * @param user_id - The unique identifier of the user.
   * @returns A promise that resolves when the operation is complete.
   */
  async markAllAsRead(user_id: string): Promise<void> {
    await this.repo.update({ user_id, is_read: false, is_deleted: false }, { is_read: true });
  }

  /**
   * Counts the number of unread notifications for a user.
   *
   * @param user_id - The unique identifier of the user.
   * @returns A promise that resolves to the unread notification count.
   */
  async countUnread(user_id: string): Promise<number> {
    return await this.repo.count({
      where: { user_id, is_read: false, is_deleted: false },
    });
  }

  /**
   * Soft deletes a notification by setting its `is_deleted` flag to `true`.
   *
   * @param notification_id - The unique identifier of the notification to soft delete.
   * @param user_id - The unique identifier of the user who owns the notification.
   * @returns A promise that resolves when the soft delete operation is complete.
   */
  async softDelete(notification_id: string, user_id: string): Promise<void> {
    await this.repo.update({ notification_id, user_id }, { is_deleted: true });
  }

  /**
   * Permanently removes a notification from the database.
   *
   * @param notification_id - The unique identifier of the notification to delete.
   * @param user_id - The unique identifier of the user who owns the notification.
   * @returns A promise that resolves when the hard delete operation is complete.
   */
  async hardDelete(notification_id: string, user_id: string): Promise<void> {
    await this.repo.delete({ notification_id, user_id });
  }
}
