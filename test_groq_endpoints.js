require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const http = require('http');

async function testAgent(path, body) {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let result = '';
                try {
                    result = JSON.parse(data);
                } catch(e) { result = data; }
                resolve({ path, status: res.statusCode, result });
            });
        });
        req.on('error', (e) => resolve({ path, error: e.message }));
        req.write(JSON.stringify(body));
        req.end();
    });
}

async function runAll() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const worker = await mongoose.connection.collection('workers').findOne();
    const job = await mongoose.connection.collection('jobpostings').findOne();
    const app = await mongoose.connection.collection('lmiaapplications').findOne();

    if (worker && job) {
        console.log('\n--- Match Scoring ---');
        const res = await testAgent('/api/match', { workerId: worker._id.toString(), jobPostingId: job._id.toString() });
        console.log(JSON.stringify(res.result, null, 2));
    } else {
        console.log('\n--- Match Scoring: Skipped, no worker/job in DB ---');
    }

    if (app) {
        console.log('\n--- Compliance Generate ---');
        const res2 = await testAgent('/api/compliance/generate', { lmiaApplicationId: app._id.toString() });
        console.log(JSON.stringify(res2.result, null, 2));
    } else {
        console.log('\n--- Compliance Generate: Skipped, no app in DB ---');
    }

    console.log('\n--- GTS Screener ---');
    const res3 = await testAgent('/api/gts/screen', { nocCode: '21231', jobTitle: 'Software Engineer', wage: 95000 });
    console.log(JSON.stringify(res3.result, null, 2));

    process.exit(0);
}

runAll().catch(console.error);
