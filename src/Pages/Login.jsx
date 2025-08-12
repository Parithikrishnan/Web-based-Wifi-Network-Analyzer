// src/Pages/Login/Login.jsx

import React from 'react';
// We now import useNavigate to handle the button click.
import { useNavigate } from 'react-router-dom';
// The import path for your CSS file.
import '../Styles/Login.css';

const Login = () => {
  // Initialize the navigate function from the hook.
  const navigate = useNavigate();

  // This function runs when the form is submitted.
  const handleLogin = (event) => {
    // Prevent the browser from reloading the page.
    event.preventDefault();
    console.log("Login form submitted. Navigating to dashboard...");
    // Programmatically navigate to the '/dashboard' route.
    navigate('/dashboard');
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src="https://i.imgur.com/8UPd4h5.png" alt="Logo" className="logo" />
          <h2>Network Control</h2>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              className="input-field" 
              placeholder="admin@network.com" 
              required 
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              className="input-field" 
              placeholder="••••••••" 
              required 
            />
          </div>
          <button type="submit" className="login-button">Authenticate</button>
        </form>
      </div>
    </div>
  );
};

export default Login;