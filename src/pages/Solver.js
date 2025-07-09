import React, { useState, useEffect, useRef } from 'react';
import { TaskManagerContract } from '../contracts/contract';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { File, ClipboardList, History, UserCheck, PlayCircle , Wallet2, Hourglass, Timer, Wallet} from 'lucide-react';
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Web3 from "web3";
import axios from 'axios';

const PINATA_API_KEY = '5e63aaec79625a357b47';
const PINATA_SECRET_API_KEY = '0d641199d4163e4738c1c6f073203168cbea1a07cab2d94e39c937f6d3dc9ce7';


const formatCountdown = (deadline) => {
  const now = new Date().getTime();
  const end = deadline * 1000;
  const diff = end - now;

  if (diff <= 0) return { text: "Deadline missed!", isUrgent: true };

  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  const text = `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m ${seconds}s left`;
  const isUrgent = diff < 24 * 60 * 60 * 1000; // Less than 24 hours

  return { text, isUrgent };
};


const Solver = () => {
  const [account, setAccount] = useState(null);
  const [isMetaMaskConnected, setIsMetaMaskConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('browseTasks');
  const [tasks, setTasks] = useState([]);
  const [appliedTasks, setAppliedTasks] = useState([]);
  const [ongoingTasks, setOngoingTasks] = useState([]);
  const acknowledgedTaskIds = useRef(new Set());

  const [walletAddress, setWalletAddress] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [skills, setSkills] = useState("");
  const [designation, setDesignation] = useState("");
  const [workExperience, setWorkExperience] = useState("");

  const [selectedFiles, setSelectedFiles] = useState({});
  const [txHashes, setTxHashes] = useState({});

  const [rewardBalance, setRewardBalance] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [slotCount, setSlotCount] = useState(0); // number of engaged slots (max 3)



  
  const [persistedAcks, setPersistedAcks] = useState(new Set());

  const web3 = new Web3(window.ethereum);


  useEffect(() => {
    const fetchUserDetails = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            const wallet = accounts[0];
            setWalletAddress(wallet);
            setAccount(wallet);
            setIsMetaMaskConnected(true);

            const userRef = doc(db, "users", wallet);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const data = userSnap.data();
              setUsername(data.name || "");
              setEmail(data.email || "");
              setPhoneNo(data.phoneNo || "");
              setSkills(data.skills || "");
              setDesignation(data.designation || "");
              setWorkExperience(data.workExperience || "");
            }

            await fetchAvailableTasks(wallet);
            await fetchAppliedTasks(wallet);
            await fetchOngoingTasks(wallet);
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
        }
      }
    };
    fetchUserDetails();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setOngoingTasks((prev) => [...prev]); // Trigger re-render every second
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
      checkMetaMaskConnection();
    }
  }, []);

  useEffect(() => {
    if (account) {
      fetchCompletedTasks(account);
      fetchRewardBalance(account);
    }
  }, [account]);

  const fetchCompletedTasks = async (account) => {
    try {
      // First get all tasks
      const allTasksData = await TaskManagerContract.methods.getAllTasks().call();
      const completed = [];
      
      // Loop through all tasks to find completed ones
      for (let i = 0; i < allTasksData[0].length; i++) {
        const taskId = allTasksData[0][i];
        const task = await TaskManagerContract.methods.getTask(taskId).call();
        
        // Check if task is Accepted/Completed and solver is current user
        if ((task.status === "Accepted" || task.status === "Completed") && 
            task.solver.toLowerCase() === account.toLowerCase()) {
          
          completed.push({
            taskId,
            taskName: task.taskName,
            rewards: web3.utils.fromWei(task.rewards, 'ether'),
            creator: task.creator,
            submissionHash: task.submissionHashes.length > 0 
              ? task.submissionHashes[task.submissionHashes.length - 1]
              : null
          });
        }
      }
      
      setCompletedTasks(completed);
    } catch (error) {
      console.error('Error fetching completed tasks:', error);
    }
  };

  const checkMetaMaskConnection = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      setIsMetaMaskConnected(true);
      fetchAvailableTasks(accounts[0]);
      fetchAppliedTasks(accounts[0]);
      fetchOngoingTasks(accounts[0]);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
      setIsMetaMaskConnected(false);
    } else {
      setAccount(accounts[0]);
      setIsMetaMaskConnected(true);
      fetchAvailableTasks(accounts[0]);
      fetchAppliedTasks(accounts[0]);
      fetchOngoingTasks(accounts[0]);
    }
  };

  const connectMetaMask = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(accounts[0]);
    setIsMetaMaskConnected(true);
    fetchAvailableTasks(accounts[0]);
    fetchAppliedTasks(accounts[0]);
    fetchOngoingTasks(accounts[0]);
  };

  const fetchAvailableTasks = async (account) => {
    try {
      const tasksData = await TaskManagerContract.methods.getAllTasks().call();
      const allTasks = tasksData[0].map((taskId, index) => ({
        taskId,
        taskName: tasksData[1][index],
        deadline: Number(tasksData[2][index]),
        rewards: tasksData[3][index],
        status: tasksData[4][index],
        creator: tasksData[5][index],
        taskDescription: tasksData[6][index],
      }));
  
      // ? Show only OPEN or REJECTED tasks
      const browseableTasks = allTasks.filter(
        (task) =>
          task.status.toLowerCase() === "open" ||
          task.status.toLowerCase() === "rejected"
      );
  
      setTasks(browseableTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };
  
  

  const fetchAppliedTasks = async (account) => {
    try {
      const rejectedTaskIds = await TaskManagerContract.methods.getMyRejectedRequests().call({ from: account });

      for (const taskId of rejectedTaskIds) {
        const taskData = await TaskManagerContract.methods.getTask(taskId).call();
        const ackedKey = `reject_ack_${taskId}`;

        if (!sessionStorage.getItem(ackedKey)) {
         toast.error(`❌ Your application for task "${taskData.taskName}" was rejected by the creator`, {
         autoClose: 7000
          });
         sessionStorage.setItem(ackedKey, 'true');
        }
      }



      const approvedTaskIds = await TaskManagerContract.methods.getApprovedTasksForSolver(account).call();
      const approvedTasks = [];
      for (const taskId of approvedTaskIds) {
        const taskData = await TaskManagerContract.methods.getTask(taskId).call();
        if (taskData.status.includes("Assigned")) {
          approvedTasks.push({
            taskId,
            taskName: taskData.taskName,
            taskDescription: taskData.taskDescription,
            deadline: Number(taskData.deadline),
            rewards: taskData.rewards,
            creator: taskData.creator,
          });
        }
      }
      setAppliedTasks(approvedTasks);
    } catch (error) {
      console.error('Error fetching applied tasks:', error);
    }
  };

  const fetchOngoingTasks = async (account) => {
    try {
      const approvedTaskIds = await TaskManagerContract.methods.getApprovedTasksForSolver(account).call();
      const ongoing = [];
  
      for (const taskId of approvedTaskIds) {
        const taskData = await TaskManagerContract.methods.getTask(taskId).call();
  
        if (taskData.solver.toLowerCase() === account.toLowerCase()) {
          const status = taskData.status.toLowerCase();
  
          //  Handle completed task
           if (status === "completed" || status === "accepted") {
            const ackedKey = `ack_${taskId}`;
            if (!sessionStorage.getItem(ackedKey)) {
              toast.success(`🎉 Your task "${taskData.taskName}" has been accepted by the creator!`, {
                autoClose: 7000
              });
              sessionStorage.setItem(ackedKey, 'true');
            }
            // ? Do NOT push this task to ongoing list
          }
  
          // ? Handle submitted (being reviewed)
          else if (status === "submitted") {
            ongoing.push({
              taskId,
              taskName: taskData.taskName,
              taskDescription: taskData.taskDescription,
              deadline: Number(taskData.deadline),
              rewards: taskData.rewards,
              creator: taskData.creator,
              status: "Your task is being reviewed"
            });
          }

          else if (status === "need modification") {
            const message = await TaskManagerContract.methods.modificationMessages(taskId).call(); // assumes contract has this getter
            ongoing.push({
              taskId,
              taskName: taskData.taskName,
              taskDescription: taskData.taskDescription,
              deadline: Number(taskData.deadline),
              rewards: taskData.rewards,
              creator: taskData.creator,
              status: `Modification suggested: ${message}`
            });
          }

          else if (status === "rejected") {
            if (!acknowledgedTaskIds.current.has(taskId)) {
              toast.error(`Your task "${taskData.taskName}" was rejected by the creator.`, {
                autoClose: 7000
              });
              acknowledgedTaskIds.current.add(taskId);
            }
            // Do NOT add to ongoing
          }          
          
  
          // Handle all other active statuses
          else {
            ongoing.push({
              taskId,
              taskName: taskData.taskName,
              taskDescription: taskData.taskDescription,
              deadline: Number(taskData.deadline),
              rewards: taskData.rewards,
              creator: taskData.creator,
              status: taskData.status
            });
          }
        }
      }
  
      setOngoingTasks(ongoing);
    } catch (error) {
      console.error('Error fetching ongoing tasks:', error);
    }
  };
  
  
  
  const handleApplyForTask = async (taskId) => {
    try {
      const slotCount = await TaskManagerContract.methods.solverTaskCount(account).call();

if (Number(slotCount) >= 3) {
  toast.error('You can only apply to 3 tasks at a time.');
  return;
}


      await TaskManagerContract.methods.applyForTask(taskId).send({ from: account });
      toast.success('Task application successful!');
      fetchAvailableTasks(account);
      await fetchSlotStatus(); // update slot UI after applying
    } catch (error) {
      console.error('Error applying for task:', error);
      toast.error('Task application failed.');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await TaskManagerContract.methods.updateTaskStatus(taskId, newStatus).send({ from: account });
      toast.success("Status updated successfully");
      fetchOngoingTasks(account);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const fetchSlotStatus = async () => {
    if (!account) return;
    try {
      const slotCount = await TaskManagerContract.methods.solverTaskCount(account).call();
      setSlotCount(Number(slotCount)); // Set state (see Step 2)
    } catch (err) {
      console.error("Error fetching slot count:", err);
    }
  };
  
  fetchSlotStatus();
  
  
  const handleFileChange = (taskId, event) => {
    const file = event.target.files[0];
    if (file) {
      const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg"];
      const maxSizeMB = 5;
      if (!validTypes.includes(file.type)) {
        toast.error("Invalid file type.");
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error("File too large.");
        return;
      }
      setSelectedFiles((prev) => ({ ...prev, [taskId]: file }));
    }
  };
  
  const handleSubmitTask = async (taskId) => {
    const file = selectedFiles[taskId];
    if (!file) {
      toast.error("No file selected");
      return;
    }
    
  
    try {
      const formData = new FormData();
      formData.append("file", file);
  
      const metadata = JSON.stringify({ name: file.name });
      formData.append("pinataMetadata", metadata);
  
      const options = JSON.stringify({ cidVersion: 1 });
      formData.append("pinataOptions", options);
  
      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          maxBodyLength: Infinity,
          headers: {
            "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_API_KEY,
          },
        }
      );
  
      const cid = response.data.IpfsHash;
      const ipfsGatewayURL = `https://gateway.pinata.cloud/ipfs/${cid}`;
      const publicGatewayURL = `https://ipfs.io/ipfs/${cid}`;
  
  
      // Show toast with clickable link (public gateway preferred)
      toast.success(
        <span>
           File uploaded:{" "}
          <a href={publicGatewayURL} target="_blank" rel="noopener noreferrer">
            View File
          </a>
        </span>,
        { autoClose: 10000 }
      );
  
      const tx = await TaskManagerContract.methods
        .submitTask(taskId, cid)
        .send({ from: account });
  
      setTxHashes((prev) => ({ ...prev, [taskId]: tx.transactionHash }));
      fetchOngoingTasks(account);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Submission failed");
      alert("Error: " + error.message);
    }
  };
  
  
  
  const handleSetProfile = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, "users", walletAddress);
      await setDoc(userRef, {
        name: username,
        email,
        phoneNo,
        skills,
        designation,
        workExperience,
      }, { merge: true });
      toast.success("Profile saved successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile.");
    }
  };

  // In the Solver component
const fetchRewardBalance = async (account) => {
  try {
      const balanceWei = await TaskManagerContract.methods
          .getRewardBalance(account)
          .call();
      const balanceEth = web3.utils.fromWei(balanceWei, 'ether');
      setRewardBalance(balanceEth);
  } catch (error) {
      console.error('Error fetching reward balance:', error);
  }
};
const handleWithdraw = async () => {
  try {
      // Convert ETH amount to wei
      const amountWei = web3.utils.toWei(withdrawAmount.toString(), 'ether');
      
      // Get current balance in wei
      const balanceWei = await TaskManagerContract.methods
          .getRewardBalance(account)
          .call();
          
      if (Number(balanceWei) <= 0) {
          toast.error("No rewards to withdraw");
          return;
      }
      
      if (Number(amountWei) > Number(balanceWei)) {
          toast.error("Cannot withdraw more than your balance");
          return;
      }

      // Call the partial withdrawal function
      await TaskManagerContract.methods
          .withdrawPartialReward(amountWei)
          .send({ from: account });

      toast.success(`Withdrew ${withdrawAmount} ETH`);
      
      // Refresh balance
      fetchRewardBalance(account);
      setWithdrawAmount(0); // Reset input field
      
  } catch (error) {
      console.error("Withdrawal failed:", error);
      toast.error(`Withdrawal failed: ${error.message}`);
  }
};



  return (
    <div className="bg-gray-900 text-white min-h-screen flex">
      <ToastContainer />
      
      <div className="w-64 bg-gray-800 shadow-md p-6 fixed top-0 left-0 h-screen">
        <div className="flex items-center space-x-2 mb-6">
          <img src="/logo.png" alt="Logo" className="h-10" />
          <span className="text-xl font-bold text-white">DeTaskify</span>
        </div>
        <ul className="space-y-4">
          <li>
            <button
              onClick={() => setActiveTab('browseTasks')}
              className={`w-full flex items-center space-x-2 text-lg font-semibold p-3 rounded-lg hover:bg-purple-500 ${
                activeTab === 'browseTasks' ? 'bg-blue-500' : ''
              }`}>
              <ClipboardList /> <span>Browse Tasks</span>
            </button>
          </li>
          
          

          <li>
            <button onClick={() => setActiveTab('ongoingTasks')} className={`w-full flex items-center space-x-2 text-lg font-semibold p-3 rounded-lg hover:bg-purple-500 ${activeTab === 'ongoingTasks' ? 'bg-blue-500' : ''}`}>
            <PlayCircle /> <span>Ongoing Tasks</span>
            </button>
          </li>

          <li>
            <button onClick={() => setActiveTab('rewards')} className={`w-full flex items-center space-x-2 text-lg font-semibold p-3 rounded-lg    hover:bg-purple-500 ${activeTab === 'rewards' ? 'bg-blue-500' : ''}`}>
            <Wallet /> <span>Rewards</span>
            </button>
          </li>

          <li>
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-2 text-lg font-semibold p-3 rounded-lg hover:bg-purple-500 ${
              activeTab === 'profile' ? 'bg-blue-500' : ''
              }`}>
              <UserCheck /> <span>Profile</span>
            </button>
          </li>
        </ul>
      </div>



      {/* MAIN CONTENT */}
      <div className="flex-1 ml-64 h-screen overflow-y-auto pt-20 pl-4 pr-4">
      <nav className="fixed top-0 left-64 right-0 bg-gray-800 bg-opacity-80 backdrop-blur-md shadow-lg px-8 py-5 flex justify-between items-center z-50">
  <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
    Task Solver Dashboard
  </h1>
  
  <div className="flex items-center space-x-4">
    <div className="text-white text-lg font-medium flex items-center space-x-2">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.042 0 3.977.385 5.758 1.08M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span>Hello, {username}!</span>
    </div>

    <button
      onClick={() => window.location.href = "/dashboard"}
      className="px-5 py-2 text-base font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-md hover:scale-105 hover:shadow-lg transition duration-300"
    >
      View Dashboard
    </button>
  </div>
</nav>


        {/* TABS */}
        {activeTab === 'browseTasks' && (
  <div>
    <div className="flex justify-between items-center mt-4 mb-4">
      <h2 className="text-2xl font-semibold text-white">Browse Available Tasks</h2>

      {/* Slot Status Boxes */}
      <div className="flex space-x-2">
        {[1, 2, 3].map((num) => (
          <div
            key={num}
            className={`w-10 h-10 flex items-center justify-center rounded-lg text-white font-bold shadow ${
              slotCount >= num ? 'bg-red-500' : 'bg-green-500'
            }`}
          >
            {num}
          </div>
        ))}
      </div>
    </div>

            <ul>
              {tasks.map((task) => (
                <li key={task.taskId} className="p-6 mb-6 border border-purple-300  hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl rounded">
                  <h3 className="font-semibold text-purple-400 text-xl">Title: {task.taskName}</h3>
                  <p>Description: {task.taskDescription}</p>
                  <p>Deadline: {new Date(task.deadline * 1000).toLocaleString()}</p>
                  <p>Rewards: {web3.utils.fromWei(task.rewards, 'ether')} ETH</p>
                  <button onClick={() => handleApplyForTask(task.taskId)} className="mt-3 px-7 py-1 text-lg font-semibold text-white bg-purple-500 rounded-full">
                    Apply
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        
{activeTab === 'ongoingTasks' && (
  <div className="animate-fadeIn">
    <h2 className="text-3xl font-bold text-white mt-4  mb-6">
      Your Ongoing Tasks
    </h2>
    
    {ongoingTasks.length === 0 ? (
      <div className="bg-gray-800 rounded-xl p-8 text-center border border-purple-300 shadow-lg">
        <PlayCircle className="h-12 w-12 mx-auto text-gray-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No ongoing tasks</h3>
        <p className="text-gray-500">Apply for tasks in the Browse section to get started!</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-6">
        {ongoingTasks.map((task) => {
          const statusOptions = [
            "Task Accepted",
            "Researching", 
            "In Progress",
            "Reviewing",
            "Ready for Submission"
          ];

          const currentStatusIndex = statusOptions.findIndex(
            (status) => status.toLowerCase() === task.status.toLowerCase()
          );

          const deadline = new Date(task.deadline * 1000);
          const now = new Date();
          const diffMs = deadline - now;
          const expired = diffMs <= 0;
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
          const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);

          const countdownDisplay = expired
            ? "Deadline Missed"
            : `${diffDays}d ${diffHours}h ${diffMinutes}m left`;

          const countdownColor = expired || diffMs < 24 * 60 * 60 * 1000 ? "text-red-400" : "text-yellow-400";

          const isSubmitted = txHashes && txHashes[task.taskId];

          return !expired ? (
            <div 
              key={task.taskId} 
              className="bg-gray-800 rounded-xl p-6 border border-purple-300 hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Title: {task.taskName}</h3>
                  <p className="text-gray-300 mb-2">Description: {task.taskDescription}</p>
                  <div className="flex flex-wrap gap-4 mt-3">
                    <div className="flex items-center text-purple-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{deadline.toLocaleString()}</span>
                    </div>
                    <div className={`flex items-center ${countdownColor}`}>
                      <Hourglass className="h-5 w-5 mr-2" />
                      <span>{countdownDisplay}</span>
                    </div>
                    <div className="flex items-center text-green-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{web3.utils.fromWei(task.rewards, 'ether')} ETH</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-700 px-3 py-1 rounded-lg">
                  <span className={`font-medium ${
                    task.status === "Task Accepted" ? "text-blue-400" :
                    task.status === "Your task is being reviewed" ? "text-yellow-400" :
                    task.status === "Modify" ? "text-orange-400" : "text-purple-400"
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  {statusOptions.map((step, index) => (
                    <div 
                      key={index} 
                      className={`relative flex-1 text-center ${
                        index < statusOptions.length - 1 ? 'pr-8' : ''
                      }`}
                    >
                      <div 
                        className={`w-3 h-3 rounded-full mx-auto mb-1 ${
                          index <= currentStatusIndex 
                            ? step === "Task Accepted" 
                              ? 'bg-blue-500' 
                              : (task.status === "Your task is being reviewed" && step === "Reviewing") 
                                ? 'bg-yellow-500' 
                                : 'bg-blue-500'
                            : 'bg-gray-500'
                        }`}
                      ></div>
                      <span 
                        className={`text-xs ${
                          index <= currentStatusIndex ? 'text-white' : 'text-gray-500'
                        }`}
                      >
                        {step}
                      </span>
                      {index < statusOptions.length - 1 && (
                        <div 
                          className={`absolute top-1.5 left-1/2 w-full h-0.5 ${
                            index < currentStatusIndex 
                              ? 'bg-blue-500' 
                              : 'bg-gray-500'
                          }`}
                          style={{ width: 'calc(100% - 1rem)' }}
                        ></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Update Section */}
              {(!isSubmitted && task.status !== "Modify" && task.status !== "Your task is being reviewed") && (
                <div className="mb-6">
                  <label className="block mb-2 text-sm font-medium text-blue-400">
                    Update Task Status:
                  </label>
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.taskId, e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-purple-300 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500"
                  >
                    {statusOptions.map((status, idx) => (
                      <option key={idx} value={status} className="bg-gray-800">
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Submission Section */}
              {(task.status === "Ready for Submission" || task.status === "Modify") && 
                !isSubmitted && (
                <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
                  <label className="block mb-2 text-sm font-medium text-gray-300">
                    {task.status === "Modify" 
                      ? "Upload revised file as requested:" 
                      : "Upload your final file:"}
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex-1">
                      <div className="flex items-center justify-center w-full px-4 py-6 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 hover:border-blue-500 cursor-pointer transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" 
                          onChange={(e) => handleFileChange(task.taskId, e)} 
                        />
                      </div>
                    </label>
                    <button
                      onClick={() => handleSubmitTask(task.taskId)}
                      disabled={!selectedFiles[task.taskId]}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                        selectedFiles[task.taskId] 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg transform hover:scale-105' 
                          : 'bg-gray-600 cursor-not-allowed'
                      }`}
                    >
                      Submit Task
                    </button>
                  </div>
                  {selectedFiles[task.taskId] && (
                    <div className="mt-3 flex items-center text-sm text-gray-300">
                      <File className="h-4 w-4 mr-2" />
                      <span>{selectedFiles[task.taskId].name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Submission Confirmation */}
              {isSubmitted && (
                <div className="mt-4 p-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-yellow-300 font-medium">
                      Your submission is under review by the creator.
                    </p>
                  </div>
                  {txHashes[task.taskId] && (
                    <div className="mt-2 text-sm text-gray-400">
                      Transaction: <span className="font-mono text-blue-300">{txHashes[task.taskId]}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              key={task.taskId}
              className="bg-gray-800 rounded-xl p-6 border border-red-900 shadow-lg"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-red-400">{task.taskName}</h3>
                  <div className="mt-2 text-sm text-red-300">
                    <p>You missed the deadline for this task on {deadline.toLocaleString()} and can no longer update it.</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}


{activeTab === 'rewards' && (
  <div className="animate-fadeIn space-y-8">
    <h2 className="text-3xl font-bold text-white mt-4 mb-6">
      Rewards
    </h2>
    
    {/* Reward Balance Card */}
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-purple-300 hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-300">Your Reward Balance</h3>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-white mr-2">{rewardBalance}</span>
            <span className="text-xl text-green-400">ETH</span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="number"
              step="0.001"
              min="0.001"
              max={rewardBalance}
              value={withdrawAmount}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                  setWithdrawAmount(Math.min(value, parseFloat(rewardBalance)));
                } else {
                  setWithdrawAmount('');
                }
              }}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder={`Max: ${rewardBalance} ETH`}
            />
          </div>
          <button
            onClick={handleWithdraw}
            disabled={!withdrawAmount || withdrawAmount <= 0 || withdrawAmount > rewardBalance}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              (!withdrawAmount || withdrawAmount <= 0 || withdrawAmount > rewardBalance)
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg transform hover:scale-[1.02]'
            }`}
          >
            Withdraw
          </button>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
        <span className="text-sm text-gray-400">Available to withdraw</span>
        <span className="text-sm font-medium">{rewardBalance} ETH</span>
      </div>
    </div>

    {/* Completed Tasks Section */}
    <div className="bg-gray-800 rounded-xl p-6 border mt-3  border-purple-300 hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Completed Tasks & Reward History
      </h3>
      
      {completedTasks.length === 0 ? (
        <div className="text-center py-8">
          <File className="mx-auto h-12 w-12 text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No completed tasks yet</h3>
          <p className="text-gray-500">Tasks you complete will appear here after being accepted by the creator.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Task</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reward</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Creator</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Submission</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {completedTasks.map((task) => (
                  <tr key={task.taskId} className="hover:bg-gray-750 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-white">{task.taskName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-400 font-medium">
                      {task.rewards} ETH
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {task.creator.substring(0, 6)}...{task.creator.substring(38)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {task.submissionHash && (
                        <a
                          href={`https://ipfs.io/ipfs/${task.submissionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          View Submission
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-700 text-right">
            <div className="inline-flex items-center">
              <span className="text-gray-400 mr-3">Total Earned:</span>
              <span className="text-xl font-bold text-green-400">
                {completedTasks.reduce((sum, task) => sum + parseFloat(task.rewards), 0)} ETH
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
)}
{activeTab === 'profile' && (
  <div className="animate-fadeIn h-full flex flex-col">
    <h2 className="text-3xl font-bold text-white mt-4 mb-4">
      Your Profile
    </h2>
    
    <div className="flex-1 overflow-y-auto pr-2">
      <form onSubmit={handleSetProfile} className="bg-gray-800 rounded-xl p-6 border border-purple-300 hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">Full Name</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@email.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phoneNo" className="block text-sm font-medium text-gray-300">Phone Number</label>
            <input
              type="text"
              id="phoneNo"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+1 (123) 456-7890"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="skills" className="block text-sm font-medium text-gray-300">Skills</label>
            <input
              type="text"
              id="skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Web Development, Design, Marketing, etc."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="designation" className="block text-sm font-medium text-gray-300">Designation</label>
            <input
              type="text"
              id="designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your professional title"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="workExperience" className="block text-sm font-medium text-gray-300">Work Experience</label>
            <input
              type="text"
              id="workExperience"
              value={workExperience}
              onChange={(e) => setWorkExperience(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Years of experience"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end">
          <button 
            type="submit" 
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg shadow hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            Save Profile
          </button>
        </div>
      </form>

      <div className="bg-gray-800 rounded-xl p-4 border border-purple-300 hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl">
        <h3 className="text-lg font-bold text-white mb-3">Wallet Information</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">Connected Wallet</p>
            <p className="font-mono text-sm text-blue-400 break-all">{account || "Not connected"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Network</p>
            <p className="text-sm text-white">Ethereum Mainnet</p>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
};

export default Solver;









