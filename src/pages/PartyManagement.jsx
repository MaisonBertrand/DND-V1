import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { createParty, getUserParties, joinParty, getPartyByInviteCode, disbandParty, getUserProfiles, getPublicParties } from '../firebase/database';

export default function PartyManagement() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [parties, setParties] = useState([]);
  const [publicParties, setPublicParties] = useState([]);
  const [partyMemberProfiles, setPartyMemberProfiles] = useState({});
  const [publicPartyMemberProfiles, setPublicPartyMemberProfiles] = useState({});
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
      loadPublicParties();
    });
    return () => unsubscribe();
  }, [navigate]);

  const loadUserParties = async (userId) => {
    try {
      const userParties = await getUserParties(userId);
      setParties(userParties);
      
      // Load user profiles for all party members
      await loadPartyMemberProfiles(userParties);
    } catch (error) {
      console.error('Error loading parties:', error.message);
    }
  };

  const loadPublicParties = async () => {
    try {
      const publicPartiesData = await getPublicParties();
      // Filter out parties the user is already a member of
      const filteredPublicParties = publicPartiesData.filter(party => 
        !party.members?.includes(user?.uid)
      );
      setPublicParties(filteredPublicParties);
      
      // Load user profiles for public party members
      await loadPublicPartyMemberProfiles(filteredPublicParties);
    } catch (error) {
      console.error('Error loading public parties:', error.message);
    }
  };

  const loadPartyMemberProfiles = async (parties) => {
    try {
      // Collect all unique user IDs from all parties
      const allUserIds = new Set();
      parties.forEach(party => {
        if (party.members && Array.isArray(party.members)) {
          party.members.forEach(memberId => allUserIds.add(memberId));
        }
      });

      if (allUserIds.size === 0) return;

      // Get all user profiles
      const profiles = await getUserProfiles(Array.from(allUserIds));
      
      // Create a map of userId to profile
      const profileMap = {};
      profiles.forEach(profile => {
        profileMap[profile.userId] = profile;
      });

      // Create a map of partyId to member profiles
      const partyProfiles = {};
      parties.forEach(party => {
        if (party.members && Array.isArray(party.members)) {
          partyProfiles[party.id] = party.members.map(memberId => ({
            userId: memberId,
            profile: profileMap[memberId] || null
          }));
        }
      });

      setPartyMemberProfiles(partyProfiles);
    } catch (error) {
      console.error('Error loading party member profiles:', error);
    }
  };

  const loadPublicPartyMemberProfiles = async (parties) => {
    try {
      // Collect all unique user IDs from all public parties
      const allUserIds = new Set();
      parties.forEach(party => {
        if (party.members && Array.isArray(party.members)) {
          party.members.forEach(memberId => allUserIds.add(memberId));
        }
      });

      if (allUserIds.size === 0) return;

      // Get all user profiles
      const profiles = await getUserProfiles(Array.from(allUserIds));
      
      // Create a map of userId to profile
      const profileMap = {};
      profiles.forEach(profile => {
        profileMap[profile.userId] = profile;
      });

      // Create a map of partyId to member profiles
      const partyProfiles = {};
      parties.forEach(party => {
        if (party.members && Array.isArray(party.members)) {
          partyProfiles[party.id] = party.members.map(memberId => ({
            userId: memberId,
            profile: profileMap[memberId] || null
          }));
        }
      });

      setPublicPartyMemberProfiles(partyProfiles);
    } catch (error) {
      console.error('Error loading public party member profiles:', error);
    }
  };

  const handleCreateParty = async (e) => {
    e.preventDefault();
    
    if (!user) {
      console.error('You must be logged in to create a party');
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
      await loadPublicParties(); // Refresh public parties list
      
      console.log('Party created successfully!');
    } catch (error) {
      console.error('Error creating party:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinParty = async () => {
    if (!joinCode.trim()) {
      console.error('Please enter an invite code');
      return;
    }

    if (!user) {
      console.error('You must be logged in to join a party');
      return;
    }

    setLoading(true);
    try {
      const party = await getPartyByInviteCode(joinCode.toUpperCase());
      if (!party) {
        console.error('Invalid invite code');
        return;
      }

      await joinParty(party.id, user.uid);
      setJoinCode('');
      await loadUserParties(user.uid);
      await loadPublicParties(); // Refresh public parties list
      console.log('Successfully joined party!');
    } catch (error) {
      console.error(error.message || 'Error joining party. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPublicParty = async (partyId) => {
    if (!user) {
      console.error('You must be logged in to join a party');
      return;
    }

    setLoading(true);
    try {
      await joinParty(partyId, user.uid);
      await loadUserParties(user.uid);
      await loadPublicParties(); // Refresh public parties list
      console.log('Successfully joined public party!');
    } catch (error) {
      console.error(error.message || 'Error joining party. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    console.log('Invite code copied to clipboard!');
  };

  const handleDisbandParty = async (partyId, partyName) => {
    if (!confirm(`Are you sure you want to disband "${partyName}"? This action cannot be undone and will remove all party members and characters.`)) {
      return;
    }

    setLoading(true);
    try {
      await disbandParty(partyId, user.uid);
      await loadUserParties(user.uid);
      await loadPublicParties(); // Refresh public parties list
      console.log('Party disbanded successfully');
    } catch (error) {
      console.error('Error disbanding party:', error.message);
    } finally {
      setLoading(false);
    }
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
          <div className="fantasy-card bg-amber-900/20 border-amber-600 mb-6">
            <h2 className="text-xl font-bold text-gray-100 mb-4">Create New Party</h2>
            <form onSubmit={handleCreateParty} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
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
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Theme
                </label>
                <textarea
                  value={newParty.description}
                  onChange={(e) => setNewParty(prev => ({ ...prev, description: e.target.value }))}
                  className="fantasy-input"
                  rows="3"
                  placeholder="Enter the theme or atmosphere for your campaign..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
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
                  <label htmlFor="isPublic" className="text-sm font-medium text-gray-200">
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
                  className="fantasy-button bg-gray-600 hover:bg-gray-700"
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
          <h2 className="text-2xl font-bold text-gray-100 mb-4">My Parties</h2>
          {parties.length === 0 ? (
            <div className="text-center py-8 text-gray-300">
              <p>You haven't joined any parties yet.</p>
              <p>Click "Create New Party" to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {parties.map(party => {
                const memberProfiles = partyMemberProfiles[party.id] || [];
                
                return (
                <div key={party.id} className="fantasy-card bg-amber-900/20 border-amber-600">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-100">{party.name}</h3>
                    <span className="text-sm text-gray-300">
                      {party.members?.length || 1}/{party.maxPlayers} players
                    </span>
                  </div>
                  
                    {party.description && (
                      <div className="mb-4">
                        <span className="text-sm font-semibold text-gray-200">Theme: </span>
                        <span className="text-gray-300">{party.description}</span>
                      </div>
                    )}
                    
                    {/* Party Members */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-200 mb-2">Party Members:</h4>
                      <div className="space-y-1">
                        {memberProfiles.map((member, index) => {
                          const username = member.profile?.username || `User ${index + 1}`;
                          const isDM = member.userId === party.dmId;
                          
                          return (
                            <div key={member.userId} className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-300">{username}</span>
                                {isDM && (
                                  <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                    DM
                                  </span>
                                )}
                              </div>
                              {member.userId === user?.uid && (
                                <span className="text-blue-400 text-xs font-medium">(You)</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  
                  {party.dmId === user.uid && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Invite Code
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={party.inviteCode}
                          readOnly
                          className="fantasy-input bg-gray-700"
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
                    {party.members?.includes(user?.uid) ? (
                      <>
                        <button
                          onClick={() => navigate(`/campaign-story/${party.id}`)}
                          className="fantasy-button"
                        >
                          Campaign
                        </button>
                        {party.dmId === user.uid && (
                          <button
                            onClick={() => handleDisbandParty(party.id, party.name)}
                            className="fantasy-button bg-red-600 hover:bg-red-700"
                            disabled={loading}
                          >
                            Disband
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => handleJoinPublicParty(party.id)}
                        className="fantasy-button bg-green-600 hover:bg-green-700"
                        disabled={loading}
                      >
                        Join Party
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Public Parties */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Public Parties</h2>
          {publicParties.length === 0 ? (
            <div className="text-center py-8 text-gray-300">
              <p>No public parties available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {publicParties.map(party => {
                const memberProfiles = publicPartyMemberProfiles[party.id] || [];
                
                return (
                <div key={party.id} className="fantasy-card bg-amber-900/20 border-amber-600">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-100">{party.name}</h3>
                    <span className="text-sm text-gray-300">
                      {party.members?.length || 1}/{party.maxPlayers} players
                    </span>
                  </div>
                  
                    {party.description && (
                      <div className="mb-4">
                        <span className="text-sm font-semibold text-gray-200">Theme: </span>
                        <span className="text-gray-300">{party.description}</span>
                      </div>
                    )}
                    
                    {/* Party Members */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-200 mb-2">Party Members:</h4>
                      <div className="space-y-1">
                        {memberProfiles.map((member, index) => {
                          const username = member.profile?.username || `User ${index + 1}`;
                          const isDM = member.userId === party.dmId;
                          
                          return (
                            <div key={member.userId} className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-300">{username}</span>
                                {isDM && (
                                  <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                    DM
                                  </span>
                                )}
                              </div>
                              {member.userId === user?.uid && (
                                <span className="text-blue-400 text-xs font-medium">(You)</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  
                  {party.dmId === user.uid && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Invite Code
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={party.inviteCode}
                          readOnly
                          className="fantasy-input bg-gray-700"
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
                      onClick={() => handleJoinPublicParty(party.id)}
                      className="fantasy-button bg-green-600 hover:bg-green-700"
                      disabled={loading}
                    >
                      Join Party
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Join Party */}
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Join a Party</h2>
          <div className="fantasy-card bg-amber-900/20 border-amber-600">
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