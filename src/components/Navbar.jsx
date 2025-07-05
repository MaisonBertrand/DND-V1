import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthChange, logoutUser } from '../firebase/auth';
import { getUserProfile } from '../firebase/database';
import { useNavigate } from 'react-router-dom';


export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're currently on the dashboard page
  const isOnDashboard = location.pathname === '/dashboard';

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



  const handleLogout = async () => {
    const { error } = await logoutUser();
    if (!error) {
      navigate('/');
      setShowMobileMenu(false);
      setShowProfileDropdown(false);
    }
  };

  // Get clean username for display
  const getDisplayName = () => {
    if (userProfile?.username) {
      return userProfile.username;
    }
    if (user?.displayName) {
      return user.displayName;
    }
    if (user?.email) {
      const emailUsername = user.email.split('@')[0];
      if (emailUsername.length > 15) {
        const cleanName = emailUsername.split(/[._]/)[0];
        return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }
      return emailUsername;
    }
    return 'Adventurer';
  };

  return (
    <nav className="bg-gradient-to-r from-slate-900 to-slate-800 text-slate-100 shadow-lg border-b border-slate-600/50 backdrop-blur-sm">
      <div className="fantasy-container">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent group-hover:from-amber-300 group-hover:to-orange-300 transition-all duration-300">
              DND-V1
            </span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2">
            {!user ? (
              <Link 
                to="/login" 
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                Login
              </Link>
            ) : (
              <>
                {!isOnDashboard && (
                  <Link 
                    to="/dashboard" 
                    className="px-4 py-2 text-slate-200 hover:text-amber-400 font-medium transition-colors duration-300"
                  >
                    Dashboard
                  </Link>
                )}

                
                {/* Profile Dropdown */}
                <div className="relative ml-4">
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-all duration-300 border border-slate-600/50 hover:border-slate-500/50"
                  >
                    <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {getDisplayName().charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-slate-200 font-medium">{getDisplayName()}</span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showProfileDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-600/50 z-50">
                      <div className="p-4">
                        <div className="flex items-center space-x-3 pb-3 border-b border-slate-600/50">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                              {getDisplayName().charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-200">{getDisplayName()}</div>
                            <div className="text-xs text-slate-400 truncate">{user.email}</div>
                          </div>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors duration-300 mt-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Logout</span>
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
              className="p-2 text-slate-200 hover:text-amber-400 transition-colors duration-300"
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
          <div className="md:hidden pb-4 border-t border-slate-600/50">
            {!user ? (
              <div className="pt-4">
                <Link 
                  to="/login" 
                  className="block w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-300 text-center"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Login
                </Link>
              </div>
            ) : (
              <div className="pt-4 space-y-2">
                {!isOnDashboard && (
                  <Link 
                    to="/dashboard" 
                    className="block px-4 py-3 text-slate-200 hover:text-amber-400 hover:bg-slate-700/50 rounded-lg transition-all duration-300"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Dashboard
                  </Link>
                )}

                
                {/* Mobile Profile Section */}
                <div className="pt-4 border-t border-slate-600/50">
                  <div className="flex items-center space-x-3 px-4 py-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {getDisplayName().charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-200">{getDisplayName()}</div>
                      <div className="text-xs text-slate-400 truncate">{user.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-4 py-3 text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors duration-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
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