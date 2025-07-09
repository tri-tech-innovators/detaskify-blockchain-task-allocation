import { useEffect, useState } from 'react';
import { TaskManagerContract } from '../contracts/contract';
import web3 from '../utils/web3';
import Confetti from 'react-confetti';
import { useInView } from 'react-intersection-observer';
import { db, doc, getDoc, getDocs, collection, query, where } from '../firebase';
import { Calendar, ListTodo, LucideLayoutDashboard, Trophy } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';

function StatusItem({ status, count, total, color }) {
  const percentage = total > 0 ? (count / total * 100) : 0;
  
  return (
    <div>
      <div className="flex justify-between text-white mb-1">
        <span>{status}</span>
        <span>{count} ({Math.round(percentage)}%)</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className={`${color} h-2 rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, color }) {
  return (
    <div className={`rounded-lg shadow p-6 ${color.split(' ')[0]}`}>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className={`text-3xl font-bold mt-2 ${color.split(' ')[1]}`}>
        {value}
      </p>
    </div>
  );
}

function CalendarView({ tasks }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasksWithDeadlines, setTasksWithDeadlines] = useState([]);

  useEffect(() => {
    const processedTasks = tasks.map(task => ({
      ...task,
      deadline: new Date(parseInt(task.deadline) * 1000)
    }));
    setTasksWithDeadlines(processedTasks);
  }, [tasks]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));

  const getTasksForDay = (day) => {
    return tasksWithDeadlines.filter(task => 
      isSameDay(task.deadline, day)
    );
  };

  return (
    <div className="calendar-container">
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={prevMonth}
          className="px-4 py-2 bg-purple-700 rounded hover:bg-blue-500 text-white"
        >
          Previous
        </button>
        <h3 className="text-xl font-semibold text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button 
          onClick={nextMonth}
          className="px-7 py-2 bg-purple-700 rounded hover:bg-blue-500 text-white"
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-medium text-gray-300">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {monthDays.map(day => {
          const dayTasks = getTasksForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          
          return (
            <div 
              key={day.toString()}
              className={`min-h-24 p-2 rounded border ${isCurrentMonth ? 'border-blue-600' : 'border-gray-800'} ${isSameDay(day, selectedDate) ? 'bg-gray-700' : 'bg-gray-800'}`}
              onClick={() => setSelectedDate(day)}
            >
              <div className={`text-right ${isCurrentMonth ? 'text-white' : 'text-gray-500'}`}>
                {format(day, 'd')}
              </div>
              
              <div className="mt-1 space-y-1 text-white overflow-y-auto max-h-20">
                {dayTasks.map(task => (
                  <div 
                    key={task.taskId} 
                    className="text-xs p-1 bg-purple-500/30 rounded truncate border border-purple-500/50"
                    title={`${task.taskName} (${format(task.deadline, 'h:mm a')})`}
                  >
                    {task.taskName}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold text-white mb-2">
            Tasks for {format(selectedDate, 'MMMM d, yyyy')}
          </h4>
          <div className="space-y-2">
            {getTasksForDay(selectedDate).length > 0 ? (
              getTasksForDay(selectedDate).map(task => (
                <div key={task.taskId} className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start">
                    <h5 className="font-medium text-blue-300">Title: {task.taskName}</h5>
                    <span className="text-m text-red-500">
                      Due: {format(task.deadline, 'h:mm a')}
                    </span>
                  </div>
                  <p className="text-m text-purple-300 mt-1">Description: {task.taskDescription}</p>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-xs px-2 py-1 text-white bg-gray-500 rounded">
                      {task.status}
                    </span>
                    <span className="text-m text-green-500">
                      Reward: {web3.utils.fromWei(task.rewards.toString(), 'ether')} ETH 
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No tasks due on this day</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  
  // Intersection Observer hook
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show confetti when leaderboard comes into view
  useEffect(() => {
    if (inView && !loading && leaderboardData.length > 0) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [inView, loading, leaderboardData]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      
      const allTasks = await TaskManagerContract.methods.getAllTasks().call();
      const taskIds = allTasks[0];
      
      const solverRewards = new Map();
      
      for (const taskId of taskIds) {
        const task = await TaskManagerContract.methods.getTask(taskId).call();
        if (task.solver !== '0x0000000000000000000000000000000000000000' && task.status === "Accepted") {
          const currentBalance = solverRewards.get(task.solver) || 0;
          solverRewards.set(task.solver, currentBalance + parseInt(task.rewards));
        }
      }
      
      const sortedSolvers = Array.from(solverRewards.entries())
        .map(([address, rewards]) => ({ 
          address, 
          rewards,
          ethAmount: web3.utils.fromWei(rewards.toString(), 'ether')
        }))
        .sort((a, b) => b.rewards - a.rewards);
      
      const topSolvers = sortedSolvers.slice(0, 10);
      
      const solversWithNames = await Promise.all(
        topSolvers.map(async (solver, index) => {
          let name = `Solver ${index + 1}`; // fallback
          try {
            const userRef = doc(db, "users", solver.address.toLowerCase());
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              name = userSnap.data().name || name;
            }
          } catch (err) {
            console.error("Failed to fetch solver name from Firebase:", err);
          }
      
          return {
            ...solver,
            name,
            rank: index + 1
          };
        })
      );
      
      
      setLeaderboardData(solversWithNames);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const accounts = await web3.eth.getAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }
      fetchLeaderboardData();
    };

    init();
  }, []);

  return (
    <div className="bg-gray-800 p-6 rounded-xl text-white" ref={ref}>
      {/* Confetti component */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          colors={['#FFD700', '#C0C0C0', '#CD7F32', '#FF69B4', '#00FFFF']}
          gravity={0.2}
        />
      )}

      <div className="flex items-center gap-2 mb-6">
        <Trophy className="text-yellow-400" size={24} />
        <h2 className="text-2xl font-bold">Top Solvers</h2>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Enhanced Podium */}
          <div className="grid grid-cols-3 gap-4 mb-6 h-64 items-end">
            {/* 2nd place - Silver */}
            <div className={`flex flex-col items-center justify-end h-48 ${
              leaderboardData[1]?.address.toLowerCase() === account.toLowerCase() 
                ? 'bg-blue-500/20 border-2 border-blue-500/50' 
                : 'bg-gradient-to-b from-gray-200 to-gray-400 shadow-lg'
            } rounded-t-lg p-4 relative`}>
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800 font-bold shadow-md border-2 border-gray-100">
                2
              </div>
              <div className="absolute left-2 top-2">
                <Trophy className="text-gray-600" size={40} />
              </div>
              <div className="text-center mt-4">
                {leaderboardData[1] ? (
                  <>
                    <p className="font-medium">{leaderboardData[1].name}</p>
                    <p className="text-m bg-gray-700/50 rounded px-2 py-1 mt-1">
                      {leaderboardData[1].ethAmount} ETH
                    </p>
                  </>
                ) : (
                  <p className="text-gray-400">-</p>
                )}
              </div>
            </div>
            
            {/* 1st place - Gold */}
            <div className={`flex flex-col items-center justify-end h-56 ${
              leaderboardData[0]?.address.toLowerCase() === account.toLowerCase() 
                ? 'bg-blue-500/20 border-2 border-blue-500/50' 
                : 'bg-gradient-to-b from-yellow-300 to-yellow-600 shadow-lg'
            } rounded-t-lg p-4 relative`}>
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-300 to-yellow-600 text-gray-900 font-bold shadow-md border-2 border-yellow-300">
                1
              </div>
              <div className="absolute left-2 top-2">
                <Trophy className="text-yellow-600" size={40} />
              </div>
              <div className="text-center mt-6">
                {leaderboardData[0] ? (
                  <>
                    <p className="font-medium">{leaderboardData[0].name}</p>
                    <p className="text-m bg-yellow-700/30 rounded px-2 py-1 mt-1">
                      {leaderboardData[0].ethAmount} ETH
                    </p>
                  </>
                ) : (
                  <p className="text-gray-400">-</p>
                )}
              </div>
            </div>
            
            {/* 3rd place - Bronze */}
            <div className={`flex flex-col items-center justify-end h-40 ${
              leaderboardData[2]?.address.toLowerCase() === account.toLowerCase() 
                ? 'bg-blue-500/20 border-2 border-blue-500/50' 
                : 'bg-gradient-to-b from-amber-600 to-amber-800 shadow-lg'
            } rounded-t-lg p-4 relative`}>
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold shadow-md border-2 border-amber-500">
                3
              </div>
              <div className="absolute left-2 top-2">
                <Trophy className="text-amber-800" size={40} />
              </div>
              <div className="text-center mt-2">
                {leaderboardData[2] ? (
                  <>
                    <p className="font-medium">{leaderboardData[2].name}</p>
                    <p className="text-m bg-amber-800/30 rounded px-2 py-1 mt-1">
                      {leaderboardData[2].ethAmount} ETH
                    </p>
                  </>
                ) : (
                  <p className="text-gray-400">-</p>
                )}
              </div>
            </div>
          </div>
          
          {/* List for remaining positions */}
          <div className="space-y-2">
            {leaderboardData.slice(3).map((solver) => (
              <div 
                key={solver.address}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  solver.address.toLowerCase() === account.toLowerCase() 
                    ? 'bg-blue-500/20 border border-blue-500/50' 
                    : 'bg-gray-700 hover:bg-gray-600'
                } transition-all duration-200`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-600 text-white flex items-center justify-center text-sm">
                    {solver.rank}
                  </div>
                  <div>
                    <h3 className="font-medium">{solver.name}</h3>
                    <p className="text-xs text-gray-300">
                      {`${solver.address.substring(0, 6)}...${solver.address.substring(solver.address.length - 4)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-400">{solver.ethAmount} ETH</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalCreators: 0,
    totalSolvers: 0,
    totalTasks: 0,
    completedTasks: 0,
    assignedTasks: 0,
    submittedTasks: 0,
    modificationNeededTasks: 0,
    openTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState('');
  const [allOngoingTasks, setAllOngoingTasks] = useState([]);
const [filteredTasks, setFilteredTasks] = useState([]);
const [taskFilter, setTaskFilter] = useState("All");
  const [activeTab, setActiveTab] = useState('dashboard');
  const [allTasks, setAllTasks] = useState([]);
  const [creatorsList, setCreatorsList] = useState([]);
const [solversList, setSolversList] = useState([]);
const [searchQuery, setSearchQuery] = useState('');
const [expandedUser, setExpandedUser] = useState(null);


  const fetchData = async () => {
    try {
      setLoading(true);
      
      const allTasksData = await TaskManagerContract.methods.getAllTasks().call();
      const taskIds = allTasksData[0];
      const names = allTasksData[1];
      const deadlines = allTasksData[2];
      const rewards = allTasksData[3];
      const statuses = allTasksData[4];
      const creators = allTasksData[5];
      const descriptions = allTasksData[6];
      
      const formattedTasks = taskIds.map((id, index) => ({
        taskId: id,
        taskName: names[index],
        deadline: deadlines[index],
        rewards: rewards[index],
        status: statuses[index],
        creator: creators[index],
        taskDescription: descriptions[index]
      }));
      
      setAllTasks(formattedTasks);
      const normalizeStatus = (status) => {
        switch (status.toLowerCase().replace(/\s/g, '')) {
          case 'researching':
            return 'Researching';
          case 'inprogress':
            return 'In Progress';
          case 'reviewing':
            return 'Reviewing';
          default:
            return status;
        }
      };
      
      
      const overviewTasks = formattedTasks
  .map(task => ({
    id: task.taskId,
    name: task.taskName,
    status: normalizeStatus(task.status),
    description: task.taskDescription,
    deadline: task.deadline,
    rewards: task.rewards
  }))
  .filter(task =>
    ["Researching", "In Progress", "Reviewing"].includes(task.status)
  );


      
      setAllOngoingTasks(overviewTasks);
      setFilteredTasks(overviewTasks);
      
      await fetchUsersFromFirebase(formattedTasks);  // ✅ pass directly

      const uniqueCreators = [...new Set(creators)];
      const solvers = new Set();
      let completedTasks = 0;
      let openTasks = 0;
      let assignedTasks = 0;
      let submittedTasks = 0;
      let modificationNeededTasks = 0;
      
      for (const taskId of taskIds) {
        const task = await TaskManagerContract.methods.getTask(taskId).call();
        if (task.solver !== '0x0000000000000000000000000000000000000000') {
          solvers.add(task.solver);
        }
        if (task.status === "Accepted") {
          completedTasks++;
        } else if (task.status === "Assigned") {
          assignedTasks++;
        } else if (task.status === "Submitted") {
          submittedTasks++;
        } else if (task.status === "Need Modification") {
          modificationNeededTasks++;
        } else if (task.status === "Open") {
          openTasks++;
        }
      }

      setMetrics({
        totalCreators: uniqueCreators.length,
        totalSolvers: solvers.size,
        totalTasks: taskIds.length,
        completedTasks: completedTasks,
        assignedTasks: assignedTasks,
        submittedTasks: submittedTasks,
        modificationNeededTasks: modificationNeededTasks,
        openTasks: openTasks
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const fetchUsersFromFirebase = async (taskList) => {
    try {
      const usersRef = collection(db, "users");
  
      const creatorQuery = query(usersRef, where("role", "==", "Task Creator"));
      const solverQuery = query(usersRef, where("role", "==", "Task Solver"));
  
      const [creatorSnap, solverSnap] = await Promise.all([
        getDocs(creatorQuery),
        getDocs(solverQuery)
      ]);
  
      const creators = creatorSnap.docs.map(doc => ({
        id: doc.id.toLowerCase(),  // wallet address
        ...doc.data()
      }));
  
      const solvers = solverSnap.docs.map(doc => ({
        id: doc.id.toLowerCase(),  // wallet address
        ...doc.data()
      }));
  
      // Add task count per creator
      // Count tasks created per creator
const creatorCounts = {};
taskList.forEach(task => {
  const creator = task.creator.toLowerCase();
  creatorCounts[creator] = (creatorCounts[creator] || 0) + 1;
});

// Count completed tasks per solver
const solverCounts = {};
for (const task of taskList) {
  const onChain = await TaskManagerContract.methods.getTask(task.taskId).call();
  if (onChain.status === "Accepted") {
    const solver = onChain.solver.toLowerCase();
    solverCounts[solver] = (solverCounts[solver] || 0) + 1;
  }
}

// Store task counts into Firebase users
setCreatorsList(creators.map(user => ({
  ...user,
  taskCount: creatorCounts[user.id] || 0
})));

setSolversList(solvers.map(user => ({
  ...user,
  completedCount: solverCounts[user.id] || 0
})));
    } catch (err) {
      console.error("❌ Firebase fetch failed:", err);
    }
  };
  

  useEffect(() => {
    let accountChangedListener;
    let taskCreatedSubscription;
    let taskApprovedSubscription;

    const init = async () => {
      try {
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }

        accountChangedListener = (accounts) => {
          setAccount(accounts[0] || '');
          fetchData();
        };

        if (window.ethereum) {
          window.ethereum.on('accountsChanged', accountChangedListener);
        }

        taskCreatedSubscription = TaskManagerContract.events.TaskCreated({
          fromBlock: 'latest'
        }, (error) => {
          if (!error) fetchData();
        });
        
        taskApprovedSubscription = TaskManagerContract.events.TaskReviewApproved({
          fromBlock: 'latest'
        }, (error) => {
          if (!error) {
            fetchData();
          }
        });

        await fetchData();               // ✅ First fetch all tasks from blockchain
            } catch (error) {
        console.error("Initialization error:", error);
      }
    };

    init();

    return () => {
      if (accountChangedListener && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', accountChangedListener);
      }
      if (taskCreatedSubscription) {
        taskCreatedSubscription.unsubscribe();
      }
      if (taskApprovedSubscription) {
        taskApprovedSubscription.unsubscribe();
      }
    };
  }, []);

  
  const handleTaskFilterChange = (filter) => {
    setTaskFilter(filter);
    if (filter === "All") {
      setFilteredTasks(allOngoingTasks);
    } else {
      const normalizedFilter = filter.toLowerCase().replace(/\s/g, '');
      const filtered = allOngoingTasks.filter(task =>
        task.status.toLowerCase().replace(/\s/g, '') === normalizedFilter
      );
      setFilteredTasks(filtered);
    }
  };
  
  
  

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4 flex flex-col">
      <div className="flex items-center space-x-2 mb-6">
          <img src="/logo.png" alt="Logo" className="h-10" />
          <span className="text-xl font-bold text-white">DeTaskify</span>
        </div>
        
        <nav className="space-y-2">
          <button 
            onClick={() => {
              setActiveTab('dashboard');
              scrollToSection('dashboard');
            }}
            className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-blue-500' : 'hover:bg-purple-500'}`}
          >
            <LucideLayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => {
              setActiveTab('task-overview');
              scrollToSection('task-overview');
            }}
            className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-2 ${activeTab === 'task-overview' ? 'bg-blue-500' : 'hover:bg-purple-500'}`}
          >
            <ListTodo className="h-4 w-4" />
            Task Overview 
          </button>
          <button 
            onClick={() => {
              setActiveTab('calendar');
              scrollToSection('calendar');
            }}
            className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-2 ${activeTab === 'calendar' ? 'bg-blue-500' : 'hover:bg-purple-500'}`}
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </button>
          <button 
            onClick={() => {
              setActiveTab('badge-leaderboard');
              scrollToSection('badge-leaderboard');
            }}
            className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-2 ${activeTab === 'badge-leaderboard' ? 'bg-blue-500' : 'hover:bg-purple-500'}`}
          >
            <Trophy className="h-4 w-4" />
            Badge Leaderboard
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Dashboard Section */}
          <section id="dashboard" className="mb-12">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Task Completion</h2>
                    <div className="flex flex-col items-center">
                      <div className="relative w-48 h-48 mb-4">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="#374151"
                            strokeWidth="8"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="#3B82F6"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${(metrics.completedTasks / metrics.totalTasks) * 283} 283`}
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-5xl font-bold text-white">
                              {metrics.totalTasks > 0 ? Math.round(metrics.completedTasks / metrics.totalTasks * 100) : 0}%
                            </div>
                            <div className="text-base text-gray-300">
                              {metrics.completedTasks} of {metrics.totalTasks} tasks
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Task Status</h2>
                    <div className="space-y-3">
                      <StatusItem 
                        status="Open" 
                        count={metrics.openTasks} 
                        total={metrics.totalTasks}
                        color="bg-red-500"
                      />
                      <StatusItem 
                        status="Assigned" 
                        count={metrics.assignedTasks}
                        total={metrics.totalTasks}
                        color="bg-yellow-500"
                      />
                      <StatusItem 
                        status="Submitted" 
                        count={metrics.submittedTasks}
                        total={metrics.totalTasks}
                        color="bg-blue-500"
                      />
                      <StatusItem 
                        status="Need Modification" 
                        count={metrics.modificationNeededTasks}
                        total={metrics.totalTasks}
                        color="bg-orange-500"
                      />
                      <StatusItem 
                        status="Completed" 
                        count={metrics.completedTasks} 
                        total={metrics.totalTasks}
                        color="bg-green-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard 
                    title="Total Creators"
                    value={metrics.totalCreators}
                    color="bg-blue-100 text-blue-600"
                  />
                  <MetricCard 
                    title="Total Solvers"
                    value={metrics.totalSolvers}
                    color="bg-green-100 text-green-600"
                  />
                  <MetricCard 
                    title="Total Tasks"
                    value={metrics.totalTasks}
                    color="bg-purple-100 text-purple-600"
                  />
                  <MetricCard 
                    title="Completed Tasks"
                    value={metrics.completedTasks}
                    color="bg-yellow-100 text-yellow-600"
                  />
                </div>
              </>
            )}
          </section>

          <section id="task-overview" className="mb-12 min-h-screen pt-8">
            <h2 className="text-2xl font-bold text-white mb-4">Task Overview</h2>
            <div className="flex space-x-4 mb-4">
  {["All", "Researching", "In Progress", "Reviewing"].map((filter) => {
    const getButtonColor = () => {
      if (taskFilter !== filter) return "bg-white text-gray-800";

      switch (filter) {
        case "All":
          return "bg-green-600 text-white";
        case "Researching":
          return "bg-yellow-500 text-black";
        case "In Progress":
          return "bg-blue-500 text-white";
        case "Reviewing":
          return "bg-purple-500 text-white";
        default:
          return "bg-white text-gray-800";
      }
    };

    return (
      <button
        key={filter}
        className={`px-4 py-2 rounded-full border font-medium ${getButtonColor()}`}
        onClick={() => handleTaskFilterChange(filter)}
      >
        {filter}
      </button>
    );
  })}
</div>


<div className="flex overflow-x-auto space-x-6 pb-6 mt-10 ml-4">
  {filteredTasks.length === 0 ? (
    <p className="text-white">No tasks to show.</p>
  ) : (
    filteredTasks.map((task) => {
      const statusColor = {
        Researching: "border-yellow-500 bg-yellow-100/10",
        "In Progress": "border-blue-500 bg-blue-100/10",
        Reviewing: "border-purple-500 bg-purple-100/10"
      };

      const pillColor = {
        Researching: "bg-yellow-500 text-black",
        "In Progress": "bg-blue-500 text-white",
        Reviewing: "bg-purple-500 text-white"
      };

      return (
        <div
  key={task.id}
  className={`min-w-[320px] max-w-[320px] flex-shrink-0 rounded-2xl backdrop-blur-lg p-6 transition-all duration-200 border-2
    ${
      task.status === "Researching"
        ? "border-yellow-500 bg-yellow-100/10"
        : task.status === "In Progress"
        ? "border-blue-500 bg-blue-100/10"
        : task.status === "Reviewing"
        ? "border-purple-500 bg-purple-100/10"
        : "border-gray-600 bg-gray-800"
    }`}
  title={`Status: ${task.status}`}
>


  <div className="flex flex-col h-full justify-between">
    <div className="mb-4">
      <h4 className="text-xl font-extrabold text-white mb-2 truncate">
        {task.name}
      </h4>
      <p className="text-sm text-gray-300 line-clamp-2 mb-2">
        {task.description || "No description available."}
      </p>
      <p className="text-xs text-gray-400">
        🕒 Deadline: {task.deadline ? new Date(parseInt(task.deadline) * 1000).toLocaleDateString() : "N/A"}
      </p>
      <p className="text-xs text-green-400 mt-1">
        💰 Reward: {task.rewards ? web3.utils.fromWei(task.rewards.toString(), 'ether') : '0'} ETH
      </p>
    </div>
    <div className="flex justify-end">
      <span className={`text-sm font-bold px-4 py-1 rounded-full ${pillColor[task.status] || "bg-gray-600 text-white"}`}>
        {task.status}
      </span>
    </div>
  </div>
</div>

      );
    })
  )}
</div>

</section>

          <section id="calendar" className="mb-12 min-h-screen pt-8">
            <h2 className="text-2xl font-bold text-white mb-6">Calendar</h2>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-200"></div>
              </div>
            ) : (
              <div className="bg-gray-800 p-6 rounded-xl">
                <CalendarView tasks={allTasks} />
              </div>
            )}
          </section>

          <section id="badge-leaderboard" className="mb-12 min-h-screen pt-8">
            <h2 className="text-2xl font-bold text-white mb-4"> Badge Leaderboard</h2>
            <Leaderboard />
          </section>
        </div>
      </div>

      <div className="w-64 bg-gray-800 p-4 overflow-y-auto">
  <input
    type="text"
    placeholder="Search users..."
    className="w-full mb-4 px-3 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />

  <h3 className="text-lg font-bold text-white mb-2">Task Creators</h3>
  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
    {creatorsList
      .filter(user => (user.name || user.email).toLowerCase().includes(searchQuery.toLowerCase()))
      .map((creator, i) => {
        const initials = (creator.name || creator.email).slice(0, 2).toUpperCase();
        const expanded = expandedUser === creator.id;
        return (
          <div key={i} className="bg-gray-700 p-2 rounded text-white">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setExpandedUser(expanded ? null : creator.id)}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                  {initials}
                </div>
                <span>{creator.name || creator.email}</span>
              </div>
              <span className="text-xs">{expanded ? '▲' : '▼'}</span>
            </div>
            {expanded && (
              <p className="text-xs mt-1 text-gray-300">Tasks Created: {creator.taskCount}</p>
            )}
          </div>
        );
      })}
  </div>

  <h3 className="text-lg font-bold text-white mt-6 mb-2">Task Solvers</h3>
  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
    {solversList
      .filter(user => (user.name || user.email).toLowerCase().includes(searchQuery.toLowerCase()))
      .map((solver, i) => {
        const initials = (solver.name || solver.email).slice(0, 2).toUpperCase();
        const expanded = expandedUser === solver.id;
        return (
          <div key={i} className="bg-gray-700 p-2 rounded text-white">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setExpandedUser(expanded ? null : solver.id)}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                  {initials}
                </div>
                <span>{solver.name || solver.email}</span>
              </div>
              <span className="text-xs">{expanded ? '▲' : '▼'}</span>
            </div>
            {expanded && (
              <p className="text-xs mt-1 text-gray-300">Tasks Completed: {solver.completedCount}</p>
            )}
          </div>
        );
      })}
  </div>
</div>

    </div>
  );
}

const style = document.createElement('style');
style.innerHTML = `
  /* Customize the scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-thumb {
    background-color: #121828;
    border-radius: 10px;
  }

  ::-webkit-scrollbar-track {
    background-color: #121828;
  }
`;

document.head.appendChild(style);