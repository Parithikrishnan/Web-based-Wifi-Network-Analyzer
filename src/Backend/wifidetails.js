// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { exec } from "child_process";

const app = express();
const PORT = 3008;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/wifiData", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("[MongoDB] Connected"))
  .catch(err => console.error("[MongoDB] Connection error:", err));

const wifiSchema = new mongoose.Schema({
  interface: String,
  ssid: String,
  bssid: String,
  freq: String,
  signal: String,
  rx: String,
  tx: String,
  txBitrate: String,
  connected: Boolean,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const WifiModel = mongoose.model("WifiDetail", wifiSchema);

// Function to get WiFi details
function getWifiDetails(callback) {
  const interfaceName = "wlp4s0"; // Change this to your WiFi interface name

  exec(`iw dev ${interfaceName} link`, (err, stdout) => {
    if (err || !stdout.includes("Connected")) {
      return callback(null, {
        connected: false,
        message: "Not connected to any WiFi network",
        interface: interfaceName
      });
    }

    const details = { connected: true, interface: interfaceName };
    const lines = stdout.split("\n");

    lines.forEach(line => {
      if (line.includes("SSID:")) details.ssid = line.split("SSID:")[1].trim();
      if (line.includes("Connected to")) details.bssid = line.split("Connected to")[1].split(" ")[1].trim();
      if (line.includes("freq:")) details.freq = line.split("freq:")[1].trim();
      if (line.includes("signal:")) details.signal = line.split("signal:")[1].trim();
      if (line.startsWith("RX:")) details.rx = line.replace("RX:", "").trim();
      if (line.startsWith("TX:")) details.tx = line.replace("TX:", "").trim();
      if (line.includes("tx bitrate:")) details.txBitrate = line.split("tx bitrate:")[1].trim();
    });

    callback(null, details);
  });
}

// Store once in database at server start
getWifiDetails((err, data) => {
  if (data) {
    const wifi = new WifiModel(data);
    wifi.save()
      .then(() => console.log("[MongoDB] WiFi data stored:", data))
      .catch(err => console.error("[MongoDB] Error saving data:", err));
  }
});

// API: Get latest WiFi details
app.get("/api/wifi-details", async (req, res) => {
  const latestData = await WifiModel.findOne().sort({ timestamp: -1 });
  if (!latestData) {
    return res.status(404).json({ connected: false, message: "No data available yet" });
  }
  res.json(latestData);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
