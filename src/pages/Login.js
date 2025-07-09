// pages/Login.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { UserRoleManagerContract } from "../contracts/contract";
import web3 from "../utils/web3";


const Login = () => {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    const fetchWalletAndUser = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);

            // Fetch username from Firebase
            const userRef = doc(db, "users", accounts[0]);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              setUsername(userSnap.data().name);
            }
          }
        } catch (error) {
          console.error("Error fetching wallet and user:", error);
        }
      }
    };

    fetchWalletAndUser();
  }, []);

  const handleVerify = async () => {
    try {
      if (!window.ethereum) {
        alert("❌ MetaMask not detected. Please install MetaMask.");
        return;
      }

      // Request wallet connection
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const wallet = accounts[0];
      setWalletAddress(wallet);

      // **MetaMask Signature Confirmation**
      const message = `Login verification for wallet: ${wallet}`;
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, wallet],
      });

      if (!signature) {
        alert("❌ MetaMask signature rejected. Please try again.");
        return;
      }

      // Fetch role from smart contract
      const userRole = await UserRoleManagerContract.methods.getRole(wallet).call();
      let formattedRole = "No Role Assigned";

      if (userRole === "Task Creator") {
        formattedRole = "Task Creator";
      } else if (userRole === "Task Solver") {
        formattedRole = "Task Solver";
      }
      setRole(formattedRole);

      // **Show Pop-up with Username & Role**
      setTimeout(() => {
        alert(`🎉 Welcome ${username}!\nYour Role: ${formattedRole}`);
        
        // Redirect based on role
        if (formattedRole === "Task Creator") {
          navigate("/creator");
        } else if (formattedRole === "Task Solver") {
          navigate("/solver");
        } 
      }, 500); // Delay for smoother UI update

    } catch (error) {
      console.error("Error verifying user:", error);
      alert("❌ Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600">
      <div className="bg-white p-10 rounded-xl shadow-xl max-w-md w-full text-center">
        {username && <h2 className="text-3xl font-bold text-blue-500">{`Welcome ${username}!`}</h2>}
        <p className="text-gray-600 mt-2">Verify your account to access your dashboard.</p>

        {/* Wallet Address Input Field (Non-Editable) */}
        <input
          type="text"
          value={walletAddress}
          placeholder="Connect your wallet"
          disabled
          className="w-full mt-4 px-4 py-3 rounded-lg bg-gray-200 border border-gray-300 text-gray-500"
        />

        <button 
          onClick={handleVerify} 
          className="w-full mt-6 bg-purple-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-500 transition"
        >
          Verify & Login
        </button>
      </div>
    </div>
  );
};

export default Login;






