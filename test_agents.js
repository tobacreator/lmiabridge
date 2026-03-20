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
                const lines = data.split('\n');
                const lastDataLine = lines.reverse().find(l => l.startsWith('data: '));
                let result = '';
                if (lastDataLine) {
                    try {
                        result = JSON.parse(lastDataLine.slice(6));
                    } catch(e) { result = lastDataLine; }
                } else {
                    result = data;
                }
                resolve({ path, status: res.statusCode, result });
            });
        });
        req.on('error', (e) => resolve({ path, error: e.message }));
        req.write(JSON.stringify(body));
        req.end();
    });
}

async function runAll() {
    console.log('Testing agents...');
    const res1 = await testAgent('/api/agents/job-scan', { nocCode: '21231', province: 'ON' });
    console.log('\n--- Job Scan ---');
    console.log(JSON.stringify(res1.result, null, 2));

    const res2 = await testAgent('/api/agents/verify-employer', { companyName: 'Shopify', province: 'ON' });
    console.log('\n--- Verify Employer ---');
    console.log(JSON.stringify(res2.result, null, 2));

    const res3 = await testAgent('/api/agents/wage-lookup', { nocCode: '21231', province: 'ON' });
    console.log('\n--- Wage Lookup ---');
    console.log(JSON.stringify(res3.result, null, 2));

    const res4 = await testAgent('/api/agents/compliance-check', { companyName: 'Shopify', craBN: '123456789' });
    console.log('\n--- Compliance Check ---');
    console.log(JSON.stringify(res4.result, null, 2));
}

runAll().catch(console.error);
