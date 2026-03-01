import express, { Router } from "express";
import { heronAuthMiddleware } from "../middlewares/heronAuth.middleware.js";
import { googleAuthMiddleware } from "../middlewares/googleAuth.middleware.js";
import { NotificationController } from "../controllers/notification.controller.js";
import { NotificationRepository } from "../repository/notification.repository.js";
import { NotificationService } from "../services/notification.service.js";
import { asyncHandler } from "../utils/asyncHandler.util.js";

const router: Router = express.Router();
const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const notificationController = new NotificationController(notificationService);


/**
 * @openapi
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         notification_id:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         user_id:
 *           type: string
 *           format: uuid
 *           example: "98765432-1234-5678-9abc-def012345678"
 *         type:
 *           type: string
 *           enum: [activities, reminders, guidance_session, system_alerts]
 *           example: system_alerts
 *         title:
 *           type: string
 *           example: "New message received"
 *         content:
 *           type: string
 *           example: "You have a new notification."
 *         data:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *           example: null
 *         is_read:
 *           type: boolean
 *           example: false
 *         delivered_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         is_deleted:
 *           type: boolean
 *           example: false
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2026-01-24T10:30:00.000Z"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         code:
 *           type: string
 *           example: BAD_REQUEST
 *         message:
 *           type: string
 *           example: Invalid input data
 */

// INTERNAL — PubSub/service-to-service only. Protected by Google OIDC.
router.post("/internal/pubsub", googleAuthMiddleware, asyncHandler(notificationController.handleNotificationCreation.bind(notificationController)));

/**
 * @openapi
 * /notification/:
 *   get:
 *     summary: Retrieve notifications for the authenticated user
 *     description: Returns a paginated list of notifications for the authenticated student, ordered newest first. Supports cursor-based pagination via `limit` and `lastNotificationId`.
 *     tags:
 *       - Notification
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Maximum number of notifications to return (default 20, max 50)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *       - name: lastNotificationId
 *         in: query
 *         required: false
 *         description: The ID of the last notification from the previous page (for pagination)
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       "200":
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: NOTIFICATIONS_RETRIEVED
 *                 message:
 *                   type: string
 *                   example: Notifications retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     hasMore:
 *                       type: boolean
 *                       example: false
 *                     nextCursor:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                       example: null
 *       "401":
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "403":
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "500":
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", heronAuthMiddleware, asyncHandler(notificationController.handleGetNotifications.bind(notificationController)));

/**
 * @openapi
 * /notification/unread:
 *   get:
 *     summary: Retrieve all unread notifications for the authenticated user
 *     description: Returns all unread, non-deleted notifications for the authenticated student, ordered newest first.
 *     tags:
 *       - Notification
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Unread notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: UNREAD_NOTIFICATIONS_RETRIEVED
 *                 message:
 *                   type: string
 *                   example: Unread notifications retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *       "401":
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "403":
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "500":
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/unread", heronAuthMiddleware, asyncHandler(notificationController.handleGetUnreadNotifications.bind(notificationController)));

/**
 * @openapi
 * /notification/unread/count:
 *   get:
 *     summary: Retrieve the unread notification count for the authenticated user
 *     description: Returns the total number of unread, non-deleted notifications for the authenticated student. Suitable for driving a notification badge.
 *     tags:
 *       - Notification
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: UNREAD_COUNT_RETRIEVED
 *                 message:
 *                   type: string
 *                   example: Unread notification count retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 3
 *       "401":
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "403":
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "500":
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/unread/count", heronAuthMiddleware, asyncHandler(notificationController.handleGetUnreadCount.bind(notificationController)));

/**
 * @openapi
 * /notification/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Marks all unread, non-deleted notifications as read for the authenticated student.
 *     tags:
 *       - Notification
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: ALL_NOTIFICATIONS_MARKED_AS_READ
 *                 message:
 *                   type: string
 *                   example: All notifications marked as read
 *       "401":
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "403":
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "500":
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// NOTE: /read-all must be declared before /:notificationId/read to prevent route shadowing
router.patch("/read-all", heronAuthMiddleware, asyncHandler(notificationController.handleMarkAllAsRead.bind(notificationController)));

/**
 * @openapi
 * /notification/{notificationId}/read:
 *   patch:
 *     summary: Mark a single notification as read
 *     description: Marks the specified notification as read for the authenticated student. No-ops if already read.
 *     tags:
 *       - Notification
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: notificationId
 *         in: path
 *         required: true
 *         description: UUID of the notification to mark as read
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       "200":
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: NOTIFICATION_MARKED_AS_READ
 *                 message:
 *                   type: string
 *                   example: Notification marked as read
 *       "400":
 *         description: Bad request - invalid or missing notification ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "401":
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "403":
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "404":
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notFound:
 *                 value:
 *                   success: false
 *                   code: NOTIFICATION_NOT_FOUND
 *                   message: Notification not found
 *       "500":
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:notificationId/read", heronAuthMiddleware, asyncHandler(notificationController.handleMarkAsRead.bind(notificationController)));

/**
 * @openapi
 * /notification/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     description: Soft deletes the specified notification for the authenticated student. The record is preserved in the database with `is_deleted` set to `true`.
 *     tags:
 *       - Notification
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: notificationId
 *         in: path
 *         required: true
 *         description: UUID of the notification to delete
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       "200":
 *         description: Notification deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: NOTIFICATION_DELETED
 *                 message:
 *                   type: string
 *                   example: Notification deleted successfully
 *       "400":
 *         description: Bad request - invalid or missing notification ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "401":
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "403":
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "404":
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notFound:
 *                 value:
 *                   success: false
 *                   code: NOTIFICATION_NOT_FOUND
 *                   message: Notification not found
 *       "500":
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:notificationId", heronAuthMiddleware, asyncHandler(notificationController.handleDeleteNotification.bind(notificationController)));

export default router;
