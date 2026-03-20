require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is missing');
    process.exit(1);
  }

  console.log('Testing connection to:', uri.split('@')[1]); // Log host only for safety

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      tlsAllowInvalidCertificates: true,
      family: 4
    });
    console.log('Successfully connected to MongoDB');
    
    // List collections to verify access
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    await mongoose.disconnect();
    console.log('Disconnected');
  } catch (err) {
    console.error('Connection failed:', err);
    process.exit(1);
  }
}

testConnection();
