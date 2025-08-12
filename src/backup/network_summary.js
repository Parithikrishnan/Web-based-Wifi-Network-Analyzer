import { spawn } from 'child_process';
import { MongoClient } from 'mongodb';

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'wifi';
const COLLECTION_DOMAINS = 'domains';
const COLLECTION_IP_DOMAIN = 'ip_domain_visits';

async function logDnsQuery(db, domain) {
    if (!db || !domain) return;

    try {
        const collection = db.collection(COLLECTION_DOMAINS);
        
        const filter = { domain: domain };
        const update = {
            $inc: { visitCount: 1 },
            $set: { lastQueriedAt: new Date() },
            $setOnInsert: {
                domain: domain,
                firstQueriedAt: new Date()
            }
        };
        const options = { upsert: true };

        await collection.updateOne(filter, update, options);
        // console.log('Updated domain count');
    } catch (err) {
        console.error(`[MongoDB Error]`, err);
    }
}

async function logIpDomainVisit(db, ip, domain) {
    if (!db || !ip || !domain) return;

    try {
        const collection = db.collection(COLLECTION_IP_DOMAIN);
        
        const filter = { ip: ip, domain: domain };
        const update = {
            $inc: { visitCount: 1 },
            $set: { lastVisitedAt: new Date() },
            $setOnInsert: {
                ip: ip,
                domain: domain,
                firstVisitedAt: new Date()
            }
        };
        const options = { upsert: true };

        await collection.updateOne(filter, update, options);
        // console.log(`Logged visit for IP ${ip} to ${domain}`);
    } catch (err) {
        console.error(`[MongoDB Error]`, err);
    }
}

async function main() {
    let db;
    let client;
    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);
    } catch (e) {
        console.error(`[MongoDB] Could not connect. Please ensure it is running and the URI is correct.`);
        process.exit(1);
    }

    // tcpdump command to capture DNS queries on UDP port 53
    const tcpdump = spawn('tcpdump', ['-l', '-n', 'udp', 'port', '53']);

    tcpdump.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');

        // Regex to parse source IP and domain from DNS query line
        // Example line format:
        // 12:34:56.789012 IP 192.168.1.5.54000 > 8.8.8.8.53: 12345+ A? youtube.com. (32)
        const dnsQueryRegex = /IP (\d+\.\d+\.\d+\.\d+)\.\d+ > \d+\.\d+\.\d+\.\d+\.53: \d+\+ (?:A|AAAA)\? ([a-zA-Z0-9\.-]+)\./;

        lines.forEach(line => {
            const match = line.match(dnsQueryRegex);
            if (match) {
                const ip = match[1];
                const domain = match[2];
                logDnsQuery(db, domain);
                logIpDomainVisit(db, ip, domain);
            }
        });
    });

    tcpdump.stderr.on('data', (data) => {
        const errorMessage = data.toString();
        if (errorMessage.includes('permission denied')) {
            console.error(`\n[FATAL ERROR] tcpdump permission denied. Please run this script with sudo.\n`);
            process.exit(1);
        } else {
            console.error(`[tcpdump stderr] ${errorMessage}`);
        }
    });

    tcpdump.on('error', (err) => {
        console.error(`[FATAL ERROR] Failed to start tcpdump. Is it installed and in your PATH?`);
        process.exit(1);
    });

    process.on('SIGINT', async () => {
        tcpdump.kill('SIGINT');
        if (client) {
            await client.close();
        }
        process.exit(0);
    });
}

main();
