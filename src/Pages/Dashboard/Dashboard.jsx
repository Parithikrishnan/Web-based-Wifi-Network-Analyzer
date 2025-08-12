// src/Pages/Dashboard/Dashboard.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// The import path for your CSS file, as you specified.
import '../../Styles/Dashboard.css';

// Import all the icons you need
import { 
  FaWifi, FaLaptop, FaExchangeAlt, FaGlobe, FaShieldAlt, 
  FaSignOutAlt, FaBars, FaTimes, FaCog, FaFileAlt
} from 'react-icons/fa';

// This array defines the content for each navigation card on the dashboard.
const navItems = [
  { 
    path: '/wifi-details', 
    icon: <FaWifi />, 
    label: 'WiFi Analysis', 
    description: 'Review real-time signal strength, security protocols, and connection properties for the active network.' 
  },
  { 
    path: '/devices', 
    icon: <FaLaptop />, 
    label: 'Device Registry', 
    description: 'Scan the local network to discover, identify, and list all connected hardware endpoints and their vendors.' 
  },
  { 
    path: '/traffic', 
    icon: <FaExchangeAlt />, 
    label: 'IP Traffic Explorer',
    description: 'Explore DNS queries on a per-IP basis to see which devices are accessing specific domains.' 
  },
  { 
    path: '/domain-summary',
    icon: <FaGlobe />,
    label: 'Domain Summary',
    description: 'View a global summary of all visited domains, sorted by the most frequently accessed across the network.'
  },
  { 
    path: '/security', // Using '#' for inactive links
    icon: <FaShieldAlt />, 
    label: 'Security Center', 
    description: 'Audit firewall rules, check for vulnerabilities, and manage access control lists to secure the network.' 
  },
];


const Dashboard = () => {
  // State to manage the visibility of the dropdown menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="page-wrapper">
      {/* --- The Global Header --- */}
      <header className="main-header">
        <div className="header-left">
          <h1>Network Command Console</h1>
        </div>
        <div className="header-right">
          <p className="admin-info">User: <strong>ADMIN</strong></p>
          <div className="nav-menu-container">
            <button className="nav-menu-button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <FaTimes /> : <FaBars />}
              <span>Navigate</span>
            </button>
            {isMenuOpen && (
              <div className="dropdown-menu">
                <Link to="#"><FaCog /> Settings</Link>
              </div>
            )}
          </div>
          {/* This is now a simple Link component, not a button with a function */}
          <Link to="/login" className="logout-button">
            <FaSignOutAlt />
            <span>Logout</span>
          </Link>
        </div>
      </header>
      
      {/* --- The Main Grid of Navigation Cards --- */}
      <main className="grid-container">
        {/* We map over the navItems array to create each card automatically */}
        {navItems.map((item, index) => (
          <Link to={item.path} key={index} className="grid-card">
            <div className="card-icon">
              {item.icon}
            </div>
            <h3 className="card-title">{item.label}</h3>
            <p className="card-description">{item.description}</p>
          </Link>
        ))}
      </main>
    </div>
  );
};

export default Dashboard;