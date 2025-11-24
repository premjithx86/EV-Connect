import { seedData } from "./seed";
import dotenv from "dotenv";

dotenv.config();

seedData()
  .then(() => {
    console.log("✅ Seed completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
