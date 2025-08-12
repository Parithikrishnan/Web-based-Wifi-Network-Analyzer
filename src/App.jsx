// src/App.jsx

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css'; 

// --- Import all your page components ---
import LoginPage from './Pages/Login.jsx';
import Dashboard from './Pages/Dashboard/Dashboard.jsx';
import WifiPage from './Pages/Dashboard/WifiPage.jsx';
import DevicesPage from './Pages/Dashboard/DevicesPage.jsx';
import TrafficPage from './Pages/Dashboard/TrafficPage.jsx';
import DomainSummaryPage from './Pages/Dashboard/DomainSummaryPage.jsx';
import SecurityPage from './Pages/Dashboard/SecurityPage.jsx';

// The ProtectedRoute import has been removed.

function App() {
  return (
    <div className="App">
      <Routes>
        {/* --- All Routes are now public --- */}
        {/* The user can navigate to any of these pages directly. */}

        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/dashboard"       element={<Dashboard />} />
        <Route path="/wifi-details"    element={<WifiPage />} />
        <Route path="/devices"         element={<DevicesPage />} />
        <Route path="/traffic"         element={<TrafficPage />} />
        <Route path="/domain-summary" element={<DomainSummaryPage />} />
        <Route path="/security" element={<SecurityPage />} />
        
      </Routes>
    </div>
  );
}

export default App;