// src/Pages/DomainSummaryPage/DomainSummaryPage.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../Styles/DomainSummaryPage.css'; // We'll create this CSS file next

const DomainSummaryPage = () => {
    const [domains, setDomains] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDomainSummary = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('http://localhost:3001/api/traffic/domain-summary');
                if (!response.ok) {
                    throw new Error('Failed to fetch domain summary data.');
                }
                const data = await response.json();
                setDomains(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDomainSummary();
    }, []); // The empty dependency array means this runs only once when the page loads

    return (
        <div className="summary-page-container">
            <header className="summary-page-header">
                <h1>Global Domain Visit Summary</h1>
                <Link to="/dashboard" className="back-button">&larr; Back to Dashboard</Link>
            </header>

            {error && <p className="error-message">{error}</p>}
            
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Domain Name</th>
                            <th className="text-center">Total Visits</th>
                            <th>First Seen</th>
                            <th>Last Seen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="5" className="loading-text">Loading domain data...</td></tr>
                        ) : (
                            domains.map((domain, index) => (
                                <tr key={domain._id}>
                                    <td>{index + 1}</td>
                                    <td className="domain-cell">{domain.domain}</td>
                                    <td className="text-center">{domain.visitCount}</td>
                                    <td>{new Date(domain.firstQueriedAt).toLocaleString()}</td>
                                    <td>{new Date(domain.lastQueriedAt).toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DomainSummaryPage;