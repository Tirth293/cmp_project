import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "./Transparent logo.png";
import "./Welcome.css";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="welcome-container">
      <div className="welcome-overlay"></div>
      
      <div className="welcome-content">
        {/* Logo Section */}
        <img
          src={logo}
          alt="Lead Magnets"
          className="welcome-logo"
        />
        
        {/* Main Title with Red Lead and Blue Magnets */}
        <h1 className="welcome-title">
          Welcome to{' '}
          <span style={{ color: '#ef4444' }}>Lead</span>{' '}
          <span style={{ color: '#3b82f6' }}>Magnets</span>
        </h1>
        
        {/* Button Group */}
        <div className="button-group">
          <button
            className="continue-btn"
            onClick={() => navigate("/login")}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;