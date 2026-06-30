import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Welcome.css";

const PostLoginWelcome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const timer = setTimeout(() => {
      if (user?.role === "admin" || user?.role === "hr") {
        navigate("/admin");
      }
      else if (user?.role === "tl") {
        navigate("/tl");
      }
      else {
        navigate("/employee");
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="welcome-container">
      <div className="welcome-overlay"></div>
      
      <div className="welcome-content">
        <h1 className="welcome-title" style={{ animation: "bouncePop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)" }}>
          Welcome To
        </h1>
        
        <h2 className="welcome-brand" style={{ animation: "bouncePop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.1s both" }}>
          LEAD MAGNETS
        </h2>
        
        <p style={{
          color: "#cbd5e1",
          fontSize: "1.5rem",
          marginTop: "20px",
          fontWeight: "500",
          animation: "bouncePop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.2s both"
        }}>
          Hello, {user?.name}
        </p>
        
        <p style={{
          color: "#94a3b8",
          fontSize: "0.9rem",
          marginTop: "10px",
          animation: "fadeIn 0.5s ease-out 0.3s both"
        }}>
          Redirecting you to your dashboard...
        </p>
      </div>

      <style>{`
        @keyframes bouncePop {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default PostLoginWelcome;