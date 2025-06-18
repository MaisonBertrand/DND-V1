import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthChange, logoutUser } from '../firebase/auth';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await logoutUser();
    if (!error) {
      navigate('/');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card">
        <div className="flex justify-between items-center mb-6">
          <h1 className="fantasy-title mb-0">Adventurer's Dashboard</h1>
          <button onClick={handleLogout} className="fantasy-button bg-stone-600 hover:bg-stone-700">
            Leave Campaign
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Your Profile</h2>
            <p className="text-stone-600">{user.email}</p>
          </div>

          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Campaign Status</h2>
            <p className="text-stone-600">You're not part of a group yet</p>
            <div className="mt-4 space-x-4">
              <button className="fantasy-button">Create Campaign</button>
              <button className="fantasy-button bg-stone-600 hover:bg-stone-700">
                Join Campaign
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Recent Activity</h2>
            <p className="text-stone-600">No recent activity to display</p>
          </div>
        </div>
      </div>
    </div>
  );
} 