import { AppDataSource } from "../config/datasource.config.js";

export type CounselorRow = {
  user_id: string;
  user_name: string;
  email: string;
};

/**
 * Repository for reading counselor data.
 */
export class CounselorRepository {
  /**
   * Fetches a counselor's information by their ID.
   *
   * @param counselorId - The UUID of the counselor
   * @returns The counselor's information, or null if not found
   */
  async findCounselorInfoById(counselorId: string): Promise<CounselorRow | null> {
    const result = await AppDataSource.query(
      `
        SELECT user_id, user_name, email
        FROM "counselor"
        WHERE user_id = $1
      `,
      [counselorId],
    );

    return result.length > 0 ? result[0] : null;
  }
}