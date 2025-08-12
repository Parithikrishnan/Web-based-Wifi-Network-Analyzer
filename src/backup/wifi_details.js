import { exec } from 'child_process';
import { MongoClient } from 'mongodb';
import express from 'express';
import http from 'http';
import cors from 'cors';

// --- CONFIGURATION ---
const INTERFACE_NAME = 'wlp4s0'; // IMPORTANT: Change to your active Wi-Fi interface
const MONGO_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'wifi';
// This collection will now store the complete, live snapshot
const COLLECTION_NAME = 'connection_details'; 
const PORT = 3001;
const MONITOR_INTERVAL = 1000; // Update the database every second

// --- SERVER SETUP ---
const app = express();
app.use(cors());
const server = http.createServer(app);

// --- GLOBAL STATE ---
let db; // This will hold the database connection object

// --- HELPER FUNCTIONS ---

// This function is perfect as-is. It correctly parses the command output.
function parseIwOutput(output) {
  const lines = output.split('\n').map(line => line.trim());
  const data = { connected: true };
  lines.forEach(line => {
    if (line.startsWith('Connected to')) {
      const match = line.match(/Connected to ([\da-f:]+) \(on (.+)\)/);
      if (match) {
        data.bssid = match[1];
        data.interface = match[2];
      }
    } else if (line.startsWith('SSID:')) {
      data.ssid = line.split('SSID:')[1].trim();
    } else if (line.startsWith('freq:')) {
      data.freq = line.split('freq:')[1].trim();
    } else if (line.startsWith('signal:')) {
      data.signal = line.split('signal:')[1].trim();
    } else if (line.startsWith('rx bitrate:')) {
      data.rxBitrate = line.split('rx bitrate:')[1].trim();
    } else if (line.startsWith('tx bitrate:')) {
      data.txBitrate = line.split('tx bitrate:')[1].trim();
    } else if (line.startsWith('RX:')) {
      const match = line.match(/RX: (\d+) bytes/);
      if (match) data.rxBytes = parseInt(match[1], 10);
    } else if (line.startsWith('TX:')) {
      const match = line.match(/TX: (\d+) bytes/);
      if (match) data.txBytes = parseInt(match[1], 10);
    } else if (line.startsWith('bss flags:')) {
      data.bssFlags = line.split('bss flags:')[1].trim();
    } else if (line.startsWith('dtim period:')) {
      data.dtimPeriod = line.split('dtim period:')[1].trim();
    } else if (line.startsWith('beacon int:')) {
      data.beaconInt = line.split('beacon int:')[1].trim();
    }
  });
  return data;
}

/**
 * Saves the entire snapshot of connection details to MongoDB.
 * It uses a single document per interface, creating it or updating it as needed.
 * @param {object} connectionData The complete data object from parseIwOutput.
 */
async function saveAllConnectionDetails(connectionData) {
  // We need a stable key to update on. The interface name is perfect.
  const filter = { interface: connectionData.interface };
  
  const updateDoc = {
    $set: {
      ...connectionData,
      lastUpdatedAt: new Date() // Add a timestamp for freshness
    }
  };

  try {
    const collection = db.collection(COLLECTION_NAME);
    // Use upsert:true to create the document if it doesn't exist, or update it if it does.
    await collection.updateOne(filter, updateDoc, { upsert: true });
  } catch (err) {
    console.error("[MongoDB] Error saving connection details:", err);
  }
}

// --- API ENDPOINT ---
/**
 * Provides the latest connection details by fetching the single document
 * from the database for the monitored interface.
 */
app.get('/api/wifi-details', async (req, res) => {
  if (!db) {
    return res.status(503).json({ message: 'Database not connected yet. Please try again.' });
  }

  try {
    // Find the single document that matches our interface name.
    const details = await db.collection(COLLECTION_NAME).findOne({ interface: INTERFACE_NAME });
    
    if (details) {
      res.json(details);
    } else {
      res.status(404).json({ message: 'No Wi-Fi details have been saved yet. The first scan may be in progress.' });
    }
  } catch (error) {
    console.error('[API] Error fetching Wi-Fi details:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});


// --- MAIN SERVER FUNCTION ---
async function main() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    db = client.db(DB_NAME);
    console.log('[MongoDB] Successfully connected.');

    // This function replaces the old fetchAndProcessWifiDetails logic
    const monitorAndStoreWifiDetails = () => {
      exec(`iw dev ${INTERFACE_NAME} link`, async (err, stdout) => {
        if (err) {
          // If not connected, update the DB to reflect this status
          if (err.message.includes('Not connected')) {
            await saveAllConnectionDetails({ interface: INTERFACE_NAME, connected: false });
          }
          return;
        }

        // If connected, parse all data and save it to the database
        const allData = parseIwOutput(stdout);
        await saveAllConnectionDetails(allData);
      });
    };

    // Start the Express server
    server.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
      console.log(`Endpoint available at: http://localhost:${PORT}/api/wifi-details`);

      // Start the background monitoring service
      setInterval(monitorAndStoreWifiDetails, MONITOR_INTERVAL);
      console.log(`[Monitor] Started monitoring and saving details for interface "${INTERFACE_NAME}" every ${MONITOR_INTERVAL}ms.`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log("\n[System] Shutting down. Closing MongoDB connection...");
        await client.close();
        process.exit(0);
    });

  } catch (e) {
    console.error(`[FATAL] Could not connect to MongoDB. Is it running?`);
    console.error(e.message);
    process.exit(1);
  }
}

main();