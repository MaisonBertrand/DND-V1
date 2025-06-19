import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { getUserParties, getPartyByInviteCode, joinParty } from '../firebase/database';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      loadUserParties(user.uid);
    });
    return () => unsubscribe();
  }, [navigate]);

  const loadUserParties = async (userId) => {
    try {
      const userParties = await getUserParties(userId);
      setParties(userParties);
    } catch (error) {
      console.error('Error loading parties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinParty = async () => {
    if (!joinCode.trim()) {
      alert('Please enter an invite code');
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
      setShowJoinForm(false);
      // Refresh parties list
      await loadUserParties(user.uid);
    } catch (error) {
      alert(error.message || 'Error joining party. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCampaign = (partyId) => {
    navigate(`/campaign-story/${partyId}`);
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <div className="text-stone-600">Loading your parties...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card">
        <div className="flex justify-between items-center mb-6">
          <h1 className="fantasy-title mb-0">Welcome, {user.email}</h1>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-4 mb-8">
          <button 
            onClick={() => navigate('/party-management')}
            className="fantasy-button"
          >
            Create Party
          </button>
          <button 
            onClick={() => setShowJoinForm(!showJoinForm)}
            className="fantasy-button bg-amber-700 hover:bg-amber-800"
          >
            Join Party
          </button>
        </div>

        {/* Join Party Form */}
        {showJoinForm && (
          <div className="fantasy-card bg-amber-50 mb-8">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Join a Party</h2>
            <div className="flex space-x-4">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="fantasy-input flex-1"
                placeholder="Enter party invite code..."
                maxLength={8}
              />
              <button
                onClick={handleJoinParty}
                disabled={loading || !joinCode.trim()}
                className="fantasy-button"
              >
                {loading ? 'Joining...' : 'Join'}
              </button>
              <button
                onClick={() => setShowJoinForm(false)}
                className="fantasy-button bg-stone-600 hover:bg-stone-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Your Parties */}
        <div>
          <h2 className="text-2xl font-bold text-stone-800 mb-6">Your Parties</h2>
          {parties.length === 0 ? (
            <div className="text-center py-8 text-stone-600">
              <p>You haven't joined any parties yet.</p>
              <p className="text-sm mt-2">Create a party or join one to start your adventure!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {parties.map(party => (
                <div key={party.id} className="fantasy-card bg-amber-50">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-stone-800">{party.name}</h3>
                      <p className="text-stone-600 mt-1">{party.description}</p>
                      <p className="text-sm text-stone-500 mt-2">
                        {party.members?.length || 1}/{party.maxPlayers} members
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewCampaign(party.id)}
                      className="fantasy-button flex-1"
                    >
                      View Campaign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 