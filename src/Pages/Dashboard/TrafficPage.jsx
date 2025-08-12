// src/Pages/TrafficPage/TrafficPage.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../Styles/TrafficPage.css';

const TrafficPage = () => {
    const [ips, setIps] = useState([]);
    const [selectedIp, setSelectedIp] = useState(null);
    const [visitedDomains, setVisitedDomains] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch the list of unique IPs when the component loads
    useEffect(() => {
        const fetchUniqueIps = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/traffic/ips');
                const data = await response.json();
                setIps(data);
            } catch (error) {
                console.error("Failed to fetch IPs:", error);
            }
        };
        fetchUniqueIps();
    }, []);

    // This function fetches the domains for the clicked IP
    const handleIpClick = async (ip) => {
        setSelectedIp(ip);
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:3001/api/traffic/ip/${ip}`);
            const data = await response.json();
            setVisitedDomains(data);
        } catch (error) {
            console.error(`Failed to fetch domains for ${ip}:`, error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>DNS Traffic Explorer</h1>
                <Link to="/dashboard" className="back-button">&larr; Back to Dashboard</Link>
            </header>
            <div className="explorer-layout">
                {/* --- Left Panel: List of IPs --- */}
                <div className="explorer-panel ip-list-panel">
                    <h2>Source IPs</h2>
                    <div className="list-container">
                        {ips.length > 0 ? (
                            ips.map(ip => (
                                <button 
                                    key={ip} 
                                    className={`list-item-button ${selectedIp === ip ? 'active' : ''}`}
                                    onClick={() => handleIpClick(ip)}
                                >
                                    {ip}
                                </button>
                            ))
                        ) : (
                            <p className="placeholder-text">No DNS traffic recorded yet.</p>
                        )}
                    </div>
                </div>

                {/* --- Right Panel: Visited Domains --- */}
                <div className="explorer-panel domain-list-panel">
                    <h2>Visited Domains for {selectedIp || '...'}</h2>
                    <div className="list-container">
                        {isLoading ? (
                            <p className="placeholder-text">Loading...</p>
                        ) : selectedIp ? (
                            visitedDomains.length > 0 ? (
                                visitedDomains.map(visit => (
                                    <div key={visit._id} className="domain-entry">
                                        <span className="domain-name">{visit.domain}</span>
                                        <span className="visit-count">{visit.visitCount} visits</span>
                                    </div>
                                ))
                            ) : (
                                <p className="placeholder-text">No domain data for this IP.</p>
                            )
                        ) : (
                            <p className="placeholder-text">Select an IP address from the left to see details.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrafficPage;