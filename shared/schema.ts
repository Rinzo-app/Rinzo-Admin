import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
});

export const insertAdminSchema = createInsertSchema(admins).omit({ id: true });
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof admins.$inferSelect;

export const shopStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]);
export type ShopStatus = z.infer<typeof shopStatusEnum>;

export const shops = pgTable("shops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("PENDING"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertShopSchema = createInsertSchema(shops).omit({ id: true, submittedAt: true });
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shops.$inferSelect;

export const riderStatusEnum = z.enum(["PENDING", "APPROVED", "ACTIVE", "SUSPENDED"]);
export type RiderStatus = z.infer<typeof riderStatusEnum>;

export const riders = pgTable("riders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  vehicleType: text("vehicle_type").notNull(),
  licenseNumber: text("license_number").notNull(),
  status: text("status").notNull().default("PENDING"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertRiderSchema = createInsertSchema(riders).omit({ id: true, submittedAt: true });
export type InsertRider = z.infer<typeof insertRiderSchema>;
export type Rider = typeof riders.$inferSelect;

export const disputeStatusEnum = z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"]);
export type DisputeStatus = z.infer<typeof disputeStatusEnum>;

export const raisedByTypeEnum = z.enum(["CUSTOMER", "SHOP", "RIDER"]);
export type RaisedByType = z.infer<typeof raisedByTypeEnum>;

export const disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  raisedByType: text("raised_by_type").notNull(),
  raisedByName: text("raised_by_name").notNull(),
  orderId: text("order_id"),
  category: text("category").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("OPEN"),
  internalNotes: text("internal_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDisputeSchema = createInsertSchema(disputes).omit({ id: true, createdAt: true });
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;

export const orderStatusEnum = z.enum(["PLACED", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]);
export type OrderStatus = z.infer<typeof orderStatusEnum>;

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: text("customer_name").notNull(),
  shopName: text("shop_name").notNull(),
  riderName: text("rider_name"),
  items: text("items").notNull(),
  totalAmount: integer("total_amount").notNull(),
  status: text("status").notNull().default("PLACED"),
  deliveryAddress: text("delivery_address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export { z };
