import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { loginSchema, shopStatusEnum, riderStatusEnum, disputeStatusEnum } from "@shared/schema";
import { verifyPassword } from "./auth";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    adminId?: string;
  }
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "saaf-admin-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
      },
    })
  );

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const admin = await storage.getAdminByUsername(username);
      if (!admin || !verifyPassword(password, admin.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.session.adminId = admin.id;
      return res.json({ id: admin.id, username: admin.username, name: admin.name });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input" });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    const admin = await storage.getAdmin(req.session.adminId!);
    if (!admin) return res.status(401).json({ message: "Unauthorized" });
    return res.json({ id: admin.id, username: admin.username, name: admin.name });
  });

  app.get("/api/shops", requireAuth, async (_req: Request, res: Response) => {
    const shops = await storage.getShops();
    return res.json(shops);
  });

  app.patch("/api/shops/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const { status } = z.object({ status: shopStatusEnum }).parse(req.body);
      const shop = await storage.updateShopStatus(req.params.id, status);
      if (!shop) return res.status(404).json({ message: "Shop not found" });
      return res.json(shop);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid status" });
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/riders", requireAuth, async (_req: Request, res: Response) => {
    const riders = await storage.getRiders();
    return res.json(riders);
  });

  app.patch("/api/riders/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const { status } = z.object({ status: riderStatusEnum }).parse(req.body);
      const rider = await storage.updateRiderStatus(req.params.id, status);
      if (!rider) return res.status(404).json({ message: "Rider not found" });
      return res.json(rider);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid status" });
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/disputes", requireAuth, async (_req: Request, res: Response) => {
    const disputes = await storage.getDisputes();
    return res.json(disputes);
  });

  app.patch("/api/disputes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { status, internalNotes } = z.object({
        status: disputeStatusEnum,
        internalNotes: z.string().optional().default(""),
      }).parse(req.body);
      const dispute = await storage.updateDispute(req.params.id, status, internalNotes);
      if (!dispute) return res.status(404).json({ message: "Dispute not found" });
      return res.json(dispute);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/orders", requireAuth, async (_req: Request, res: Response) => {
    const orders = await storage.getOrders();
    return res.json(orders);
  });

  return httpServer;
}
