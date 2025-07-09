
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, getDoc, doc } from "../firebase";
import { FaInstagram, FaTwitter, FaLinkedin, FaWhatsapp } from "react-icons/fa";

export default function Home() {
  const [openFAQ, setOpenFAQ] = useState(null);
  const [activeSection, setActiveSection] = useState("home");
  const [darkMode, setDarkMode] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const connectMetaMask = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          } else {
            await window.ethereum.request({ method: "eth_requestAccounts" });
            const newAccounts = await window.ethereum.request({ method: "eth_accounts" });
            setWalletAddress(newAccounts[0]);
          }
        } catch (error) {
          console.error("MetaMask connection error", error);
        }
      } else {
        alert("Please install MetaMask!");
      }
    };

    connectMetaMask();

    // Detect account change
    window.ethereum?.on("accountsChanged", (accounts) => {
      setWalletAddress(accounts.length > 0 ? accounts[0] : null);
    });

    return () => {
      window.ethereum?.removeListener("accountsChanged", () => {});
    };
  }, []);

  const handleLoginSignup = async () => {
    if (!walletAddress) return;
    try {
      const userDoc = await getDoc(doc(db, "users", walletAddress));
      if (userDoc.exists()) {
        navigate("/login");
      } else {
        navigate("/signup");
      }
    } catch (error) {
      console.error("Error checking Firebase", error);
    }
  };

  const toggleFAQ = (index) => setOpenFAQ(openFAQ === index ? null : index);
  const toggleTheme = () => setDarkMode(!darkMode);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["home", "faq", "features", "testimonials"];
      for (let section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= -50 && rect.top < window.innerHeight / 2) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"}>
      {/* Navbar */}
      <nav className={`fixed top-0 w-full ${darkMode ? "bg-gray-800" : "bg-white"} bg-opacity-90 p-4 flex justify-between items-center shadow-lg z-50`}>
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="Logo" className="h-10" />
          <span className={`text-xl font-bold ${darkMode ? "text-blue-500 drop-shadow-glow" : "text-blue-500"}`}>DeTaskify</span>
        </div>
        <ul className="flex space-x-6">
          {["Home", "FAQ", "Features", "Testimonials"].map((item) => (
            <li key={item} className="relative">
              <a
                href={`#${item.toLowerCase()}`}
                className={`hover:text-blue-500 transition-all duration-300 ease-in-out ${activeSection === item.toLowerCase() ? "text-blue-500 font-bold" : ""}`}
              >
                {item}
              </a>
            </li>
          ))}
        </ul>
        <button onClick={toggleTheme} className="ml-4 p-2 rounded-full hover:scale-110 transition">
          {darkMode ? "🌞" : "🌙"}
        </button>
      </nav>

      {/* Home Section */}
          <section id="home" className="min-h-[60vh] flex flex-col items-center justify-center text-center px-8 pb-16 overflow-visible opacity-0 animate-fade-in transition-all duration-300">
  <h1 className="text-7xl mt-12 font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 leading-tight">
    Welcome to DeTaskify
        </h1>
        <p className="text-2xl mt-6 px-3">
          The future of decentralized task management. Empowering users with transparency and efficiency.
        </p>
        {walletAddress ? (
          <p className="text-lg text-green-400 mt-4">Connected as: {walletAddress}</p>
        ) : (
          <p className="text-lg text-red-400 mt-4">Waiting for MetaMask connection...</p>
        )}
        <button onClick={handleLoginSignup} className="mt-6 px-8 py-4 text-xl font-semibold text-white bg-blue-500 rounded-full shadow-lg hover:scale-110 transition">
          Get Started
        </button>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-8 max-w-5xl mx-auto opacity-0 animate-fade-in transition-all duration-300 rounded-lg">
        <h2 className="text-4xl font-bold text-center text-purple-500">FAQ</h2>
        <div className="mt-12 space-y-6">
          {["What is DeTaskify?", "How does it work?", "Is it secure?", "How do I get started?"].map((question, index) => (
            <div key={index} className="bg-transparent p-6 rounded-lg shadow-xl border-2 hover:border-purple-500 transition hover:shadow-[0_0_15px_2px_rgba(168,85,247,0.3)]">
              <button onClick={() => toggleFAQ(index)} className="w-full text-left text-xl font-semibold text-blue-500 flex justify-between items-center">
                {question}
                <span className="text-2xl">{openFAQ === index ? "−" : "+"}</span>
              </button>
              {openFAQ === index && (
                <p className="mt-4 text-lg">
                  {index === 0 && "DeTaskify is a decentralized platform for task management."}
                  {index === 1 && "Users manage tasks securely through smart contracts."}
                  {index === 2 && "Yes, blockchain ensures security and transparency."}
                  {index === 3 && "Sign up, create your account, and start managing tasks."}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-6 max-w-6xl mx-auto opacity-0 animate-fade-in transition-all duration-300 rounded-lg">
        <h2 className="text-3xl font-bold text-center text-purple-500">Features</h2>
        <div className="grid md:grid-cols-2 gap-10 mt-8">
          {["Decentralized Tasks", "Secure Transactions", "Transparency", "User-Friendly"].map((feature, index) => (
            <div key={index} className="p-10 rounded-xl shadow-2xl border-2 hover:border-purple-500 transition hover:shadow-[0_0_15px_2px_rgba(168,85,247,0.3)]">
              <h3 className="text-2xl font-semibold text-blue-500">{feature}</h3>
              <p className="mt-4 text-lg">Experience blockchain-powered task management.</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 opacity-0 animate-fade-in  transition-all duration-300 rounded-lg">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-purple-500">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            {[{
              quote: "TaskFlow transformed our workflow.",
              author: "Pranjali Yeshwantrao",
              role: "Product Manager"
            }, {
              quote: "Simple yet powerful!",
              author: "VishnuPriya Sahu",
              role: "CTO at StartupX"
            }, {
              quote: "Saved us countless hours.",
              author: "Isha Vanjare",
              role: "Team Lead"
            }].map((testimonial, index) => (
              <div key={index} className="p-8 rounded-xl border-2 hover:border-purple-500 transition hover:shadow-[0_0_15px_2px_rgba(168,85,247,0.3)]">
                <p className="mb-4">{testimonial.quote}</p>
                <p className="font-semibold">{testimonial.author}</p>
                <p className={darkMode ? "text-gray-400" : "text-gray-600"}>{testimonial.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer with Dark/Light Theme */}
      <footer id="contact" className={`py-8 text-center ${darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700"} transition-colors duration-300`}>
        <p className="text-lg">
          Support: <a href="mailto:support@detaskify.com" className={`${darkMode ? "text-blue-400" : "text-blue-500"} hover:underline`}>support@detaskify.com</a>
        </p>
        <div className="mt-4 flex justify-center space-x-6">
          {[FaInstagram, FaTwitter, FaLinkedin, FaWhatsapp].map((Icon, index) => (
            <a 
              key={index} 
              className={`text-3xl ${darkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-600 hover:text-blue-500"} transition`}
            >
              <Icon />
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}