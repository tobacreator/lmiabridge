require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function seedAndMatch() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const db = mongoose.connection;
    const workers = db.collection('workers');
    const jobs = db.collection('jobpostings');

    // Create worker
    const workerRes = await workers.insertOne({
        name: 'Jane Doe',
        email: `jane${Date.now()}@test.com`,
        nocCode: '21232',
        country: 'India',
        createdAt: new Date()
    });
    
    // Create employer and job 
    const empRes = await db.collection('employers').insertOne({
        companyName: 'Test Corp',
        email: `test${Date.now()}@test.com`,
        province: 'ON',
        verificationStatus: 'verified',
        createdAt: new Date()
    });

    const jobRes = await jobs.insertOne({
        jobTitle: 'Senior Dev',
        nocCode: '21232',
        wage: 50,
        province: 'ON',
        employer: empRes.insertedId,
        createdAt: new Date()
    });

    console.log('Created Worker:', workerRes.insertedId);
    console.log('Created Job:', jobRes.insertedId);

    // Call /api/match
    const http = require('http');
    const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/match',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('Match Result:', data);
            process.exit(0);
        });
    });
    
    req.write(JSON.stringify({ 
        workerId: workerRes.insertedId.toString(), 
        jobPostingId: jobRes.insertedId.toString() 
    }));
    req.end();
}

seedAndMatch().catch(console.error);
