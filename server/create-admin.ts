import { createStorage } from "./storage";
import { hashPassword } from "./auth";
import dotenv from "dotenv";

dotenv.config();

async function createAdminUser() {
  console.log("🔧 Creating admin user...");

  const storage = await createStorage();

  // Check if admin already exists
  const existingAdmin = await storage.getUserByEmail("admin@evconnect.com");
  if (existingAdmin) {
    console.log("✅ Admin user already exists:", existingAdmin.email);
    console.log("   ID:", existingAdmin.id);
    console.log("   Role:", existingAdmin.role);
    console.log("   Status:", existingAdmin.status);
    process.exit(0);
  }

  // Create admin user
  const passwordHash = await hashPassword("password123");
  const user = await storage.createUser({
    email: "admin@evconnect.com",
    passwordHash,
    role: "ADMIN",
    status: "ACTIVE",
  });

  // Create admin profile
  await storage.createProfile({
    userId: user.id,
    displayName: "Admin User",
    bio: "Platform administrator",
  });

  console.log("✅ Admin user created successfully!");
  console.log("   Email: admin@evconnect.com");
  console.log("   Password: password123");
  console.log("   ID:", user.id);
  console.log("   Role:", user.role);

  process.exit(0);
}

createAdminUser().catch((error) => {
  console.error("❌ Error creating admin user:", error);
  process.exit(1);
});
