import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../Styles/SecurityPage.css';
import { FaTrash } from 'react-icons/fa';

const SecurityPage = () => {
    const [blockedSites, setBlockedSites] = useState([]);
    const [siteToBlock, setSiteToBlock] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const fetchBlockedSites = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/security/blocked');
            const data = await response.json();
            setBlockedSites(data);
        } catch (err) {
            setError('Could not fetch blocked sites list.');
        }
    };

    useEffect(() => {
        fetchBlockedSites();
    }, []);

    const handleBlock = async (event) => {
        event.preventDefault();
        setMessage('');
        setError('');

        if (!siteToBlock) {
            setError('Please enter a website URL.');
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/security/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hostname: siteToBlock }),
            });
            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                setSiteToBlock('');
                fetchBlockedSites();
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to connect to the server.');
        }
    };

    const handleUnblock = async (hostname) => {
        try {
            const response = await fetch('http://localhost:3001/api/security/unblock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hostname: hostname }),
            });
            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                fetchBlockedSites();
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to connect to the server.');
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Security Center: Website Blocker</h1>
                <Link to="/dashboard" className="back-button">&larr; Back to Dashboard</Link>
            </header>

            <div className="security-layout">
                <div className="security-panel">
                    <h2>Block a Website</h2>
                    <p className="panel-description">
                        Enter a website URL (e.g., facebook.com) to block access to it from this machine.
                    </p>
                    <form onSubmit={handleBlock} className="block-form">
                        <input 
                            type="text" 
                            value={siteToBlock}
                            onChange={(e) => setSiteToBlock(e.target.value)}
                            className="url-input" 
                            placeholder="example.com"
                        />
                        <button type="submit" className="block-button">Block Website</button>
                    </form>
                    {message && <p className="success-message">{message}</p>}
                    {error && <p className="error-message">{error}</p>}
                </div>
                <div className="security-panel">
                    <h2>Currently Blocked Websites</h2>
                    <div className="blocked-list-container">
                        {blockedSites.length > 0 ? (
                            blockedSites.map(site => (
                                <div key={site} className="blocked-item">
                                    <span className="blocked-name">{site}</span>
                                    <button 
                                        className="unblock-button"
                                        title={`Unblock ${site}`}
                                        onClick={() => handleUnblock(site)}
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="placeholder-text">No websites are currently blocked.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityPage;