// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserRoleManager {
    enum Role { None, TaskCreator, TaskSolver }

    mapping(address => Role) public userRoles;

    event RoleUpdated(address indexed user, Role role);

    function updateRole(address _user, string memory _role) external {
        require(userRoles[_user] == Role.None, "User role already set");

        if (keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("Task Creator"))) {
            userRoles[_user] = Role.TaskCreator;
        } else if (keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("Task Solver"))) {
            userRoles[_user] = Role.TaskSolver;
        } else {
            revert("Invalid role");
        }

        emit RoleUpdated(_user, userRoles[_user]);
    }

    function getRole(address _user) external view returns (string memory) {
        if (userRoles[_user] == Role.TaskCreator) {
            return "Task Creator";
        } else if (userRoles[_user] == Role.TaskSolver) {
            return "Task Solver";
        } else {
            return "None";
        }
    }
}
