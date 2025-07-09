
// pages/Signup.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { UserRoleManagerContract } from "../contracts/contract"; // Import contract
import web3 from "../utils/web3"; // Import Web3

const Signup = () => {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    const initWallet = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
          setWalletAddress(accounts[0]);
        } catch (error) {
          console.error("MetaMask connection error:", error);
          alert("Please connect to MetaMask.");
        }
      } else {
        alert("MetaMask is required to use this application.");
      }
    };
    initWallet();
  }, []);

  const saveRoleToBlockchain = async () => {
    if (!walletAddress || !role) {
      alert("Wallet and role are required!");
      return;
    }

    try {
      const accounts = await web3.eth.getAccounts(); // Fetch MetaMask account

      // Call the `updateRole` function on the smart contract
      await UserRoleManagerContract.methods
        .updateRole(walletAddress, role)
        .send({ from: accounts[0] });

      alert("Role saved to blockchain!");
    } catch (error) {
      console.error("Blockchain transaction failed:", error);
      alert("Failed to save role on blockchain.");
    }
  };

  const handleSignup = async () => {
    if (!name || !email || !role) {
      alert("All fields are required!");
      return;
    }

    const userRef = doc(db, "users", walletAddress);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      alert("Account already registered!");
      navigate("/login");
    } else {
      await setDoc(userRef, { name, email, role, wallet: walletAddress });
      await saveRoleToBlockchain(); // Save role in blockchain
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h2 className="text-3xl font-bold text-center text-blue-500">Create an Account</h2>
        <p className="text-center text-gray-600 mt-2">Join DeTaskify and revolutionize task management!</p>
        <div className="mt-6 space-y-4">
          <input 
            type="text" 
            placeholder="Name" 
            onChange={(e) => setName(e.target.value)} 
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
          <input 
            type="email" 
            placeholder="Email" 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
          <select 
            onChange={(e) => setRole(e.target.value)} 
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Role</option>
            <option value="Task Creator">Task Creator</option>
            <option value="Task Solver">Task Solver</option>
          </select>
          <input 
            type="text" 
            value={walletAddress} 
            disabled 
            className="w-full px-4 py-3 rounded-lg bg-gray-200 border border-gray-300 text-gray-500"
          />
          <button 
            onClick={handleSignup} 
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-purple-600 transition"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;
