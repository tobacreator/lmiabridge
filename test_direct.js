const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  // Extract credentials from original URI
  const rawUri = process.env.MONGODB_URI;
  const auth = rawUri.split('@')[0].split('//')[1];
  
  // Construct direct URI to Shard 1
  const directUri = `mongodb://${auth}@ac-vp01k5e-shard-00-01.g8s0ejt.mongodb.net:27017/lmiabridge?authSource=admin&tls=true&tlsAllowInvalidCertificates=true`;
  
  console.log('Attempting direct connection to Shard 1...');
  try {
    const opts = {
      serverSelectionTimeoutMS: 10000,
      family: 4,
      directConnection: true
    };
    await mongoose.connect(directUri, opts);
    console.log('SUCCESS: Direct connection working!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('FAILURE:', err.message);
    if (err.reason) console.error('Reason:', err.reason);
  }
}
run();
