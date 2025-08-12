import React, { useState, useEffect } from "react";
import "../../Styles/WifiPage.css";

const WifiDashboard = () => {
  const [wifiData, setWifiData] = useState({
    phy: "phy#0",
    interface: "wlp4s0",
    ifindex: 4,
    wdev: "0x1",
    addr: "14:d4:24:1b:9a:2b",
    ssid: "Wifi_analyzer",
    type: "AP",
    channel: "6 (2437 MHz), width: 20 MHz (no HT), center1: 2437 MHz",
    txpower: "3.00 dBm",
    multicast: {
      qsz_byt: 0,
      qsz_pkt: 0,
      flows: 13079,
      drops: 0,
      marks: 0,
      overlmt: 0,
      hashcol: 4,
      tx_bytes: 948726,
      tx_packets: 13361,
    },
  });

  // Simulate dynamic updates to signal and TX/RX values
  useEffect(() => {
    const interval = setInterval(() => {
      setWifiData((prev) => ({
        ...prev,
        txpower: `${(Math.random() * 5).toFixed(2)} dBm`,
        multicast: {
          ...prev.multicast,
          tx_bytes: prev.multicast.tx_bytes + Math.floor(Math.random() * 1000),
          tx_packets:
            prev.multicast.tx_packets + Math.floor(Math.random() * 10),
          flows: prev.multicast.flows + Math.floor(Math.random() * 3),
        },
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="wifi-dashboard">
      <div className="wifi-card">
        <h1 className="wifi-title">📡 Wi-Fi Analyzer Dashboard</h1>

        <div className="wifi-section">
          <h2>General Info</h2>
          <table>
            <tbody>
              <tr>
                <th>PHY</th>
                <td>{wifiData.phy}</td>
              </tr>
              <tr>
                <th>Interface</th>
                <td>{wifiData.interface}</td>
              </tr>
              <tr>
                <th>Index</th>
                <td>{wifiData.ifindex}</td>
              </tr>
              <tr>
                <th>WDEV</th>
                <td>{wifiData.wdev}</td>
              </tr>
              <tr>
                <th>MAC Address</th>
                <td>{wifiData.addr}</td>
              </tr>
              <tr>
                <th>SSID</th>
                <td>{wifiData.ssid}</td>
              </tr>
              <tr>
                <th>Type</th>
                <td>{wifiData.type}</td>
              </tr>
              <tr>
                <th>Channel</th>
                <td>{wifiData.channel}</td>
              </tr>
              <tr>
                <th>TX Power</th>
                <td className="signal-strength">{wifiData.txpower}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="wifi-section">
          <h2>Multicast TXQ</h2>
          <table>
            <thead>
              <tr>
                <th>Flows</th>
                <th>TX Bytes</th>
                <th>TX Packets</th>
                <th>Hash Collisions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{wifiData.multicast.flows}</td>
                <td className="tx">{wifiData.multicast.tx_bytes}</td>
                <td className="rx">{wifiData.multicast.tx_packets}</td>
                <td>{wifiData.multicast.hashcol}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WifiDashboard;
