import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';

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

  if (!user) {
    return null;
  }

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card">
        <div className="flex justify-between items-center mb-6">
          <h1 className="fantasy-title mb-0">Adventurer's Dashboard</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Party Management */}
          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Party</h2>
            <p className="text-stone-600 mb-4">Create parties and invite friends</p>
            <div className="space-y-2">
              <button 
                onClick={() => navigate('/party-management')}
                className="fantasy-button w-full"
              >
                Manage Parties
              </button>
              <button className="fantasy-button w-full bg-stone-600 hover:bg-stone-700">
                Join Party
              </button>
            </div>
          </div>

          {/* Campaign Management */}
          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Campaign</h2>
            <p className="text-stone-600 mb-4">Plan stories and manage campaigns</p>
            <div className="space-y-2">
              <button className="fantasy-button w-full">
                Create Campaign
              </button>
              <button className="fantasy-button w-full bg-stone-600 hover:bg-stone-700">
                View Campaigns
              </button>
            </div>
          </div>

          {/* Combat Tracker */}
          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Combat</h2>
            <p className="text-stone-600 mb-4">Track initiative and manage combat</p>
            <div className="space-y-2">
              <button className="fantasy-button w-full">
                Start Combat
              </button>
              <button className="fantasy-button w-full bg-stone-600 hover:bg-stone-700">
                Combat History
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Quick Actions</h2>
            <p className="text-stone-600 mb-4">Common tasks and shortcuts</p>
            <div className="space-y-2">
              <button className="fantasy-button w-full">
                Roll Dice
              </button>
              <button className="fantasy-button w-full bg-stone-600 hover:bg-stone-700">
                Spell Reference
              </button>
            </div>
          </div>

          {/* Game Tools */}
          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Game Tools</h2>
            <p className="text-stone-600 mb-4">Additional utilities for your game</p>
            <div className="space-y-2">
              <button className="fantasy-button w-full">
                Monster Manual
              </button>
              <button className="fantasy-button w-full bg-stone-600 hover:bg-stone-700">
                Item Database
              </button>
            </div>
          </div>

          {/* Character Management */}
          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Character</h2>
            <p className="text-stone-600 mb-4">View and manage your characters</p>
            <div className="space-y-2">
              <button className="fantasy-button w-full">
                View Characters
              </button>
              <button className="fantasy-button w-full bg-stone-600 hover:bg-stone-700">
                Character Sheets
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Recent Activity</h2>
            <div className="text-center py-8 text-stone-600">
              <p>No recent activity to display</p>
              <p className="text-sm">Your adventures will appear here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 