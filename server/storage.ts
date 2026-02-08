import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  admins, shops, riders, disputes, orders,
  type Admin, type InsertAdmin,
  type Shop, type InsertShop,
  type Rider, type InsertRider,
  type Dispute, type InsertDispute,
  type Order, type InsertOrder,
} from "@shared/schema";

export interface IStorage {
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdmin(id: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;

  getShops(): Promise<Shop[]>;
  getShop(id: string): Promise<Shop | undefined>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShopStatus(id: string, status: string): Promise<Shop | undefined>;

  getRiders(): Promise<Rider[]>;
  getRider(id: string): Promise<Rider | undefined>;
  createRider(rider: InsertRider): Promise<Rider>;
  updateRiderStatus(id: string, status: string): Promise<Rider | undefined>;

  getDisputes(): Promise<Dispute[]>;
  getDispute(id: string): Promise<Dispute | undefined>;
  createDispute(dispute: InsertDispute): Promise<Dispute>;
  updateDispute(id: string, status: string, internalNotes: string): Promise<Dispute | undefined>;

  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
}

export class DatabaseStorage implements IStorage {
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async getAdmin(id: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [created] = await db.insert(admins).values(admin).returning();
    return created;
  }

  async getShops(): Promise<Shop[]> {
    return db.select().from(shops).orderBy(shops.submittedAt);
  }

  async getShop(id: string): Promise<Shop | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.id, id));
    return shop;
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    const [created] = await db.insert(shops).values(shop).returning();
    return created;
  }

  async updateShopStatus(id: string, status: string): Promise<Shop | undefined> {
    const [updated] = await db.update(shops).set({ status }).where(eq(shops.id, id)).returning();
    return updated;
  }

  async getRiders(): Promise<Rider[]> {
    return db.select().from(riders).orderBy(riders.submittedAt);
  }

  async getRider(id: string): Promise<Rider | undefined> {
    const [rider] = await db.select().from(riders).where(eq(riders.id, id));
    return rider;
  }

  async createRider(rider: InsertRider): Promise<Rider> {
    const [created] = await db.insert(riders).values(rider).returning();
    return created;
  }

  async updateRiderStatus(id: string, status: string): Promise<Rider | undefined> {
    const [updated] = await db.update(riders).set({ status }).where(eq(riders.id, id)).returning();
    return updated;
  }

  async getDisputes(): Promise<Dispute[]> {
    return db.select().from(disputes).orderBy(disputes.createdAt);
  }

  async getDispute(id: string): Promise<Dispute | undefined> {
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, id));
    return dispute;
  }

  async createDispute(dispute: InsertDispute): Promise<Dispute> {
    const [created] = await db.insert(disputes).values(dispute).returning();
    return created;
  }

  async updateDispute(id: string, status: string, internalNotes: string): Promise<Dispute | undefined> {
    const [updated] = await db.update(disputes).set({ status, internalNotes }).where(eq(disputes.id, id)).returning();
    return updated;
  }

  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(orders.createdAt);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
