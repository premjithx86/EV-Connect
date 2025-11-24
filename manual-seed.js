import { createStorage } from "./server/storage.js";
import { hashPassword } from "./server/auth.js";
import dotenv from 'dotenv';

dotenv.config();

async function manualSeed() {
  try {
    console.log('🌱 Starting manual seed...');
    
    const storage = await createStorage();
    console.log('✅ Storage created');
    
    // Create Alice
    console.log('Creating Alice...');
    const alicePassword = await hashPassword('password123');
    const alice = await storage.createUser({
      email: 'alice@evconnect.com',
      passwordHash: alicePassword,
      role: 'USER',
      status: 'ACTIVE',
    });
    console.log('✅ Alice created:', alice.id, alice.email);
    
    // Create Alice's profile
    await storage.createProfile({
      userId: alice.id,
      displayName: 'Alice Chen',
      bio: 'Tesla Model 3 owner. Love long road trips!',
      avatarUrl: null,
      location: null,
      vehicle: {
        brand: 'Tesla',
        model: 'Model 3',
        year: 2023,
        batteryCapacity: 75,
      },
      interests: null,
    });
    console.log('✅ Alice profile created');
    
    // Verify user was created
    const verifyUser = await storage.getUserByEmail('alice@evconnect.com');
    console.log('✅ Verification - User found:', verifyUser ? verifyUser.email : 'NOT FOUND');
    
    console.log('🎉 Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

manualSeed();
