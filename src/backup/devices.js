import { exec } from 'child_process';
import { MongoClient } from 'mongodb';
import macOui from 'mac-oui-lookup';

const macLookup = macOui.default;

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'wifi';
const COLLECTION_NAME = 'devices';

function parseArpScan(output) {
  const lines = output.split('\n');
  const devices = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (
      parts.length >= 2 &&
      /^\d+\.\d+\.\d+\.\d+$/.test(parts[0]) &&
      /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(parts[1])
    ) {
      devices.push({
        ip: parts[0],
        mac: parts[1].toLowerCase(),
      });
    }
  }

  return devices;
}

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

async function runNmapOSDetection(ip) {
  try {
    const output = await runCommand(`nmap -O --osscan-guess ${ip}`);
    const match = output.match(/OS details: (.+)/);
    if (match && match[1]) return match[1];
  } catch {
    // ignore errors silently
  }
  return 'Unknown';
}

async function saveDeviceToMongo(device, db) {
  try {
    const collection = db.collection(COLLECTION_NAME);
    const filter = { ip: device.ip, mac: device.mac };
    const updateDoc = {
      $set: {
        vendor: device.vendor,
        os: device.os,
        lastSeenAt: new Date(),
      },
      $setOnInsert: {
        firstSeenAt: new Date(),
      },
    };
    const options = { upsert: true };
    await collection.updateOne(filter, updateDoc, options);
  } catch (e) {
    console.error('MongoDB save error:', e.message);
  }
}

async function scanAndStoreDevices() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    let arpOutput;
    try {
      arpOutput = await runCommand('sudo arp-scan --localnet');
    } catch (err) {
      console.error('arp-scan error:', err.message);
      return;
    }

    const devices = parseArpScan(arpOutput);

    for (const device of devices) {
      let vendor = macLookup(device.mac) || 'Unknown';
      let os = 'Unknown';

      if (vendor === 'Unknown') {
        os = await runNmapOSDetection(device.ip);
        if (os === 'Unknown') {
          vendor = 'Unknown';
        } else {
          vendor = os; // If OS guess available, use as vendor
        }
      }

      device.vendor = vendor;
      device.os = os;

      await saveDeviceToMongo(device, db);
    }

    await client.close();
  } catch (e) {
    console.error('MongoDB connection error:', e.message);
  }
}

scanAndStoreDevices();
