import { storage } from "./storage";
import { db } from "./db";
import { admins, shops, riders, disputes, orders } from "@shared/schema";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  const existingAdmins = await db.select().from(admins);
  if (existingAdmins.length > 0) return;

  console.log("Seeding database...");

  await storage.createAdmin({
    username: "admin",
    password: hashPassword("admin123"),
    name: "Saaf Admin",
  });

  await storage.createAdmin({
    username: "ops",
    password: hashPassword("ops123"),
    name: "Operations Lead",
  });

  const shopData = [
    { name: "Karachi Biryani House", ownerName: "Hassan Ahmed", email: "hassan@kbh.pk", phone: "+92-300-1234567", address: "Block 5, Clifton, Karachi", category: "Restaurant", status: "PENDING" },
    { name: "Fresh Mart", ownerName: "Ayesha Khan", email: "ayesha@freshmart.pk", phone: "+92-321-9876543", address: "DHA Phase 6, Lahore", category: "Grocery", status: "APPROVED" },
    { name: "Lahore Dhaba", ownerName: "Ali Raza", email: "ali@lahoredhaba.pk", phone: "+92-333-4567890", address: "M.M. Alam Road, Lahore", category: "Restaurant", status: "APPROVED" },
    { name: "MediQuick Pharmacy", ownerName: "Dr. Sara Malik", email: "sara@mediquick.pk", phone: "+92-345-6789012", address: "Gulberg III, Lahore", category: "Pharmacy", status: "PENDING" },
    { name: "TechZone Electronics", ownerName: "Usman Sheikh", email: "usman@techzone.pk", phone: "+92-311-2345678", address: "Saddar, Rawalpindi", category: "Electronics", status: "SUSPENDED" },
  ];

  for (const shop of shopData) {
    await storage.createShop(shop);
  }

  const riderData = [
    { name: "Imran Hussain", email: "imran@riders.pk", phone: "+92-300-1112223", vehicleType: "Motorcycle", licenseNumber: "LHR-1234", status: "PENDING" },
    { name: "Bilal Shah", email: "bilal@riders.pk", phone: "+92-321-4445556", vehicleType: "Motorcycle", licenseNumber: "KHI-5678", status: "APPROVED" },
    { name: "Kamran Ali", email: "kamran@riders.pk", phone: "+92-333-7778889", vehicleType: "Bicycle", licenseNumber: "ISB-9012", status: "ACTIVE" },
    { name: "Faizan Ahmed", email: "faizan@riders.pk", phone: "+92-345-0001112", vehicleType: "Motorcycle", licenseNumber: "LHR-3456", status: "SUSPENDED" },
    { name: "Tariq Mehmood", email: "tariq@riders.pk", phone: "+92-311-3334445", vehicleType: "Car", licenseNumber: "RWP-7890", status: "PENDING" },
  ];

  for (const rider of riderData) {
    await storage.createRider(rider);
  }

  const orderData = [
    { customerName: "Zainab Fatima", shopName: "Fresh Mart", riderName: "Bilal Shah", items: "Milk, Bread, Eggs", totalAmount: 850, status: "DELIVERED", deliveryAddress: "House 12, Street 5, F-8, Islamabad" },
    { customerName: "Ahmed Rauf", shopName: "Karachi Biryani House", riderName: "Kamran Ali", items: "Chicken Biryani x2", totalAmount: 1200, status: "OUT_FOR_DELIVERY", deliveryAddress: "Flat 3B, Askari Tower, Karachi" },
    { customerName: "Sana Javed", shopName: "MediQuick Pharmacy", riderName: null, items: "Panadol, Vitamin C", totalAmount: 450, status: "PLACED", deliveryAddress: "Block A, Johar Town, Lahore" },
    { customerName: "Umar Farooq", shopName: "Lahore Dhaba", riderName: "Imran Hussain", items: "Nihari, Naan x4", totalAmount: 980, status: "PREPARING", deliveryAddress: "Model Town, Lahore" },
    { customerName: "Nadia Hussain", shopName: "TechZone Electronics", riderName: null, items: "Phone Charger, USB Cable", totalAmount: 1500, status: "CANCELLED", deliveryAddress: "Satellite Town, Rawalpindi" },
  ];

  for (const order of orderData) {
    await storage.createOrder(order);
  }

  const disputeData = [
    { raisedByType: "CUSTOMER", raisedByName: "Zainab Fatima", orderId: null, category: "Late Delivery", description: "Order was delivered 45 minutes late and the food was cold. I paid for express delivery but it took longer than standard.", status: "OPEN", internalNotes: null },
    { raisedByType: "SHOP", raisedByName: "Hassan Ahmed (KBH)", orderId: null, category: "Payment Issue", description: "Weekly payout has not been received for the last cycle. Our records show Rs. 45,000 pending.", status: "IN_REVIEW", internalNotes: "Checked with finance - payout was delayed due to bank holiday. Will be processed Monday." },
    { raisedByType: "RIDER", raisedByName: "Kamran Ali", orderId: null, category: "Customer Complaint", description: "Customer falsely reported that I did not deliver the order. GPS tracking confirms I was at the location.", status: "RESOLVED", internalNotes: "GPS verified. Customer was contacted and issue was a misunderstanding. Rider cleared." },
    { raisedByType: "CUSTOMER", raisedByName: "Ahmed Rauf", orderId: null, category: "Wrong Order", description: "Received chicken biryani instead of mutton biryani. The order was clearly marked as mutton.", status: "OPEN", internalNotes: null },
  ];

  for (const dispute of disputeData) {
    await storage.createDispute(dispute);
  }

  console.log("Database seeded successfully!");
}
