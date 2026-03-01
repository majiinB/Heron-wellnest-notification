import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * @file notification.model.ts
 *
 * @description Notification model for Heron wellnest system.
 *
 * This module defines the "Notification" entity, which represents a notification message in the system.
 * Each notification is associated with a user and contains content. The model includes
 * fields for tracking the creation time and whether the notification has been read.
 *
 * @author Arthur M. Artugue
 * @created 2026-03-01
 * @updated 2026-03-01
 */
@Entity("notifications")
@Index(["user_id", "is_read"])
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  notification_id!: string;

  @Column({ type: "uuid", nullable: false })
  user_id!: string;

  @Column({ 
    type: "enum",
    enum: ["activities", "reminders", "guidance_session", "system_alerts"], 
  })
  type!: "activities" | "reminders" | "guidance_session" | "system_alerts";

  @Column({ type: "varchar", nullable: false })
  title!: string;

  @Column({ type: "varchar", nullable: false })
  content!: string;

  @Column ({ type: "jsonb", nullable: true })
  data?: Record<string, unknown>;

  @Column({ type: "boolean", default: false })
  is_read!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  delivered_at?: Date;

  @Column({ type: "boolean", default: false })
  is_deleted!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}