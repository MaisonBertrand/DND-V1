import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { createParty, getUserParties, joinParty, getPartyByInviteCode } from '../firebase/database';

export default function PartyManagement() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [newParty, setNewParty] = useState({
    name: '',
    description: '',
    maxPlayers: 6,
    isPublic: false,
    inviteCode: ''
  });

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
      alert('Error loading parties: ' + error.message);
    }
  };

  const handleCreateParty = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('You must be logged in to create a party');
      return;
    }

    setLoading(true);
    try {
      const partyData = {
        ...newParty,
        inviteCode: Math.random().toString(36).substr(2, 8).toUpperCase()
      };
      
      const createdParty = await createParty(user.uid, partyData);
      
      setShowCreateForm(false);
      setNewParty({ name: '', description: '', maxPlayers: 6, isPublic: false, inviteCode: '' });
      
      // Reload parties after creation
      await loadUserParties(user.uid);
      
      alert('Party created successfully!');
    } catch (error) {
      alert('Error creating party: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinParty = async () => {
    if (!joinCode.trim()) {
      alert('Please enter an invite code');
      return;
    }

    if (!user) {
      alert('You must be logged in to join a party');
      return;
    }

    setLoading(true);
    try {
      const party = await getPartyByInviteCode(joinCode.toUpperCase());
      if (!party) {
        alert('Invalid invite code');
        return;
      }

      await joinParty(party.id, user.uid);
      setJoinCode('');
      await loadUserParties(user.uid);
      alert('Successfully joined party!');
    } catch (error) {
      alert(error.message || 'Error joining party. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    alert('Invite code copied to clipboard!');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card">
        <div className="flex justify-between items-center mb-6">
          <h1 className="fantasy-title mb-0">Party Management</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="fantasy-button"
            disabled={loading}
          >
            Create New Party
          </button>
        </div>

        {/* Create Party Form */}
        {showCreateForm && (
          <div className="fantasy-card bg-amber-50 mb-6">
            <h2 className="text-xl font-bold text-stone-800 mb-4">Create New Party</h2>
            <form onSubmit={handleCreateParty} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Party Name
                </label>
                <input
                  type="text"
                  value={newParty.name}
                  onChange={(e) => setNewParty(prev => ({ ...prev, name: e.target.value }))}
                  className="fantasy-input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newParty.description}
                  onChange={(e) => setNewParty(prev => ({ ...prev, description: e.target.value }))}
                  className="fantasy-input"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Max Players
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={newParty.maxPlayers}
                    onChange={(e) => setNewParty(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
                    className="fantasy-input"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newParty.isPublic}
                    onChange={(e) => setNewParty(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="mr-2"
                  />
                  <label htmlFor="isPublic" className="text-sm font-medium text-stone-700">
                    Public Party (visible to all users)
                  </label>
                </div>
              </div>

              <div className="flex space-x-4">
                <button 
                  type="submit" 
                  className="fantasy-button"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Party'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="fantasy-button bg-stone-600 hover:bg-stone-700"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* My Parties */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-stone-800 mb-4">My Parties</h2>
          {parties.length === 0 ? (
            <div className="text-center py-8 text-stone-600">
              <p>You haven't joined any parties yet.</p>
              <p>Click "Create New Party" to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {parties.map(party => (
                <div key={party.id} className="fantasy-card bg-amber-50">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-stone-800">{party.name}</h3>
                    <span className="text-sm text-stone-600">
                      {party.members?.length || 1}/{party.maxPlayers} players
                    </span>
                  </div>
                  
                  <p className="text-stone-600 mb-4">{party.description}</p>
                  
                  {party.dmId === user.uid && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Invite Code
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={party.inviteCode}
                          readOnly
                          className="fantasy-input bg-stone-100"
                        />
                        <button
                          onClick={() => copyInviteCode(party.inviteCode)}
                          className="fantasy-button text-sm"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/campaign/${party.id}`)}
                      className="fantasy-button"
                    >
                      Campaign
                    </button>
                    <button
                      onClick={() => navigate(`/combat/${party.id}`)}
                      className="fantasy-button bg-stone-600 hover:bg-stone-700"
                    >
                      Combat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Join Party */}
        <div>
          <h2 className="text-2xl font-bold text-stone-800 mb-4">Join a Party</h2>
          <div className="fantasy-card bg-amber-50">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Enter invite code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="fantasy-input flex-1"
                disabled={loading}
              />
              <button
                onClick={handleJoinParty}
                className="fantasy-button"
                disabled={loading}
              >
                {loading ? 'Joining...' : 'Join Party'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 