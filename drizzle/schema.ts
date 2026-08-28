import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const commerceOrders = mysqlTable("commerce_orders", {
  id: int("id").autoincrement().primaryKey(),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }).notNull().unique(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  productIds: text("productIds").notNull(),
  shippoShipmentId: varchar("shippoShipmentId", { length: 255 }),
  shippoRateId: varchar("shippoRateId", { length: 255 }),
  shippoTransactionId: varchar("shippoTransactionId", { length: 255 }),
  trackingNumber: varchar("trackingNumber", { length: 255 }),
  trackingUrl: text("trackingUrl"),
  fulfillmentStatus: mysqlEnum("fulfillmentStatus", [
    "pending",
    "ready",
    "label_purchased",
    "shipped",
    "delivered",
    "exception",
  ]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CommerceOrder = typeof commerceOrders.$inferSelect;
export type InsertCommerceOrder = typeof commerceOrders.$inferInsert;
