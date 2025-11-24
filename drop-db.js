import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function dropDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/evconnect');
    console.log('Connected to MongoDB');
    
    await mongoose.connection.db.dropDatabase();
    console.log('✅ Database dropped successfully');
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

dropDatabase();
