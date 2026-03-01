import { AppDataSource } from "../config/datasource.config.js";
import { DataSource } from "typeorm";

/**
 * Database Connection Tests
 * 
 * This file contains tests to verify the database connection using TypeORM.
 * It ensures that the DataSource initializes correctly with the provided configuration.
 * 
 * @file dbConnection.test.ts
 * @description Tests for database connection and DataSource initialization.
 * 
 * @author Arthur M. Artugue
 * @created 2025-08-28
 * @updated 2025-08-28
*/

let testDataSource: DataSource;

beforeAll(async () => {
  testDataSource = AppDataSource
  await testDataSource.initialize();
});

afterAll(async () => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
});

describe("Database / DataSource", () => {
  it("should initialize the data source successfully", () => {
    expect(testDataSource.isInitialized).toBe(true);
  });

  it("should fail to initialize with wrong config", async () => {
    const fakeDataSource = new DataSource({
      type: "postgres",
      host: "invalid-host",
      port: 1234,
      username: "wrong-user",
      password: "wrong-pass",
      database: "nonexistent-db",
    });

    await expect(fakeDataSource.initialize()).rejects.toThrow();
  });
});
