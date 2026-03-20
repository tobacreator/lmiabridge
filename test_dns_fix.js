const dns = require('dns');
dns.setServers(['8.8.8.8']); // Use Google DNS explicitly
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  console.log('Attempting connection with explicit DNS servers (8.8.8.8)...');
  try {
    const opts = {
      serverSelectionTimeoutMS: 10000,
      tlsAllowInvalidCertificates: true,
      family: 4
    };
    await mongoose.connect(process.env.MONGODB_URI, opts);
    console.log('SUCCESS: Connected with explicit DNS fix!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('FAILURE:', err.message);
    if (err.reason) console.error('Reason:', err.reason);
  }
}
run();
