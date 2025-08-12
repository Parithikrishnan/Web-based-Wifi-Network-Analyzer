// backend/server.js

// --- IMPORTS ---
import { exec, spawn } from 'child_process';
import { MongoClient } from 'mongodb';
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import macOui from 'mac-oui-lookup';
import fs from 'fs';
import dns from 'dns';

const macLookup = macOui.default;

// --- CONFIGURATION ---
// IMPORTANT: Change this to your active network interface (e.g., 'wlan0', 'eth0')
const INTERFACE_NAME = 'wlp4s0'; 
const MONGO_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'wifi';
const PORT = 3001;
const HOSTS_FILE = '/etc/hosts';
const BLOCK_IP = '127.0.0.1';
const DEVICE_SCAN_INTERVAL = 5 * 60 * 1000; // Scan for network devices every 5 minutes
const HOST_MONITOR_INTERVAL = 1000; // Monitor host's connection every second

// --- SERVER SETUP ---
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Global variables
let db;
const clients = new Set(); // Holds all active WebSocket clients
let lastBssid = null; // Tracks the host's Wi-Fi connection BSSID
let currentHostConnection = { connected: false }; // Holds latest host connection details

// --- REAL-TIME BROADCAST FUNCTION ---
/**
 * Sends data to every connected WebSocket client.
 * @param {object} data The data to be sent (will be stringified).
 */
function broadcast(data) {
  const jsonData = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonData);
    }
  }
}

// --- HELPER FUNCTIONS ---
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      if (stderr) console.error(`[Command Stderr] ${cmd}:`, stderr);
      resolve(stdout);
    });
  });
}

function parseArpScan(output) {
  const devices = [];
  output.split('\n').forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2 && /^\d+\.\d+\.\d+\.\d+$/.test(parts[0]) && /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(parts[1].toLowerCase())) {
      devices.push({ ip: parts[0], mac: parts[1].toLowerCase() });
    }
  });
  return devices;
}

function humanReadableBytes(bytes = 0) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / (1024 ** i)).toFixed(2)} ${sizes[i]}`;
}

function parseIwOutput(output) {
    const data = { connected: true };
    output.split('\n').forEach(line => {
        const L = line.trim();
        if (L.startsWith('Connected to')) {
            const match = L.match(/([\da-f:]+) \(on (.+)\)/);
            if (match) { data.bssid = match[1]; data.interface = match[2]; }
        } else if (L.startsWith('SSID:')) data.ssid = L.split(':')[1].trim();
        else if (L.startsWith('freq:')) data.freq = L.split(':')[1].trim();
        else if (L.startsWith('signal:')) data.signal = L.split(':')[1].trim();
        else if (L.startsWith('rx bitrate:')) data.rxBitrate = L.split(':')[1].trim();
        else if (L.startsWith('tx bitrate:')) data.txBitrate = L.split(':')[1].trim();
        else if (L.startsWith('RX:')) data.rxBytes = L.match(/(\d+) bytes/)?.[1] || '0';
        else if (L.startsWith('TX:')) data.txBytes = L.match(/(\d+) bytes/)?.[1] || '0';
        else if (L.startsWith('beacon int:')) data.beaconInt = L.split(':')[1].trim();
        else if (L.startsWith('dtim period:')) data.dtimPeriod = L.split(':')[1].trim();
    });
    data.rxTotalHuman = humanReadableBytes(parseInt(data.rxBytes, 10));
    data.txTotalHuman = humanReadableBytes(parseInt(data.txBytes, 10));
    return data;
}

function readHosts() {
  return fs.readFileSync(HOSTS_FILE, 'utf8').split('\n');
}

function writeHosts(lines) {
  fs.writeFileSync(HOSTS_FILE, lines.join('\n'), 'utf8');
}

// --- DATABASE LOGIC ---
async function saveDeviceToMongo(device) {
  const collection = db.collection('devices');
  await collection.updateOne({ mac: device.mac }, { $set: { ip: device.ip, vendor: device.vendor, lastSeenAt: new Date() }, $setOnInsert: { firstSeenAt: new Date() } }, { upsert: true });
}

async function saveStaticHostDetails(data) {
  if (!data.interface || !data.bssid) return;
  const collection = db.collection('connection_details');
  const staticData = { interface: data.interface, ssid: data.ssid, bssid: data.bssid, freq: data.freq, beaconInt: data.beaconInt, dtimPeriod: data.dtimPeriod };
  await collection.updateOne({ interface: staticData.interface, bssid: staticData.bssid }, { $set: { ...staticData, lastSeenAt: new Date() }, $setOnInsert: { firstSeenAt: new Date() } }, { upsert: true });
  console.log(`[Host Monitor] Saved static connection details for SSID "${data.ssid}".`);
}

async function logDnsQuery(ip, domain) {
  // Save to DB
  const domainCollection = db.collection('domains');
  await domainCollection.updateOne({ domain }, { $inc: { visitCount: 1 }, $set: { lastQueriedAt: new Date() }, $setOnInsert: { domain, firstQueriedAt: new Date() } }, { upsert: true });
  const ipDomainCollection = db.collection('ip_domain_visits');
  await ipDomainCollection.updateOne({ ip, domain }, { $inc: { visitCount: 1 }, $set: { lastVisitedAt: new Date() }, $setOnInsert: { ip, domain, firstVisitedAt: new Date() } }, { upsert: true });

  // Broadcast the new query for real-time analysis page
  broadcast({ type: 'dns_query', payload: { ip, domain, timestamp: new Date().toISOString() } });
}

// --- CORE BACKGROUND SERVICES ---
// 1. Service to scan for devices on the local network
async function performDeviceScan() {
    console.log(`[Device Scan] Starting scan on interface ${INTERFACE_NAME}...`);
    try {
        const arpOutput = await runCommand(`sudo arp-scan -l -I ${INTERFACE_NAME}`);
        const devices = parseArpScan(arpOutput);
        console.log(`[Device Scan] Found ${devices.length} devices. Updating database...`);
        for (const device of devices) {
            device.vendor = macLookup(device.mac) || 'Unknown';
            await saveDeviceToMongo(device);
        }
        broadcast({ type: 'devices_updated' });
    } catch (err) {
        console.error(`[Device Scan] Error: ${err.message}. Ensure 'arp-scan' is installed and INTERFACE_NAME is correct.`);
    }
}

// 2. Service to monitor DNS traffic
function startDnsMonitoring() {
    const tcpdump = spawn('tcpdump', ['-l', '-n', 'udp', 'port', '53']);
    tcpdump.stdout.on('data', (data) => {
        const dnsQueryRegex = /IP (\d+\.\d+\.\d+\.\d+)\.\d+ > .+?: \d+\+ (?:A|AAAA)\? ([a-zA-Z0-9\.-]+)\./;
        data.toString().split('\n').forEach(line => {
            const match = line.match(dnsQueryRegex);
            if (match) logDnsQuery(match[1], match[2]);
        });
    });
    tcpdump.stderr.on('data', (data) => {
        if (data.toString().includes('permission denied')) {
            console.error('\n[FATAL ERROR] tcpdump permission denied. Please run server with sudo.\n');
            process.exit(1);
        }
    });
}

// 3. Service to monitor the host machine's own Wi-Fi connection
function monitorHostConnection() {
  exec(`iw dev ${INTERFACE_NAME} link`, async (err, stdout) => {
    if (err) {
      if (currentHostConnection.connected) console.log(`[Host Monitor] Interface ${INTERFACE_NAME} disconnected.`);
      currentHostConnection = { connected: false };
      lastBssid = null;
    } else {
      const liveData = parseIwOutput(stdout);
      currentHostConnection = liveData;
      if (liveData.bssid && liveData.bssid !== lastBssid) {
        console.log(`[Host Monitor] Detected connection to BSSID ${liveData.bssid}.`);
        lastBssid = liveData.bssid;
        await saveStaticHostDetails(liveData);
      }
    }
    broadcast(currentHostConnection);
  });
}

// --- WEBSOCKET SERVER LOGIC ---
wss.on('connection', (ws) => {
  console.log('[WebSocket] Client connected.');
  clients.add(ws);
  ws.on('close', () => { clients.delete(ws); console.log('[WebSocket] Client disconnected.'); });
  ws.on('error', (error) => { console.error('[WebSocket] Error:', error); });
});


// =================================================================
// --- API ENDPOINTS ---
// =================================================================
// Host Connection Endpoint
app.get('/api/wifi-details/static', (req, res) => res.json(currentHostConnection));

// Device Endpoints
app.get('/api/devices', async (req, res) => {
    const devices = await db.collection('devices').find({}).sort({ lastSeenAt: -1 }).toArray();
    res.json(devices);
});
app.post('/api/devices/scan', (req, res) => {
    performDeviceScan();
    res.status(202).json({ message: 'Manual device scan initiated.' });
});

// Traffic Endpoints
app.get('/api/traffic/ips', async (req, res) => res.json(await db.collection('ip_domain_visits').distinct('ip')));
app.get('/api/traffic/ip/:ip', async (req, res) => res.json(await db.collection('ip_domain_visits').find({ ip: req.params.ip }).sort({ lastVisitedAt: -1 }).toArray()));
app.get('/api/traffic/domain-summary', async (req, res) => res.json(await db.collection('domains').find({}).sort({ visitCount: -1 }).toArray()));

// Security Endpoints
app.get('/api/security/blocked', (req, res) => {
    try {
        const blocked = readHosts().map(l => l.trim()).filter(l => l.startsWith(BLOCK_IP)).map(l => l.split(/\s+/)[1]).filter(d => d);
        res.json(blocked);
    } catch (error) {
        res.status(500).json({ message: 'Could not read hosts file. Run with sudo.' });
    }
});
app.post('/api/security/block', (req, res) => {
    const { hostname } = req.body;
    if (!hostname) return res.status(400).json({ message: 'Hostname is required.' });
    try {
        const lines = readHosts();
        const entry = `${BLOCK_IP} ${hostname}`;
        if (lines.some(line => line.trim() === entry)) return res.status(409).json({ message: `${hostname} is already blocked.` });
        lines.push(entry);
        writeHosts(lines);
        res.json({ success: true, message: `${hostname} has been blocked.` });
    } catch (error) {
        res.status(500).json({ message: 'Error blocking website. Run with sudo.' });
    }
});
app.post('/api/security/unblock', (req, res) => {
    const { hostname } = req.body;
    if (!hostname) return res.status(400).json({ message: 'Hostname is required.' });
    try {
        const lines = readHosts();
        const entry = `${BLOCK_IP} ${hostname}`;
        const filtered = lines.filter(line => line.trim() !== entry);
        if (lines.length === filtered.length) return res.status(404).json({ message: `${hostname} is not blocked.` });
        writeHosts(filtered);
        res.json({ success: true, message: `${hostname} has been unblocked.` });
    } catch (error) {
        res.status(500).json({ message: 'Error unblocking website. Run with sudo.' });
    }
});

// --- MAIN SERVER FUNCTION ---
async function main() {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        db = client.db(DB_NAME);
        console.log('[MongoDB] Successfully connected.');

        server.listen(PORT, () => {
            console.log(`\nBackend server running on http://localhost:${PORT}`);
            console.log('Ensure you are running this with "sudo node backend/server.js" for full functionality.\n');

            // --- START ALL BACKGROUND SERVICES ---
            startDnsMonitoring();
            console.log(`[Service] DNS traffic monitoring is active.`);

            performDeviceScan();
            setInterval(performDeviceScan, DEVICE_SCAN_INTERVAL);
            console.log(`[Service] Network device scanning is active.`);

            monitorHostConnection();
            setInterval(monitorHostConnection, HOST_MONITOR_INTERVAL);
            console.log(`[Service] Host connection monitoring is active.`);
        });
    } catch (e) {
        console.error(`[MongoDB] Connection Error: ${e.message}`);
        process.exit(1);
    }

    process.on('SIGINT', async () => {
        console.log("\n[System] Shutting down. Closing MongoDB connection...");
        await client.close();
        process.exit(0);
    });
}

main();