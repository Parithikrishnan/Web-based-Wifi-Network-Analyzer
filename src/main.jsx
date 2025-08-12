// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// We only need the BrowserRouter now.
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* The AuthProvider has been removed */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);