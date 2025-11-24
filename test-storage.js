import dotenv from 'dotenv';
import { createStorage } from './server/storage.js';

dotenv.config();

async function testStorage() {
  try {
    console.log('Creating storage...');
    const storage = await createStorage();
    console.log('Storage created successfully');

    // Test a simple operation
    const users = await storage.getUserByEmail('test@example.com');
    console.log('Test query successful:', users);

  } catch (error) {
    console.error('Error:', error);
  }
}

testStorage();
