import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthChange, logoutUser } from '../firebase/auth';
import { getUserProfile } from '../firebase/database';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, limit, getDocs } from 'firebase/firestore';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setUser(user);
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Monitor Firestore connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Try a simple read operation to test connection
        const testQuery = query(collection(db, '_test'), limit(1));
        await getDocs(testQuery);
        setConnectionStatus('connected');
      } catch (error) {
        console.warn('Firestore connection issue detected:', error);
        setConnectionStatus('disconnected');
        
        // Try to reconnect after a delay
        setTimeout(() => {
          setConnectionStatus('reconnecting');
          checkConnection();
        }, 5000);
      }
    };

    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    const { error } = await logoutUser();
    if (!error) {
      navigate('/');
      setShowMobileMenu(false);
      setShowProfileDropdown(false);
    }
  };

  const displayName = userProfile?.username || user?.email;

  return (
    <nav className="bg-gray-900 text-gray-100 shadow-lg border-b border-gray-700">
      <div className="fantasy-container">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-xl sm:text-2xl font-bold font-['Cinzel'] text-amber-400">
            DND-V1
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {!user ? (
              <Link to="/login" className="fantasy-button">
                Login
              </Link>
            ) : (
              <>
                <Link to="/dashboard" className="fantasy-button">
                  Dashboard
                </Link>
                <Link to="/party-management" className="fantasy-button">
                  Parties
                </Link>
                
                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="fantasy-button bg-gray-700 hover:bg-gray-600"
                  >
                    {displayName}
                  </button>
                  
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-600 z-50">
                      <div className="py-2">
                        <div className="px-4 py-2 text-sm text-gray-200 border-b border-gray-600">
                          <div className="font-medium">{displayName}</div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="fantasy-button bg-gray-700 hover:bg-gray-600 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-700">
            {!user ? (
              <div className="pt-4">
                <Link 
                  to="/login" 
                  className="fantasy-button block w-full text-center"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Login
                </Link>
              </div>
            ) : (
              <div className="pt-4 space-y-3">
                <Link 
                  to="/dashboard" 
                  className="fantasy-button block w-full text-center"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/party-management" 
                  className="fantasy-button block w-full text-center"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Parties
                </Link>
                
                {/* Mobile Profile Section */}
                <div className="pt-3 border-t border-gray-700">
                  <div className="px-4 py-2 text-sm text-gray-200">
                    <div className="font-medium">{displayName}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 rounded-lg mt-2"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
} 