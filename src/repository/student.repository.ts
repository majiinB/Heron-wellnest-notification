import { AppDataSource } from "../config/datasource.config.js";

export type StudentRow = {
  user_id: string;
  user_name: string;
  email: string;
};

type ProgramIdRow = {
  program_id: string;
};

/**
 * Repository for reading and updating Student data.
 *
 * @description
 * Provides methods used by onboarding flows to fetch student information
 * and update their college department assignments.
 */
export class StudentRepository {
  /**
   * Fetches a student's information by their ID.
   *
   * @param studentId - The UUID of the student
   * @returns The student's information, or null if not found
   */
  async findStudentInfoById(studentId: string): Promise<StudentRow | null> {
    const result = await AppDataSource.query(
      `
        SELECT user_id, user_name, email
        FROM "student"
        WHERE user_id = $1
      `,
      [studentId],
    );

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Updates a student's college department assignment.
   *
   * @param studentId - The UUID of the student
   * @param departmentId - The department_id from college_departments table
   * @throws Will throw if the student is not found or department doesn't exist
   *
   * @description
   * Resolves the provided department_id to a valid program_id and assigns it
   * to student.program_id. This preserves the student.program_id foreign key
   * constraint while allowing onboarding logic to work from matched departments.
   */
  async updateStudentDepartmentById(
    studentId: string,
    programId: string,
    yearLevel: string,
    corSchoolYear: string,
  ): Promise<void> {
    // const programId = await this.findProgramIdByDepartmentId(departmentId);

    const updatedRows = await AppDataSource.query(
      `
        UPDATE student
        SET program_id = $1, cor_school_year = $2, year_level = $3, finished_onboarding = TRUE, updated_at = NOW()
        WHERE user_id = $4
        RETURNING user_id
      `,
      [programId, corSchoolYear, yearLevel, studentId],
    );

    if (updatedRows.length === 0) {
      throw new Error(`Student with id ${studentId} not found`);
    }
  }

  /**
   * Resolves a department_id to a valid program_id.
   *
   * Supports either `college_program` or `college_programs` table naming.
   */
  private async findProgramIdByDepartmentId(departmentId: string): Promise<string> {
    const tableCheck = await AppDataSource.query(
      `
        SELECT
          to_regclass('public.college_program') AS college_program_table,
          to_regclass('public.college_programs') AS college_programs_table
      `,
    );

    const hasCollegeProgram = Boolean(tableCheck[0]?.college_program_table);
    const hasCollegePrograms = Boolean(tableCheck[0]?.college_programs_table);

    if (!hasCollegeProgram && !hasCollegePrograms) {
      throw new Error("No college program table found (expected college_program or college_programs)");
    }

    const targetTable = hasCollegeProgram ? "college_program" : "college_programs";

    const rows = await AppDataSource.query(
      `
        SELECT program_id
        FROM ${targetTable}
        WHERE college_department_id = $1
        LIMIT 1
      `,
      [departmentId],
    );

    const programRows = rows as ProgramIdRow[];
    const programId = programRows[0]?.program_id;

    if (!programId) {
      throw new Error(
        `No program_id mapping found for department_id ${departmentId} in ${targetTable}`,
      );
    }

    return programId;
  }
}
