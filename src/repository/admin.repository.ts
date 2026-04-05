import { AppDataSource } from "../config/datasource.config.js";

export type AdminRow = {
  user_id: string;
  user_name: string;
  email: string;
};

/**
 * Repository for reading admin data.
 */
export class AdminRepository {
  /**
   * Fetches an admin's information by their ID.
   *
   * @param adminId - The UUID of the admin
   * @returns The admin's information, or null if not found
   */
  async findAdminInfoById(adminId: string): Promise<AdminRow | null> {
    const result = await AppDataSource.query(
      `
        SELECT user_id, user_name, email
        FROM "admin"
        WHERE user_id = $1
      `,
      [adminId],
    );

    return result.length > 0 ? result[0] : null;
  }
}