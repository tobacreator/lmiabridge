const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function testKeys() {
  console.log('🔍 Testing API Keys...\n');

  // Test GROQ_API_KEY
  console.log('1️⃣  Testing GROQ_API_KEY...');
  if (!process.env.GROQ_API_KEY) {
    console.log('❌ GROQ_API_KEY not found');
  } else {
    console.log(`✓ GROQ_API_KEY found: ${process.env.GROQ_API_KEY.substring(0, 10)}...`);
    try {
      const Groq = require('groq-sdk').default;
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const message = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Say "API key works" and nothing else' }],
        max_tokens: 10,
      });
      console.log(`✅ GROQ API works: ${message.choices[0].message.content}\n`);
    } catch (err) {
      console.log(`❌ GROQ API failed: ${err.message}\n`);
    }
  }

  // Test TINYFISH_API_KEY
  console.log('2️⃣  Testing TINYFISH_API_KEY...');
  if (!process.env.TINYFISH_API_KEY) {
    console.log('❌ TINYFISH_API_KEY not found\n');
  } else {
    console.log(`✓ TINYFISH_API_KEY found: ${process.env.TINYFISH_API_KEY.substring(0, 10)}...`);
    try {
      const response = await fetch('https://agent.tinyfish.ai/v1/automation/run-sse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.TINYFISH_API_KEY,
        },
        body: JSON.stringify({ url: 'https://example.com', goal: 'test' }),
      });
      if (response.ok || response.status === 400) {
        console.log(`✅ TINYFISH API accessible (status: ${response.status})\n`);
      } else if (response.status === 401 || response.status === 403) {
        console.log(`❌ TINYFISH API auth failed (status: ${response.status})\n`);
      } else {
        console.log(`⚠️  TINYFISH API returned status: ${response.status}\n`);
      }
    } catch (err) {
      console.log(`⚠️  Could not reach TINYFISH API: ${err.message}\n`);
    }
  }

  // Test MONGODB_URI
  console.log('3️⃣  Testing MONGODB_URI...');
  if (!process.env.MONGODB_URI) {
    console.log('❌ MONGODB_URI not found\n');
  } else {
    console.log(`✓ MONGODB_URI found: mongodb+srv://***@***`);
    try {
      const mongoose = require('mongoose');
      await mongoose.connect(process.env.MONGODB_URI, { 
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB connection successful\n`);
      await mongoose.connection.close();
    } catch (err) {
      console.log(`❌ MongoDB connection failed: ${err.message}\n`);
    }
  }

  // Test AGENTOPS_API_KEY (optional)
  console.log('4️⃣  Testing AGENTOPS_API_KEY (optional)...');
  if (!process.env.AGENTOPS_API_KEY) {
    console.log('⚠️  AGENTOPS_API_KEY not found (optional)\n');
  } else {
    console.log(`✓ AGENTOPS_API_KEY found: ${process.env.AGENTOPS_API_KEY.substring(0, 10)}...\n`);
  }

  console.log('✅ Key verification complete');
}

testKeys().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
