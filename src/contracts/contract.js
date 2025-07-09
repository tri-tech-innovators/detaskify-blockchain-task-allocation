import web3 from "../utils/web3";
import UserRoleManagerABI from "./UserRoleManager.json";
import TaskManagerABI from "./TaskManager.json";


// Add deployed contract addresses here
const UserRoleManagerAddress = "0x60e897878de8af691f9cE54Ad60fcf5dd423822C";
const TaskManagerAddress = "0x56C74611Bfde02AC16125B05707A3BD112FB6BE8"


// Create contract instances
const UserRoleManagerContract = new web3.eth.Contract(UserRoleManagerABI.abi, UserRoleManagerAddress);
const TaskManagerContract = new web3.eth.Contract(TaskManagerABI.abi, TaskManagerAddress);

export { UserRoleManagerContract };
export { TaskManagerContract };
