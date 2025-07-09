const UserRoleManager = artifacts.require("UserRoleManager");

module.exports = function (deployer) {
  deployer.deploy(UserRoleManager);
};
