import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { getUserParties, joinParty, getPartyByInviteCode } from '../firebase/database';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [parties, setParties] = useState([]);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    async function fetchParties() {
      if (user) {
        const userParties = await getUserParties(user.uid);
        setParties(userParties);
      }
    }
    fetchParties();
  }, [user]);

  const handleCreateCampaign = () => {
    setShowPartyModal(true);
  };

  const handleJoinParty = async () => {
    if (!joinCode.trim()) {
      alert('Please enter an invite code. Please check and try again.');
      return;
    }

    setLoading(true);
    try {
      const party = await getPartyByInviteCode(joinCode.toUpperCase());
      if (!party) {
        alert('Invalid invite code. Please check and try again.');
        return;
      }

      await joinParty(party.id, user.uid);
      alert('Successfully joined party!');
      setJoinCode('');
      // Refresh parties list
      const userParties = await getUserParties(user.uid);
      setParties(userParties);
    } catch (error) {
      alert(error.message || 'Error joining party. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCampaign = (partyId) => {
    setShowPartyModal(false);
    navigate(`/campaign/${partyId}`);
  };

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
            <button 
              onClick={() => navigate('/party-management')}
              className="fantasy-button w-full"
            >
              Manage Parties
            </button>
          </div>

          {/* Campaign Management */}
          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Campaign</h2>
            <p className="text-stone-600 mb-4">Plan stories and manage campaigns</p>
            <button className="fantasy-button w-full" onClick={handleCreateCampaign}>
              Create Campaign
            </button>
          </div>

          {/* Combat Tracker */}
          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Combat</h2>
            <p className="text-stone-600 mb-4">Track initiative and manage combat</p>
            <button className="fantasy-button w-full">
              Start Combat
            </button>
          </div>

          {/* Quick Actions */}
          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Quick Actions</h2>
            <p className="text-stone-600 mb-4">Common tasks and shortcuts</p>
            <button className="fantasy-button w-full">
              Roll Dice
            </button>
          </div>

          {/* Game Tools */}
          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Game Tools</h2>
            <p className="text-stone-600 mb-4">Additional utilities for your game</p>
            <button className="fantasy-button w-full">
              Monster Manual
            </button>
          </div>

          {/* Character Management */}
          <div className="fantasy-card bg-amber-50">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Character</h2>
            <p className="text-stone-600 mb-4">View and manage your characters</p>
            <button className="fantasy-button w-full">
              View Characters
            </button>
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

      {/* Party Selection Modal */}
      {showPartyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="fantasy-card max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="fantasy-title mb-0">Select Party for Campaign</h2>
              <button
                onClick={() => setShowPartyModal(false)}
                className="text-stone-600 hover:text-stone-800 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Your Parties */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-stone-800 mb-4">Your Parties</h3>
              {parties.length === 0 ? (
                <div className="text-center py-4 text-stone-600">
                  <p>You're not in any parties yet.</p>
                  <p className="text-sm">Create a party or join one below to start a campaign.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {parties.map(party => (
                    <div key={party.id} className="fantasy-card bg-amber-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg text-stone-800">{party.name}</h4>
                          <p className="text-sm text-stone-600 mb-2">{party.description}</p>
                          <p className="text-xs text-stone-500">
                            {party.members?.length || 1}/{party.maxPlayers} players
                          </p>
                        </div>
                        <button
                          onClick={() => handleStartCampaign(party.id)}
                          className="fantasy-button"
                        >
                          Start Campaign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Join Party Section */}
            <div className="border-t border-stone-200 pt-6">
              <h3 className="text-xl font-bold text-stone-800 mb-4">Join a Party</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Invite Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="fantasy-input"
                    placeholder="Enter party invite code..."
                    maxLength={6}
                  />
                </div>
                <button
                  onClick={handleJoinParty}
                  disabled={loading || !joinCode.trim()}
                  className="fantasy-button w-full"
                >
                  {loading ? 'Joining...' : 'Join Party'}
                </button>
              </div>
            </div>

            {/* Create Party Link */}
            <div className="mt-6 text-center">
              <p className="text-stone-600 mb-2">Don't have a party?</p>
              <button
                onClick={() => {
                  setShowPartyModal(false);
                  navigate('/party-management');
                }}
                className="fantasy-button bg-stone-600 hover:bg-stone-700"
              >
                Create New Party
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 