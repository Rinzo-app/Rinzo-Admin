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
    { name: "SparkleWash Laundry", ownerName: "Hassan Ahmed", email: "hassan@sparklewash.pk", phone: "+92-300-1234567", address: "Block 5, Clifton, Karachi", category: "Wash & Fold", status: "PENDING" },
    { name: "CleanPress Dry Cleaners", ownerName: "Ayesha Khan", email: "ayesha@cleanpress.pk", phone: "+92-321-9876543", address: "DHA Phase 6, Lahore", category: "Dry Cleaning", status: "APPROVED" },
    { name: "FreshFold Express", ownerName: "Ali Raza", email: "ali@freshfold.pk", phone: "+92-333-4567890", address: "M.M. Alam Road, Lahore", category: "Wash & Iron", status: "APPROVED" },
    { name: "Royal Laundromat", ownerName: "Sara Malik", email: "sara@royallaundromat.pk", phone: "+92-345-6789012", address: "Gulberg III, Lahore", category: "Self-Service", status: "PENDING" },
    { name: "PureClean Services", ownerName: "Usman Sheikh", email: "usman@pureclean.pk", phone: "+92-311-2345678", address: "Saddar, Rawalpindi", category: "Premium Laundry", status: "SUSPENDED" },
  ];

  for (const shop of shopData) {
    await storage.createShop(shop);
  }

  const riderData = [
    { name: "Imran Hussain", email: "imran@riders.pk", phone: "+92-300-1112223", vehicleType: "Motorcycle", licenseNumber: "LHR-1234", status: "PENDING" },
    { name: "Bilal Shah", email: "bilal@riders.pk", phone: "+92-321-4445556", vehicleType: "Motorcycle", licenseNumber: "KHI-5678", status: "APPROVED" },
    { name: "Kamran Ali", email: "kamran@riders.pk", phone: "+92-333-7778889", vehicleType: "Bicycle", licenseNumber: "ISB-9012", status: "ACTIVE" },
    { name: "Faizan Ahmed", email: "faizan@riders.pk", phone: "+92-345-0001112", vehicleType: "Motorcycle", licenseNumber: "LHR-3456", status: "SUSPENDED" },
    { name: "Tariq Mehmood", email: "tariq@riders.pk", phone: "+92-311-3334445", vehicleType: "Van", licenseNumber: "RWP-7890", status: "PENDING" },
  ];

  for (const rider of riderData) {
    await storage.createRider(rider);
  }

  const orderData = [
    { customerName: "Zainab Fatima", shopName: "CleanPress Dry Cleaners", riderName: "Bilal Shah", items: "Suits x2, Dress Shirts x3", totalAmount: 2850, status: "DELIVERED", deliveryAddress: "House 12, Street 5, F-8, Islamabad" },
    { customerName: "Ahmed Rauf", shopName: "SparkleWash Laundry", riderName: "Kamran Ali", items: "Bedsheets x4, Towels x6, Curtains x2", totalAmount: 1800, status: "OUT_FOR_DELIVERY", deliveryAddress: "Flat 3B, Askari Tower, Karachi" },
    { customerName: "Sana Javed", shopName: "Royal Laundromat", riderName: null, items: "Wash & Fold 8kg bag", totalAmount: 650, status: "PLACED", deliveryAddress: "Block A, Johar Town, Lahore" },
    { customerName: "Umar Farooq", shopName: "FreshFold Express", riderName: "Imran Hussain", items: "Jeans x3, T-Shirts x5, Shalwar Kameez x2", totalAmount: 1200, status: "PREPARING", deliveryAddress: "Model Town, Lahore" },
    { customerName: "Nadia Hussain", shopName: "PureClean Services", riderName: null, items: "Wedding Lehnga (bridal), Sherwani", totalAmount: 4500, status: "CANCELLED", deliveryAddress: "Satellite Town, Rawalpindi" },
  ];

  for (const order of orderData) {
    await storage.createOrder(order);
  }

  const disputeData = [
    { raisedByType: "CUSTOMER", raisedByName: "Zainab Fatima", orderId: null, category: "Damaged Clothes", description: "My silk dress came back with a bleach stain that was not there before. I need a full refund for the damaged item.", status: "OPEN", internalNotes: null },
    { raisedByType: "SHOP", raisedByName: "Hassan Ahmed (SparkleWash)", orderId: null, category: "Payment Issue", description: "Weekly payout has not been received for the last cycle. Our records show Rs. 45,000 pending.", status: "IN_REVIEW", internalNotes: "Checked with finance - payout was delayed due to bank holiday. Will be processed Monday." },
    { raisedByType: "RIDER", raisedByName: "Kamran Ali", orderId: null, category: "False Complaint", description: "Customer claims I did not deliver the laundry bag. GPS tracking confirms I was at the location and dropped it off at the door.", status: "RESOLVED", internalNotes: "GPS verified. Customer was contacted and confirmed they found the bag. Rider cleared." },
    { raisedByType: "CUSTOMER", raisedByName: "Ahmed Rauf", orderId: null, category: "Missing Items", description: "Sent 6 towels for washing but only received 4 back. Two large bath towels are missing from the order.", status: "OPEN", internalNotes: null },
  ];

  for (const dispute of disputeData) {
    await storage.createDispute(dispute);
  }

  console.log("Database seeded successfully!");
}
