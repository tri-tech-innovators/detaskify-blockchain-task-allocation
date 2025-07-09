// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract TaskManager {
    struct Task {
        uint256 taskId;
        string taskName;
        string taskDescription;
        uint256 deadline;
        uint256 rewards;
        string status;
        address creator;
        address solver;
        string[] submissionHashes;
        uint256[] submissionTimestamps;
        bool reviewPending;

    }

    struct TaskRequest {
        uint256 taskId;
        address solver;
        string status; // "Pending", "Approved", "Rejected"
        address creator;

    }

    uint256 public totalRewardsHeld;
    

    mapping(uint256 => Task) private tasks;
    mapping(uint256 => TaskRequest[]) private taskRequests;
    mapping(address => uint256) public solverTaskCount;
    mapping(uint => string[]) public taskSubmissions;
    uint256 private nextTaskId = 1;
    uint256[] private allTaskIds;
    mapping(address => uint256) public solverRewardBalance;
    mapping(address => uint256[]) private solverCompletedTasks;

    event TaskCreated(uint256 taskId, string taskName, address creator);
    event TaskApplied(uint256 taskId, address solver);
    event TaskRequestApproved(uint256 taskId, address solver);
    event TaskRequestRejected(uint256 taskId, address solver);
    event TaskReviewApproved(uint256 taskId, address solver);
    event TaskModificationSuggested(uint256 taskId, string message);
    event TaskRejected(uint256 taskId);
    event TaskRewardStored(address solver, uint256 reward);
    event RewardWithdrawn(address solver, uint256 amount);

    


    // Create a new task
  function createTask(
    string memory _taskName, 
    string memory _taskDescription,
    uint256 _deadlineTimestamp,
    uint256 _rewards
) public payable {  // Add payable
    require(_deadlineTimestamp > block.timestamp, "Deadline must be in future!");
    require(msg.value >= _rewards, "Insufficient ETH sent for reward");

        tasks[nextTaskId] = Task({
        taskId: nextTaskId,
        taskName: _taskName,
        taskDescription: _taskDescription,
        deadline: _deadlineTimestamp,
        rewards: _rewards,
        status: "Open",
        creator: msg.sender,
        solver: address(0),
        submissionHashes: new string [](0),
        submissionTimestamps: new uint256 [](0),
        reviewPending: false
});

        totalRewardsHeld += _rewards;
        allTaskIds.push(nextTaskId);
        emit TaskCreated(nextTaskId, _taskName, msg.sender);
        nextTaskId++;
    }

    // Apply for a task
    function applyForTask(uint256 _taskId) public {
        require(_taskId < nextTaskId, "Invalid task ID");
        require(msg.sender != tasks[_taskId].creator, "Creator cannot apply");
        require(solverTaskCount[msg.sender] < 3, "Max 3 task applications allowed");

        TaskRequest[] storage requests = taskRequests[_taskId];
        for (uint i = 0; i < requests.length; i++) {
            require(requests[i].solver != msg.sender, "Already applied");
        }

        taskRequests[_taskId].push(TaskRequest({
            taskId: _taskId,
            solver: msg.sender,
            status: "Pending",
            creator: tasks[_taskId].creator
        }));

        solverTaskCount[msg.sender]++;
        emit TaskApplied(_taskId, msg.sender);
    }

    

function approveRequest(uint256 _taskId, address _solver) public {
    require(_taskId < nextTaskId, "Invalid task ID");
    require(msg.sender == tasks[_taskId].creator, "Only creator can approve");

    TaskRequest[] storage requests = taskRequests[_taskId];
    bool found = false;

    for (uint i = 0; i < requests.length; i++) {
        if (
            requests[i].solver == _solver &&
            keccak256(bytes(requests[i].status)) == keccak256("Pending")
        ) {
            requests[i].status = "Approved";

            tasks[_taskId].status = "Assigned"; // ? Use clean status
            tasks[_taskId].solver = _solver;

            emit TaskRequestApproved(_taskId, _solver);
            found = true;
            break;
        }
    }

    require(found, "Request not found or already handled");
}


    // Reject a solver's request
    function rejectRequest(uint256 _taskId, address _solver) public {
        require(_taskId < nextTaskId, "Invalid task ID");
        require(msg.sender == tasks[_taskId].creator, "Only creator can reject");

        TaskRequest[] storage requests = taskRequests[_taskId];
        bool found = false;

        for (uint i = 0; i < requests.length; i++) {
            if (
                requests[i].solver == _solver &&
                keccak256(bytes(requests[i].status)) == keccak256("Pending")
            ) {
                requests[i].status = "Rejected";
                // ✅ Free up the solver's slot
            if (solverTaskCount[_solver] > 0) {
                solverTaskCount[_solver]--;
            }
                emit TaskRequestRejected(_taskId, _solver);
                found = true;
                break;
            }
        }

        require(found, "Request not found or already handled");
    }

    // View all tasks
    function getAllTasks() public view returns (
        uint256[] memory, string[] memory, uint256[] memory, uint256[] memory, string[] memory, address[] memory, string[] memory
    ) {
        uint256 length = allTaskIds.length;
        uint256[] memory ids = new uint256[](length);
        string[] memory names = new string[](length);
        uint256[] memory deadlines = new uint256[](length);
        uint256[] memory rewards = new uint256[](length);
        string[] memory statuses = new string[](length);
        address[] memory creators = new address[](length);
        string[] memory descriptions = new string[](length);

        for (uint256 i = 0; i < length; i++) {
            Task storage task = tasks[allTaskIds[i]];
            ids[i] = task.taskId;
            names[i] = task.taskName;
            deadlines[i] = task.deadline;
            rewards[i] = task.rewards;
            statuses[i] = task.status;
            creators[i] = task.creator;
            descriptions[i] = task.taskDescription;
        }

        return (ids, names, deadlines, rewards, statuses, creators, descriptions);
    }

    // View requests for a task
    function getTaskRequestsForCreator(uint256 _taskId) public view returns (TaskRequest[] memory) {
        require(msg.sender == tasks[_taskId].creator, "Not task creator");
        return taskRequests[_taskId];
    }

    // Get all requests for a creator
    function getAllRequestsForCreator(address _creator) public view returns (TaskRequest[] memory) {
        uint256 total = 0;
        for (uint256 i = 1; i < nextTaskId; i++) {
            TaskRequest[] memory requests = taskRequests[i];
            for (uint256 j = 0; j < requests.length; j++) {
                if (requests[j].creator == _creator) {
                    total++;
                }
            }
        }

        TaskRequest[] memory creatorRequests = new TaskRequest[](total);
        uint256 index = 0;
        for (uint256 i = 1; i < nextTaskId; i++) {
            TaskRequest[] memory requests = taskRequests[i];
            for (uint256 j = 0; j < requests.length; j++) {
                if (requests[j].creator == _creator) {
                    creatorRequests[index++] = requests[j];
                }
            }
        }

        return creatorRequests;
    }

    // Get approved tasks for a solver
    function getApprovedTasksForSolver(address _solver) public view returns (uint256[] memory) {
        uint256 taskCount = 0;

        // Count how many tasks are approved for this solver
        for (uint256 i = 1; i < nextTaskId; i++) {
            TaskRequest[] memory requests = taskRequests[i];
            for (uint256 j = 0; j < requests.length; j++) {
                if (requests[j].solver == _solver && keccak256(bytes(requests[j].status)) == keccak256(bytes("Approved"))) {
                    taskCount++;
                }
            }
        }

        uint256[] memory approvedTasks = new uint256[](taskCount);
        uint256 index = 0;

        // Store the approved tasks for this solver
        for (uint256 i = 1; i < nextTaskId; i++) {
            TaskRequest[] memory requests = taskRequests[i];
            for (uint256 j = 0; j < requests.length; j++) {
                if (requests[j].solver == _solver && keccak256(bytes(requests[j].status)) == keccak256(bytes("Approved"))) {
                    approvedTasks[index++] = i;
                }
            }
        }

        return approvedTasks;
    }

event TaskStatusUpdated(uint256 taskId, string newStatus);

function updateTaskStatus(uint256 _taskId, string memory _newStatus) public {
    Task storage task = tasks[_taskId];

    // Creator can mark as "Accepted"
    if (keccak256(bytes(_newStatus)) == keccak256(bytes("Accepted"))) {
        require(msg.sender == task.creator, "Only the creator can accept the submission");
    } else {
        // Solvers can update all other statuses
        require(msg.sender == task.solver, "Only the solver can update status");
    }

    task.status = _newStatus;

    // ✅ Free up a solver slot if the task is marked as Accepted
    if (keccak256(bytes(_newStatus)) == keccak256(bytes("Accepted"))) {
        if (solverTaskCount[task.solver] > 0) {
            solverTaskCount[task.solver]--;
        }
    }
}
    // Helper: Convert address to string
    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(42);
        s[0] = "0";
        s[1] = "x";
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i + 2] = char(hi);
            s[2*i + 3] = char(lo);
        }
        return string(s);
    }

    event TaskSubmitted(uint256 taskId, string ipfsHash, uint256 timestamp);
   
  // Submit a task (solver submits work)
function submitTask(uint256 _taskId, string memory _ipfsHash) public {
    Task storage task = tasks[_taskId];
    require(msg.sender == task.solver, "Only assigned solver can submit");
    
    // Set review pending flag and store submission
    task.reviewPending = true; 
    task.submissionHashes.push(_ipfsHash);
    task.submissionTimestamps.push(block.timestamp);
    
    // Update task status to "Submitted"
    task.status = "Submitted";

    emit TaskSubmitted(_taskId, _ipfsHash, block.timestamp);
}

// Function to get the reward balance for a solver
function getSolverReward(address _solver) public view returns (uint256) {
    return solverRewardBalance[_solver];  // Return the stored reward balance for the solver
}

// Get all tasks pending review for a creator
    function getReviewTasksForCreator(uint256 _taskId) public view returns (string memory, address, string memory) {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.creator, "Not task creator");
        require(task.reviewPending, "No task submission pending review");

        return (
            task.taskName,
            task.solver,
            task.submissionHashes[task.submissionHashes.length - 1]  // Latest submission hash
        );
    }

    function getSubmittedTasksForCreator(address _creator) public view returns (uint256[] memory) {
    uint256 count = 0;
    for (uint256 i = 1; i < nextTaskId; i++) {
        if (tasks[i].creator == _creator && tasks[i].reviewPending) {
            count++;
        }
    }

    uint256[] memory submittedTasks = new uint256[](count);
    uint256 index = 0;

    for (uint256 i = 1; i < nextTaskId; i++) {
        if (tasks[i].creator == _creator && tasks[i].reviewPending) {
            submittedTasks[index] = i;
            index++;
        }
    }

    return submittedTasks;
}


    // Review and approve task submission
function approveTaskSubmission(uint256 _taskId) public {
    Task storage task = tasks[_taskId];
    require(msg.sender == task.creator, "Only creator can approve submission");
    require(task.reviewPending, "No task submission pending review");

    // Update task status to "Completed"
    task.status = "Accepted";
    task.reviewPending = false;

    // Store the reward for the solver (without transferring it to their wallet)
    solverRewardBalance[task.solver] += task.rewards; // Store the reward amount
    solverCompletedTasks[task.solver].push(_taskId);
        // Emit events for task approval and reward storage
    emit TaskReviewApproved(_taskId, task.solver);
    emit TaskRewardStored(task.solver, task.rewards);
}

function getCompletedTasksForSolver(address _solver) public view returns (uint256[] memory) {
    return solverCompletedTasks[_solver];
}

// suggest modification
mapping(uint256 => string) public modificationMessages;

function suggestModificationWithDeadline(uint256 _taskId, string memory message, uint256 newDeadline) public {
    Task storage task = tasks[_taskId];
    require(msg.sender == task.creator, "Only creator can suggest modifications");
    require(task.reviewPending, "Task must be submitted for review");

    task.status = "Need Modification";
    task.reviewPending = false;
    task.deadline = newDeadline;
    modificationMessages[_taskId] = message;

    emit TaskModificationSuggested(_taskId, message);
}



 // Review and reject task submission
function rejectTaskSubmissionWithDeadline(uint256 _taskId, uint256 newDeadline) public {
    Task storage task = tasks[_taskId];
    require(msg.sender == task.creator, "Only creator can reject");
    require(task.reviewPending, "No submission to reject");

    // ✅ Save solver address before clearing it
    address solver = task.solver;

    // ✅ Free up the solver's slot
    if (solverTaskCount[solver] > 0) {
        solverTaskCount[solver]--;
    }

    task.solver = address(0);
    task.status = "Open";
    task.reviewPending = false;
    task.deadline = newDeadline;

    emit TaskRejected(_taskId);
}



   // Get the submission history for a task  
function getSubmissionHistory(uint256 _taskId) public view returns (string[] memory, uint256[] memory) {
    Task storage task = tasks[_taskId];
    return (task.submissionHashes, task.submissionTimestamps);
}

function withdrawPartialReward(uint256 amount) public {
    require(amount > 0, "Amount must be greater than 0");
    require(amount <= solverRewardBalance[msg.sender], "Insufficient balance");
    
    // Deduct first to prevent reentrancy
    solverRewardBalance[msg.sender] -= amount;
    totalRewardsHeld -= amount;

    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Transfer failed");

    emit RewardWithdrawn(msg.sender, amount);
}

function getRewardBalance(address solver) public view returns (uint256) {
    return solverRewardBalance[solver];
}

function rewardSolver(address solver, uint256 rewardAmount) public {
    // Assuming the rewardAmount is in wei
    solverRewardBalance[solver] += rewardAmount;
}


    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    // (Optional) View one task for debug
    function getTask(uint256 _taskId) public view returns (Task memory) {
        return tasks[_taskId];
    }








// View function to fetch all rejected requests by a creator for a specific solver
function getRejectedRequestsBySolver(uint256 _taskId, address _solver)
    public
    view
    returns (TaskRequest[] memory)
{
    require(_taskId < nextTaskId, "Invalid task ID");
    require(msg.sender == tasks[_taskId].creator, "Only creator can view");

    TaskRequest[] storage requests = taskRequests[_taskId];
    uint count = 0;

    // First, count how many rejected requests exist for the solver
    for (uint i = 0; i < requests.length; i++) {
        if (
            requests[i].solver == _solver &&
            keccak256(bytes(requests[i].status)) == keccak256("Rejected")
        ) {
            count++;
        }
    }

    // Prepare the array with the correct size
    TaskRequest[] memory rejectedRequests = new TaskRequest[](count);
    uint index = 0;

    // Populate the array
    for (uint i = 0; i < requests.length; i++) {
        if (
            requests[i].solver == _solver &&
            keccak256(bytes(requests[i].status)) == keccak256("Rejected")
        ) {
            rejectedRequests[index] = requests[i];
            index++;
        }
    }

    return rejectedRequests;
}





function getMyRejectedRequests() public view returns (uint256[] memory) {
    uint256[] memory tempIds = new uint256[](nextTaskId);
    uint count = 0;

    for (uint256 i = 0; i < nextTaskId; i++) {
        TaskRequest[] storage requests = taskRequests[i];
        for (uint j = 0; j < requests.length; j++) {
            if (
                requests[j].solver == msg.sender &&
                keccak256(bytes(requests[j].status)) == keccak256("Rejected")
            ) {
                tempIds[count] = i;
                count++;
                break; // avoid duplicate taskId if multiple rejected requests exist
            }
        }
    }

    // Copy only the filled part
    uint256[] memory rejectedTaskIds = new uint256[](count);
    for (uint i = 0; i < count; i++) {
        rejectedTaskIds[i] = tempIds[i];
    }

    return rejectedTaskIds;
}








    

}




