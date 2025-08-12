// src/Pages/DevicesPage/DevicesPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../Styles/DevicesPage.css';

const DevicesPage = () => {
    const [devices, setDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);

    const fetchDevices = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/devices');
            const data = await response.json();
            setDevices(data);
        } catch (error) {
            console.error("Failed to fetch devices:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleScan = async () => {
        setIsScanning(true);
        try {
            await fetch('http://localhost:3001/api/devices/scan', { method: 'POST' });
            // Wait a few seconds for scan to complete before fetching results
            setTimeout(() => {
                fetchDevices();
                setIsScanning(false);
            }, 5000); // 5 second delay
        } catch (error) {
            console.error("Failed to initiate scan:", error);
            setIsScanning(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Device Registry</h1>
                <div className="header-actions">
                    <button onClick={handleScan} disabled={isScanning} className="scan-button">
                        {isScanning ? 'Scanning...' : 'Scan for Devices'}
                    </button>
                    <Link to="/dashboard" className="back-button">&larr; Back to Dashboard</Link>
                </div>
            </header>
            <div className="content-container">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>IP Address</th>
                                <th>MAC Address</th>
                                <th>Vendor</th>
                                <th>Last Seen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="4">Loading devices...</td></tr>
                            ) : (
                                devices.map(device => (
                                    <tr key={device.mac}>
                                        <td>{device.ip}</td>
                                        <td>{device.mac}</td>
                                        <td className="vendor-cell">{device.vendor}</td>
                                        <td>{new Date(device.lastSeenAt).toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DevicesPage;