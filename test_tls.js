const tls = require('tls');

const host = 'ac-vp01k5e-shard-00-01.g8s0ejt.mongodb.net';
const port = 27017;

console.log(`Connecting to ${host}:${port} via TLS...`);

const socket = tls.connect(port, host, {
    servername: host, // SNI
    rejectUnauthorized: false
}, () => {
    console.log('CONNECTED (TLS)');
    socket.end();
});

socket.on('error', (err) => {
    console.error('TLS ERROR:', err.message);
    process.exit(1);
});

socket.setTimeout(5000, () => {
    console.error('TLS TIMEOUT');
    socket.destroy();
    process.exit(1);
});
