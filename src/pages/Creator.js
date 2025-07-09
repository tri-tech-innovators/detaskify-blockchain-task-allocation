import React, { useState, useEffect, useMemo } from 'react';
import { TaskManagerContract } from '../contracts/contract';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { File, ClipboardList, History, UserCheck, FileText, Notebook } from 'lucide-react';
import {  CalendarDays, CircleDollarSign } from 'lucide-react';
import web3 from "../utils/web3";
import { db } from "../firebase";  // Assuming you have a Firebase config file
import { doc, getDoc, setDoc } from "firebase/firestore";  // Firestore functions to get and set data

const Creator = () => {
  const [account, setAccount] = useState(null);
  const [isMetaMaskConnected, setIsMetaMaskConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('taskCreation');
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskRewards, setTaskRewards] = useState('');
  const [taskHistory, setTaskHistory] = useState([]);
  const [taskRequests, setTaskRequests] = useState([]);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [username, setUsername] = useState('');
  const [walletAddress, setWalletAddress] = useState("");
  const [showSolverInfoPopup, setShowSolverInfoPopup] = useState(false);
  const [skills, setSkills] = useState("");
  const [designation, setDesignation] = useState("");
  const [workExperience, setWorkExperience] = useState("");
  const [submittedTasks, setSubmittedTasks] = useState([]);
  const [modificationMessage, setModificationMessage] = useState('');
  const [showModifyFields, setShowModifyFields] = useState({});
  const [showRejectFields, setShowRejectFields] = useState({});
  const [modificationMessages, setModificationMessages] = useState({});
  const [modificationDeadlines, setModificationDeadlines] = useState({});
  const [rejectionDeadlines, setRejectionDeadlines] = useState({});

 

  const [pendingReviewCount, setPendingReviewCount] = useState(0);


  
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
              
              }
  
    
            }
          } catch (error) {
            console.error("Error fetching user details:", error);
          }
        }
      };
      fetchUserDetails();
    }, []);



  const handleViewSolverInfo = async (solverWallet) => {
    const trimmedWallet = solverWallet?.toLowerCase().trim();
    console.log("Fetching for wallet address:", trimmedWallet);
  
    if (!trimmedWallet) {
      alert("No wallet address provided.");
      return;
    }
  
    try {
      const userRef = doc(db, "users", trimmedWallet);
      const userSnap = await getDoc(userRef);
  
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUsername(data.name || "N/A");
        setSkills(data.skills || "N/A");
        setDesignation(data.designation || "N/A");
        setWorkExperience(data.workExperience || "N/A");
        setShowSolverInfoPopup(true);
      } else {
        alert("No user found in Firebase for wallet: " + trimmedWallet);
      }
    } catch (error) {
      console.error("Error fetching solver info:", error);
    }
  };

const fetchSubmittedTasksForReview = async (account) => {
  try {
    const tasksData = await TaskManagerContract.methods.getSubmittedTasksForCreator(account).call();
    const tasksWithDetails = await Promise.all(
      tasksData.map(async (taskId) => {
        const task = await TaskManagerContract.methods.getTask(taskId).call();

        // Fetch submission hashes and timestamps once
        const submissionData = await TaskManagerContract.methods.getSubmissionHistory(taskId).call();
const submissionHashes = submissionData[0];

const submissionHash = submissionHashes.length > 0
  ? submissionHashes[submissionHashes.length - 1] // ✅ last submitted file (latest)
  : null;

const ipfsLink = submissionHash 
  ? `https://ipfs.io/ipfs/${submissionHash}`
  : null;
  if (!submissionHash) {
    toast.error(`No submission file found for task ${taskId}`);
  }
  


        const solverAddr = task.solver; // Assuming you have the solver address in the task contract
        const solverInfo = await getSolverInfoFromFirebase(solverAddr); // Helper to fetch solver info from Firebase

        return {
          taskId,
          taskName: task.taskName,
          taskDescription: task.taskDescription,
          rewards: Number(task.rewards),  // Ensure rewards are a number
          solverAddr,
          solverName: solverInfo.name,
          solverEmail: solverInfo.email,
          submissionLink: ipfsLink,
        };
      })
    );
    setSubmittedTasks(tasksWithDetails);

    setPendingReviewCount(tasksData.length); // Update the count

  } catch (error) {
    console.error("Error fetching submitted tasks:", error);
  }
};




  
  const getSolverInfoFromFirebase = async (solverAddr) => {
    try {
      const solverRef = doc(db, "users", solverAddr.toLowerCase());
      const solverSnap = await getDoc(solverRef);
      if (solverSnap.exists()) {
        return solverSnap.data();
      } else {
        console.error("No solver found in Firebase for wallet:", solverAddr);
        return {};
      }
    } catch (error) {
      console.error("Error fetching solver info from Firebase:", error);
      return {};
    }
  };
  
  useEffect(() => {
    if (isMetaMaskConnected && account) {
      fetchSubmittedTasksForReview(account);
    }
  }, [account, isMetaMaskConnected]);
  
  


  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
      checkMetaMaskConnection();
    }
  }, []);
  

  const checkMetaMaskConnection = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      setIsMetaMaskConnected(true);
      fetchTaskHistory(accounts[0]);
      fetchTaskRequests(accounts[0]);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
      setIsMetaMaskConnected(false);
    } else {
      setAccount(accounts[0]);
      setIsMetaMaskConnected(true);
      fetchTaskHistory(accounts[0]);
      fetchTaskRequests(accounts[0]);
    }
  };

  const handleApproveTask = async (taskId) => {
    try {
      // 1. Approve the task submission
      await TaskManagerContract.methods.approveTaskSubmission(taskId).send({ from: account });
      setPendingReviewCount(prev => prev - 1); // Decrement count
  
      // ? 2. Update the task status to Accepted/Completed
      await TaskManagerContract.methods.updateTaskStatus(taskId, "Accepted").send({ from: account });
  
      toast.success("Task approved, marked as Accepted, and reward credited.");
      
      fetchSubmittedTasksForReview(account); // Refresh list
    } catch (error) {
      console.error("Failed to approve task:", error);
      toast.error("Failed to approve task.");
    }
  };
  
  const handleModifyTask = async (taskId) => {
    try {
      const message = modificationMessages[taskId];
      const deadline = modificationDeadlines[taskId];
  
      if (!message || !deadline) {
        toast.error("Please enter a suggestion and new deadline.");
        return;
      }
  
      const timestamp = Math.floor(new Date(deadline).getTime() / 1000);
      await TaskManagerContract.methods.suggestModificationWithDeadline(taskId, message, timestamp).send({ from: account });
      toast.success("Modification suggested!");
      fetchTaskRequests(account);
    } catch (err) {
      console.error(err);
      toast.error("Failed to suggest modification.");
    }
  };
  
  const handleRejectTask = async (taskId) => {
    try {
      const deadline = rejectionDeadlines[taskId];
      if (!deadline) {
        toast.error("Please select a new deadline before rejecting.");
        return;
      }
      const timestamp = Math.floor(new Date(deadline).getTime() / 1000);
      await TaskManagerContract.methods.rejectTaskSubmissionWithDeadline(taskId, timestamp).send({ from: account });

      setPendingReviewCount(prev => prev - 1); // Decrement count

      toast.info("Task rejected and reopened.");
      fetchTaskRequests(account);
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject task.");
    }
  };
  
  
  

  

  const connectMetaMask = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(accounts[0]);
    setIsMetaMaskConnected(true);
    fetchTaskHistory(accounts[0]);
    fetchTaskRequests(accounts[0]);
  };

  const createTask = async () => {
    try {
        const deadlineTimestamp = Math.floor(new Date(taskDeadline).getTime() / 1000);
        
        // Convert ETH reward to wei
        const rewardsInWei = web3.utils.toWei(taskRewards, 'ether');
        
        await TaskManagerContract.methods
            .createTask(taskName, taskDescription, deadlineTimestamp, rewardsInWei)
            .send({ 
                from: account,
                value: rewardsInWei // Send exact wei amount
            });
        
        toast.success('Task created successfully!');
    } catch (error) {
        console.error('Error creating task:', error);
        toast.error('Error creating task.');
    }
};


  const fetchTaskHistory = async (account) => {
    try {
      const tasksData = await TaskManagerContract.methods.getAllTasks().call();
      const tasks = await Promise.all(tasksData[0].map(async (taskId, index) => {
        const submissionData = await TaskManagerContract.methods.getSubmissionHistory(taskId).call();
        const submissionHashes = submissionData[0];
        const latestHash = submissionHashes.length > 0 ? submissionHashes[submissionHashes.length - 1] : null;
        const ipfsLink = latestHash ? `https://ipfs.io/ipfs/${latestHash}` : null;
      
        return {
          taskId: taskId,
          taskName: tasksData[1][index],
          deadline: Number(tasksData[2][index]),
          rewards: tasksData[3][index],
          status: tasksData[4][index],
          creator: tasksData[5][index],
          taskDescription: tasksData[6][index],
          submissionLink: ipfsLink, // ✅ add link to file
        };
      }));
      
      const creatorTasks = tasks.filter(task => task.creator.toLowerCase() === account.toLowerCase());
      setTaskHistory(creatorTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchTaskRequests = async (account) => {
    try {
      // Fetch task requests for the creator
      const tasksData = await TaskManagerContract.methods.getAllRequestsForCreator(account).call();
      
      const taskRequestsWithDetails = [];
  
      // Fetch task name and deadline for each request
      for (let request of tasksData) {
        // Get the task details (taskName and deadline)
        const task = await TaskManagerContract.methods.getTask(request.taskId).call();
        taskRequestsWithDetails.push({
          ...request,
          taskName: task.taskName,  // Task name from the task details
          deadline: task.deadline,  // Task deadline from the task details
        });
      }
  
      setTaskRequests(taskRequestsWithDetails);  // Update state with detailed task data
    } catch (error) {
      console.error('Error fetching task requests:', error);
    }
  };
  
  

  // const pendingRequestCount = useMemo(() => {
  //   return taskRequests?.filter(req => req.status !== 'Approved').length || 0;
  // }, [taskRequests]);

  // Update the existing pendingRequestCount to only count "Pending" status
  const pendingRequestCount = useMemo(() => {
    return taskRequests?.filter(req => req.status === 'Pending').length || 0;
  }, [taskRequests]);
  





  const approveRequest = async (taskId, solver) => {
    try {
      setConfirmationMessage('Processing approval...');
      await TaskManagerContract.methods.approveRequest(taskId, solver).send({ from: account });
      toast.success('Task request approved!');
      fetchTaskRequests(account);
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Approval failed.');
    }
  };

  const rejectRequest = async (taskId, solver) => {
    try {
      setConfirmationMessage('Processing rejection...');
      await TaskManagerContract.methods.rejectRequest(taskId, solver).send({ from: account });
      toast.info('Task request rejected.');
      fetchTaskRequests(account);
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Rejection failed.');
    }
  };

  return (
    //<div className="bg-white text-gray-900 min-h-screen flex">
    <div className="bg-gray-900 text-white flex">

      <ToastContainer />

      {/* Sidebar */}
      <div className="w-64 bg-gray-800 shadow-md p-6 fixed top-0 left-0 h-screen">
        <div className="flex items-center space-x-2 mb-6">
          <img src="/logo.png" alt="Logo" className="h-10" />
          <span className="text-xl font-bold text-white">DeTaskify</span>
        </div>
        <ul className="space-y-4">
          <li>
            <button
              onClick={() => setActiveTab('taskCreation')}
              className={`w-full flex items-center space-x-2 text-lg font-semibold p-3 rounded-lg hover:bg-purple-500 ${
                activeTab === 'taskCreation' ? 'bg-blue-500' : ''
              }`}>
              <ClipboardList /> <span>Create Task</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab('taskHistory')}
              className={`w-full flex items-center space-x-2 text-lg font-semibold p-3 rounded-lg hover:bg-purple-500 ${
                activeTab === 'taskHistory' ? 'bg-blue-500' : ''
              }`}>
              <History /> <span>My Tasks</span>
            </button>
          </li>

          <li>
            <button
              onClick={() => setActiveTab('taskRequests')}
              className={`w-full flex items-center justify-between text-lg font-semibold p-3 rounded-lg hover:bg-purple-500 ${
              activeTab === 'taskRequests' ? 'bg-blue-500' : ''
              }`}
              >
              <div className="flex items-center space-x-2">
                <UserCheck /> <span>My Requests</span>
              </div>

              {/* Notification badge */}
              {pendingRequestCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-blue-100 bg-blue-600 rounded-full">
                  {pendingRequestCount}
                </span>
              )}
            </button>
          </li>

          <li>
            <button
              onClick={() => setActiveTab('reviewTasks')}
              className={`w-full flex items-center space-x-2 text-lg font-semibold p-3 rounded-lg hover:bg-purple-500 ${
                activeTab === 'reviewTasks' ? 'bg-blue-500' : ''
              }`}>
              <File /> <span>Review Tasks</span>

              {/* Notification badge */}
              {pendingReviewCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-blue-100 bg-blue-600 rounded-full">
                  {pendingReviewCount}
                </span>
              )}
            </button>
          </li>


        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 h-screen overflow-y-auto pt-20 pl-4 pr-4">
      <nav className="fixed top-0 left-64 right-0 bg-gray-800 bg-opacity-80 backdrop-blur-md shadow-lg px-8 py-5 flex justify-between items-center z-50">
  <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
    Task Creator Dashboard
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

       {/* Task Creation Tab */}
{activeTab === 'taskCreation' && (
  <div className="animate-fadeIn h-full flex flex-col">
    <h2 className="text-2xl font-bold text-white mt-4 mb-6">
      Create New Task
    </h2>
    
    <div className="bg-gray-800 rounded-xl p-6 border border-purple-300 hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl">
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Task Name</label>
          <input
            type="text"
            placeholder="Enter task name"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            className="w-full px-4 py-3 text-lg bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Task Description</label>
          <textarea
            placeholder="Describe the task details"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 text-lg bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Deadline</label>
            <input
              type="datetime-local"
              value={taskDeadline}
              onChange={(e) => setTaskDeadline(e.target.value)}
              className="w-full px-4 py-3 text-lg bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition [color-scheme:dark]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Reward (ETH)</label>
            <input
              type="number"
              placeholder="1.00"
              value={taskRewards}
              onChange={(e) => setTaskRewards(e.target.value)}
              className="w-full px-4 py-3 text-lg bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              min="1"
              step="1"
            />
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <button
            onClick={createTask}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg shadow hover:shadow-md transform hover:scale-105 transition-all duration-200"
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  </div>
)}

       {/* Task History Tab */}
{activeTab === 'taskHistory' && (
  <div className="animate-fadeIn">
    <h2 className="text-2xl font-bold text-white mt-4 mb-6">
      My Task History
    </h2>
    
    {taskHistory.length === 0 ? (
      <div className="bg-gray-800 rounded-lg p-6 text-center border border-gray-700 shadow-md">
        <ClipboardList className="h-10 w-10 mx-auto text-gray-500 mb-3" />
        <h3 className="text-lg font-medium text-gray-300 mb-1">No tasks found</h3>
        <p className="text-sm text-gray-500">Tasks you create will appear here</p>
      </div>
    ) : (
      <ul className="space-y-4">
        {taskHistory.map((task) => {
          const deadline = new Date(task.deadline * 1000);
          const now = new Date();
          const isExpired = deadline < now;
          const rewardEth = web3.utils.fromWei(task.rewards, 'ether');
          
          return (
            <li
              key={task.taskId}
              className= "bg-gray-800 rounded-lg p-4 border border-purple-300 hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-semibold text-white">Title: {task.taskName}</h3>
                  <p className="text-m text-gray-300 truncate flex items-center">
  <Notebook className="h-4 w-4 text-gray-400 mr-1.5" />
  <span className="truncate">Description: {task.taskDescription}</span>
</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center">
                      <CalendarDays className="h-4 w-4 text-gray-400 mr-1.5" />
                      <span className={`text-m ${isExpired ? 'text-red-400' : 'text-gray-300'}`}>
                        Deadline: {deadline.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <CircleDollarSign className="h-4 w-4 text-gray-400 mr-1.5" />
                      <span className="text-m text-green-400">Rewards: {rewardEth} ETH</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-500 text-white">Status: {task.status} </span>
                  
                  {task.submissionLink && (
                    <a
                      href={task.submissionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-m text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      View File Submission
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </div>
)}

{activeTab === 'taskRequests' && (() => {
  // Separate requests into three categories
  const pendingRequests = taskRequests
    .filter(request => request.status === 'Pending')
    .sort((a, b) => a.taskName.localeCompare(b.taskName));

  const approvedRequests = taskRequests
    .filter(request => request.status === 'Approved')
    .sort((a, b) => a.taskName.localeCompare(b.taskName));

  const rejectedRequests = taskRequests
    .filter(request => request.status === 'Rejected')
    .sort((a, b) => a.taskName.localeCompare(b.taskName));

  // Combine with rejected at the bottom
  const allRequests = [...pendingRequests, ...approvedRequests, ...rejectedRequests];

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mt-4 mb-6">
      My Task Requests
    </h2>
      <ul>
        {allRequests.map((request, index) => (
          <li
            key={index}
            tabIndex="0"
            className={`p-6 mb-6 border rounded-lg shadow hover:shadow-xl transition duration-200 ${
              request.status === 'Rejected' 
                ? 'border-red-300 bg-red-50' 
                : 'border-purple-300'
            }`}
          >
            <p className="font-medium">Task Title: {request.taskName}</p>
            <p>Solver: {request.solver}</p>
            <p className={`font-semibold ${
              request.status === 'Approved' ? 'text-green-600' :
              request.status === 'Rejected' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              Status: {request.status}
            </p>

            {/* Show approve/reject buttons only for pending requests */}
            {request.status === 'Pending' && (
              <div className="mt-4 space-x-4 flex items-center justify-between flex-wrap">
                <div>
                  <button
                    onClick={() => approveRequest(request.taskId, request.solver)}
                    className="px-6 py-2 text-white bg-green-500 rounded-full hover:bg-green-600 transition"
                  >
                    Approve!
                  </button>
                  <button
                    onClick={() => rejectRequest(request.taskId, request.solver)}
                    className="px-8 py-2 text-white bg-red-500 rounded-full hover:bg-red-600 transition ml-4"
                  >
                    Reject!
                  </button>
                </div>
              </div>
            )}

            {/* View Solver Info Button - show for all statuses */}
            <div className="mt-4">
              <button
                onClick={() => handleViewSolverInfo(request.solver)}
                className={`px-4 py-2 text-white rounded-full hover:bg-blue-500 transition ml-auto block ${
                  request.status === 'Rejected' ? 'bg-purple-500' : 'bg-purple-500'
                }`}
              >
                View Solver Info
              </button>
            </div>
          </li>
        ))}
      </ul>
  
      {/* Pop-up to display solver info remains same */}
      {showSolverInfoPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-70 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full transform transition-transform duration-300 ease-out scale-95 hover:scale-100">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Solver Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-base font-medium text-gray-700">
                <span className="text-gray-500">Name:</span>
                <span>{username}</span>
              </div>
              <div className="flex justify-between text-base font-medium text-gray-700">
                <span className="text-gray-500">Skills:</span>
                <span>{skills}</span>
              </div>
              <div className="flex justify-between text-base font-medium text-gray-700">
                <span className="text-gray-500">Designation:</span>
                <span>{designation}</span>
              </div>
              <div className="flex justify-between text-base font-medium text-gray-700">
                <span className="text-gray-500">Work Experience:</span>
                <span>{workExperience}</span>
              </div>
            </div>
            <div className="mt-5 text-right">
              <button
                onClick={() => setShowSolverInfoPopup(false)}
                className="px-5 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
})()}


{activeTab === 'reviewTasks' && (
  <div className="animate-fadeIn">
    <h2 className="text-2xl font-bold text-white mt-4 mb-6">
      Review Submissions
    </h2>

    {submittedTasks.length === 0 ? (
      <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700 shadow-lg">
        <ClipboardList className="h-12 w-12 mx-auto text-gray-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No submissions to review</h3>
        <p className="text-gray-500">Submitted tasks will appear here</p>
      </div>
    ) : (
      <div className="space-y-6">
        {submittedTasks.map((task) => (
          <div
            key={task.taskId}
            className="bg-gray-800 rounded-xl p-6 border border-purple-300 hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Title: {task.taskName}</h3>
                <p className="text-gray-300 text-xl font-bold mb-4">Description: {task.taskDescription}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <CircleDollarSign className="h-5 w-5 text-green-400 mr-2" />
                    <span className="text-green-400 font-medium">
                      {web3.utils.fromWei(task.rewards, 'ether')} ETH Reward
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-m font-medium text-gray-400 mb-2">Solver Details</h4>
                  <div className="space-y-1">
                    <p className="text-white">Name: {task.solverName || "Anonymous"}</p>
                    <p className="text-blue-300">Address: {task.solverAddr}</p>
                    <p className="text-white">Email: {task.solverEmail || "No email provided"}</p>
                  </div>
                </div>

                <a
                  href={task.submissionLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-purple-400 hover:text-blue-300 transition-colors"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  View Submission
                </a>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-700">
  <div className="flex flex-wrap gap-4 justify-start items-center">
    <button
      onClick={() => handleApproveTask(task.taskId, task.solver)}
      className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-full shadow hover:shadow-md transition-all"
    >
      Approve
    </button>
    
    <button
      onClick={() => {
        setShowModifyFields(prev => ({ ...prev, [task.taskId]: !prev[task.taskId] }));
        setShowRejectFields(prev => ({ ...prev, [task.taskId]: false }));
      }}
      className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-full shadow hover:shadow-md transition-all"
    >
      Request Changes
    </button>
    
    <button
      onClick={() => {
        setShowRejectFields(prev => ({ ...prev, [task.taskId]: !prev[task.taskId] }));
        setShowModifyFields(prev => ({ ...prev, [task.taskId]: false }));
      }}
      className="px-8 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-full shadow hover:shadow-md transition-all"
    >
      Reject
    </button>
  </div>

  {showModifyFields[task.taskId] && (
    <div className="mt-4 space-y-3">
      <textarea
        placeholder="Provide clear instructions for required modifications..."
        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        rows={3}
        onChange={(e) => setModificationMessages({ ...modificationMessages, [task.taskId]: e.target.value })}
      />
      <div className="flex items-center space-x-3">
        <input
          type="datetime-local"
          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          onChange={(e) => setModificationDeadlines({ ...modificationDeadlines, [task.taskId]: e.target.value })}
        />
        <button
          onClick={() => handleModifyTask(task.taskId)}
          className="px-6 py-2 bg-yellow-500 hover:bg-yellow-700 text-white font-medium rounded-full shadow hover:shadow-md transition-all"
        >
          Send Modification
        </button>
      </div>
    </div>
  )}

  {showRejectFields[task.taskId] && (
    <div className="mt-4 space-y-3">
      <div className="flex items-center space-x-3">
        <input
          type="datetime-local"
          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          onChange={(e) => setRejectionDeadlines({ ...rejectionDeadlines, [task.taskId]: e.target.value })}
        />
        <button
          onClick={() => handleRejectTask(task.taskId)}
          className="px-6 py-2 bg-red-500 hover:bg-red-700 text-white font-medium rounded-full shadow hover:shadow-md transition-all"
        >
          Confirm Rejection
        </button>
      </div>
    </div>
  )}
</div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
      </div>
    </div>
  );
};

export default Creator;

