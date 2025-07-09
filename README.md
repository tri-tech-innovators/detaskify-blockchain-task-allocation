# detaskify-blockchain-task-allocation

A blockchain-based project that enables transparent, decentralized task assignment and validation — built using Solidity, Metamask, and Ganache.

---

## Features

- Metamask login system : inclues user name and role storage, integrated with MetaMask for blockchain connectivity.

- Role-based access control supporting two roles: Task Creator and Task Solver.

- Task creation available to authenticated users with the Task Creator role.

- Task Solvers can pick tasks, complete them, and request validation.Only upto 3 tasks can be picked to manage workload and allowing opportunities for others.

- Accept, reject, or request modifications after task submission.

- Rewards the solvers in cryptocurrency (ETH) upon task approval.

- Calendar view with project deadlines and assigned tasks. Task status tracking in real-time. Gamified Ranking System.Automatic generation of performance reports, viewable on the user dashboard.

- Transparent task tracking — all team members can view task progress via the shared dashboard.

- IPFS integration for uploading and accessing file attachments in a decentralized way.

---

## 🛠️ Tech Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| **Frontend**   | React                                   |
| **Blockchain** | Solidity + Ganache (Local Blockchain)   |
| **Deployment** | Truffle Suite                           |
| **Storage**    | IPFS (for file attachments)             |

---

##  Project Structure
 decentralized-task-allocataion/
├──  contracts/ # Solidity Smart Contracts
├──  migrations/ # Truffle deployment scripts
├──  srcI/ # Frontend files (React)
├──  build/ # Compiled contract artifacts
├──  truffle-config.js # Truffle Configuration
├──  package.json # Dependencies
├──  README.md # Project Overview 

---

## Setup Instructions

### 1. Clone the Repository


---

### 2. Install Dependencies
    In Terminal :
     npm install

---

### 3. Ganache Installation
    install the truffle suite ganache for desktop from following link
    https://archive.trufflesuite.com/ganache/

---

### 4. Metamask Extension and Account Creation
    1. Add Metamask extension from Google web store:
        -> https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en

    2. Create a MetaMask Wallet
        -> Click the MetaMask icon in your browser.
        -> Click “Get Started” -> “Create a Wallet”
        -> Set a strong password
        -> Save the Secret Recovery Phrase (12 words) securely — don’t share this.
        -> Complete setup.

---

### 5. Run Ganache
    1. Open the Ganache Desktop App.
    2. Click “Quickstart Ethereum” (or “New Workspace” if you want a custom setup).
    3. Ganache will start and show:
        -> A list of 10 accounts
        -> Each with 100 ETH
        -> A private key for each account
        -> The RPC Server URL, typically: HTTP://127.0.0.1:7545

---

### 6. Connect MetaMask to Ganache
    1. Open MetaMask extension.
    2. Click your account icon (top right) -> Settings -> Networks -> Add a network manually
    3. Add the Ganache network:
        -> Network name: Ganache
        -> New RPC URL: http://127.0.0.1:7545
        -> Chain ID: 1337 (or 5777 if 1337 doesn’t work — check Ganache’s chain ID)
        -> Currency symbol (optional): ETH
    4. Click Save

---

### 7. Import Ganache Account into MetaMask
    1. In Ganache, copy the private key of any one of the accounts from key at rightmost of address field.
    2. In MetaMask:
        -> Click on your account icon → Import Account
        -> Paste the private key
        -> Click Import
    3. You now have an account in MetaMask with 100 ETH (fake) from Ganache.

---

### 8. Compile & Deploy Contracts
    In Terminal :
     truffle compile
     truffle migrate

---

### 9. Add Contract Address
    1. Copy the contract address of userrole and TaskManager from terminal after the migrate and paste in src --> contracts --> contract.js file

---

### 10. Firebase
    1. Visit: https://console.firebase.google.com
    2. Sign in with your Google account.
    3. Click on "Add project", enter a Project Name (e.g., task-allocation).
    4. Click Create Project.
    5. On your project dashboard, click the </> (Web) icon to create a new web app.
    6. Enter an app name (e.g., task-allocation-app)
    7. Click Register app.
    8. After registering your web app, Firebase will show you a code snippet like this: 
        const firebaseConfig = {apiKey: "AIzaSyBCKCLCIy4habiJ3I8ljN0CcecBr1z-4RE",
                                authDomain: "task-allocation-4a18f.firebaseapp.com",
                                projectId: "task-allocation-4a18f",
                                storageBucket: "task-allocation-4a18f.appspot.com",
                                messagingSenderId: "774480390247",
                                appId: "1:774480390247:web:d5964a67e98ecf13bb0cc2",
                                measurementId: "G-3366VGX48J"
                                };
    9. Copy the above fields and paste in src --> firebase.js file.

---

### 11. IPFS file storage
    1. Go to https://app.pinata.cloud/
    2. Sign up or log in, Go to your dashboard.
    3. Click on your profile icon (top-right) → API Keys
    4. Click "New Key"
    5. Set: -> Name: e.g., task-allocator-key
            -> Choose permissions (e.g., pinFileToIPFS, pinJSONToIPFS, admin)
    6. After creation, you'll see: -> API Key
                                   -> Secret API Key
    7. Copy both the API Key and Secret Key and paste it in src --> pages --> Solver.js 

---

### 12. Save all the files

---

### 13. Run Frontend
    In Terminal:
     npm start
