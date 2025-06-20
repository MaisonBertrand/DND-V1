import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthChange, logoutUser } from '../firebase/auth';
import { getUserProfile } from '../firebase/database';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
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
  }, []);

  const handleLogout = async () => {
    const { error } = await logoutUser();
    if (!error) {
      navigate('/');
    }
  };

  const displayName = userProfile?.username || user?.email;

  return (
    <nav className="bg-stone-800 text-white shadow-lg">
      <div className="fantasy-container">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold font-['Cinzel']">
            DND-V1
          </Link>
          <div className="flex items-center space-x-4">
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
                    className="fantasy-button bg-stone-700 hover:bg-stone-600"
                  >
                    {displayName}
                  </button>
                  
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-stone-200 z-50">
                      <div className="py-2">
                        <div className="px-4 py-2 text-sm text-stone-700 border-b border-stone-200">
                          <div className="font-medium">{displayName}</div>
                          <div className="text-xs text-stone-500">{user.email}</div>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
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
        </div>
      </div>
    </nav>
  );
} 