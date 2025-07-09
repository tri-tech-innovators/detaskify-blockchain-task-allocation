const users = new Map(); // Simulated user database

export const checkMetamask = async () => {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    return accounts.length > 0 ? accounts[0] : null;
  }
  alert("Please install Metamask!");
  return null;
};

export const connectMetamask = async () => {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    return accounts[0];
  }
  alert("Please install Metamask!");
  return null;
};

// Register a new user and store in a map
export const registerUser = (wallet, name, email, role) => {
  users.set(wallet, { name, email, role });
};

// Verify if user is registered
export const verifyUser = (wallet) => {
  return users.get(wallet) || null;
};
