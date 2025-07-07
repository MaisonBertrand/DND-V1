import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../firebase/auth';
import { getUserParties, disbandParty, getCharacterByUserAndParty, getUserProfile, getUserProfiles, createParty, joinParty, getPartyByInviteCode, getPublicParties, subscribeToParty } from '../firebase/database';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [parties, setParties] = useState([]);
  const [publicParties, setPublicParties] = useState([]);
  const [partyMemberProfiles, setPartyMemberProfiles] = useState({});
  const [publicPartyMemberProfiles, setPublicPartyMemberProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [deletingParty, setDeletingParty] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [newParty, setNewParty] = useState({
    name: '',
    description: '',
    maxPlayers: 6,
    isPublic: false,
    inviteCode: '',
    campaignType: 'ai-assist' // 'ai-assist' or 'manual'
  });

  // Ensure parties is always an array to prevent errors
  const safeParties = Array.isArray(parties) ? parties.filter(party => party && party.id) : [];

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadUserData(user.uid);
      } else {
        navigate('/login');
      }
    }
  }, [user, authLoading, navigate]);

  // Real-time party updates
  useEffect(() => {
    if (!user?.uid || !safeParties.length || deletingParty) return;

    // Filter out any null or undefined parties before creating subscriptions
    const validParties = safeParties.filter(party => party && party.id);
    
    if (validParties.length === 0) return;
    
    const unsubscribeParties = validParties.map(party => {
      if (!party || !party.id) return null;
      
      return subscribeToParty(party.id, (updatedParty) => {
        if (!updatedParty || !updatedParty.id || deletingParty) return;
        
        setParties(prevParties => {
          // Filter out any null parties first
          const validPrevParties = prevParties.filter(p => p && p.id);
          return validPrevParties.map(p => p.id === updatedParty.id ? updatedParty : p);
        });
        
        // Reload member profiles when party updates
        loadPartyMemberProfiles([updatedParty]);
      });
    }).filter(Boolean); // Remove any null subscriptions

    return () => {
      unsubscribeParties.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [user?.uid, parties.length, deletingParty]);

  const loadUserData = async (userId) => {
    try {
      // Load user profile first
      const profile = await getUserProfile(userId);
      setUserProfile(profile);
      
      const userParties = await getUserParties(userId);
      
      // Filter out any null or invalid parties
      const validParties = userParties.filter(party => party && party.id);
      
      await loadPartyMemberProfiles(validParties);
      setParties(validParties);
      
      // Load public parties
      await loadPublicParties();
    } catch (error) {
      console.error('Error loading user data:', error);
      // Set empty arrays to prevent null reference errors
      setParties([]);
      setPartyMemberProfiles({});
    } finally {
      setLoading(false);
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
      // Validate parties array
      if (!parties || !Array.isArray(parties)) {
        console.log('No parties to load profiles for');
        return;
      }

      // Collect all unique user IDs from all parties
      const allUserIds = new Set();
      parties.forEach(party => {
        if (party && party.members && Array.isArray(party.members)) {
          party.members.forEach(memberId => allUserIds.add(memberId));
        }
      });

      if (allUserIds.size === 0) return;

      // Get all user profiles
      const profiles = await getUserProfiles(Array.from(allUserIds));
      
      // Create a map of userId to profile
      const profileMap = {};
      profiles.forEach(profile => {
        if (profile && profile.userId) {
          profileMap[profile.userId] = profile;
        }
      });

      setPartyMemberProfiles(profileMap);
    } catch (error) {
      console.error('Error loading party member profiles:', error);
    }
  };

  const loadPublicPartyMemberProfiles = async (parties) => {
    try {
      // Validate parties array
      if (!parties || !Array.isArray(parties)) {
        console.log('No public parties to load profiles for');
        return;
      }

      // Collect all unique user IDs from all public parties
      const allUserIds = new Set();
      parties.forEach(party => {
        if (party && party.members && Array.isArray(party.members)) {
          party.members.forEach(memberId => allUserIds.add(memberId));
        }
      });

      if (allUserIds.size === 0) return;

      // Get all user profiles
      const profiles = await getUserProfiles(Array.from(allUserIds));
      
      // Create a map of userId to profile
      const profileMap = {};
      profiles.forEach(profile => {
        if (profile && profile.userId) {
          profileMap[profile.userId] = profile;
        }
      });

      setPublicPartyMemberProfiles(profileMap);
    } catch (error) {
      console.error('Error loading public party member profiles:', error);
    }
  };

  const handleDeleteParty = async (partyId) => {
    try {
      if (!partyId) {
        console.error('Invalid party ID for deletion');
        return;
      }
      
      setDeletingParty(true);
      setLoading(true);
      
      // Immediately remove the party from local state to prevent subscription issues
      setParties(prevParties => prevParties.filter(party => party && party.id !== partyId));
      
      // Delete the party from the database
      await disbandParty(partyId, user.uid);
      
      // Reload all user data to ensure consistency
      await loadUserData(user.uid);
    } catch (error) {
      console.error('Error deleting party:', error);
      // Even if there's an error, try to reload data to ensure UI consistency
      await loadUserData(user.uid);
    } finally {
      setLoading(false);
      setDeletingParty(false);
    }
  };

  const handleContinueCampaign = async (partyId) => {
    try {
      if (!user?.uid) {
        alert('User not authenticated. Please log in again.');
        return;
      }
      
      if (!partyId) {
        alert('Invalid party information.');
        return;
      }
      
      // Find the party to get its campaign type
      const party = safeParties.find(p => p.id === partyId);
      if (!party) {
        alert('Party not found.');
        return;
      }
      
      // Check if user has a character for this party
      const userCharacter = await getCharacterByUserAndParty(user.uid, partyId);
      
      if (userCharacter) {
        // User has a character
        if (party.campaignType === 'ai-assist') {
          // For AI assist campaigns, go directly to campaign story (ready-up screen)
          navigate(`/campaign/${partyId}`);
        } else {
          // For manual campaigns, go to lobby
          navigate(`/lobby/${partyId}`);
        }
      } else {
        // User needs to create a character first
        navigate(`/character-creation/${partyId}`);
      }
    } catch (error) {
      console.error('Error in handleContinueCampaign:', error);
      // If there's an error, default to character creation
      navigate(`/character-creation/${partyId}`);
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
      setNewParty({ name: '', description: '', maxPlayers: 6, isPublic: false, inviteCode: '', campaignType: 'ai-assist' });
      
      // Reload parties after creation
      await loadUserData(user.uid);
      
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
      await loadUserData(user.uid);
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
      await loadUserData(user.uid);
      console.log('Successfully joined public party!');
    } catch (error) {
      console.error(error.message || 'Error joining party. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  // Get username from user profile or fallback to display name
  const getUsername = () => {
    // Priority: userProfile.username > user.displayName > email username
    if (userProfile?.username) {
      return userProfile.username;
    }
    if (user?.displayName) {
      return user.displayName;
    }
    if (user?.email) {
      const emailUsername = user.email.split('@')[0];
      return emailUsername;
    }
    return 'Adventurer';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg font-medium">
            {deletingParty ? 'Deleting campaign...' : 'Loading your adventures...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="fantasy-container">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="text-center mb-6">
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 mb-4 leading-relaxed pb-2">
              Campaign Dashboard
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-amber-400 to-orange-400 mx-auto rounded-full"></div>
          </div>
          <div className="text-center">
            <p className="text-slate-300 text-lg sm:text-xl">
              Welcome back, <span className="text-amber-400 font-semibold">{getUsername()}</span>!
            </p>
            <p className="text-slate-400 mt-2 text-sm sm:text-base">
              Create, join, and manage your D&D campaigns
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-6 hover:from-amber-500/20 hover:to-orange-500/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/20">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-100">Create New Campaign</h3>
              </div>
              <p className="text-slate-300 mb-6 text-sm leading-relaxed">
                Start a new campaign and invite friends to join your adventures.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                disabled={loading}
              >
                Create Campaign
              </button>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-600/10 to-slate-500/10 border border-slate-500/20 p-6 hover:from-slate-600/20 hover:to-slate-500/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-slate-500/20">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-600/5 to-slate-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-500 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-100">Join Campaign</h3>
              </div>
              <p className="text-slate-300 mb-6 text-sm leading-relaxed">
                Join an existing campaign using an invite code.
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Enter invite code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="flex-1 bg-slate-700/50 border border-slate-600/50 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                  disabled={loading}
                />
                <button
                  onClick={handleJoinParty}
                  className="bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-700 hover:to-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                  disabled={loading}
                >
                  {loading ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Create Campaign Form */}
        {showCreateForm && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600/50 backdrop-blur-sm mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5"></div>
            <div className="relative z-10 p-6 sm:p-8">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-100">Create New Campaign</h2>
              </div>
              
              <form onSubmit={handleCreateParty} className="space-y-6">
                {/* Campaign Type Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-4">
                    Campaign Type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 ${
                        newParty.campaignType === 'ai-assist'
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                      }`}
                      onClick={() => setNewParty(prev => ({ ...prev, campaignType: 'ai-assist' }))}
                    >
                      <div className="flex items-center mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                          newParty.campaignType === 'ai-assist'
                            ? 'bg-amber-500'
                            : 'bg-slate-600'
                        }`}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <h3 className="font-semibold text-slate-100">AI Assist</h3>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        AI-powered storytelling with dynamic encounters, NPCs, and story generation. Perfect for immersive adventures.
                      </p>
                    </div>
                    
                    <div
                      className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 ${
                        newParty.campaignType === 'manual'
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                      }`}
                      onClick={() => setNewParty(prev => ({ ...prev, campaignType: 'manual' }))}
                    >
                      <div className="flex items-center mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                          newParty.campaignType === 'manual'
                            ? 'bg-amber-500'
                            : 'bg-slate-600'
                        }`}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        <h3 className="font-semibold text-slate-100">Manual Campaign</h3>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        Traditional D&D experience with manual story creation. No AI dependencies - full control over your campaign.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="party-name" className="block text-sm font-semibold text-slate-200 mb-2">
                      Campaign Name
                    </label>
                    <input
                      id="party-name"
                      type="text"
                      value={newParty.name}
                      onChange={(e) => setNewParty(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-slate-600/50 text-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="max-players" className="block text-sm font-semibold text-slate-200 mb-2">
                      Max Players
                    </label>
                    <input
                      id="max-players"
                      type="number"
                      min="2"
                      max="10"
                      value={newParty.maxPlayers}
                      onChange={(e) => setNewParty(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
                      className="w-full bg-slate-700/50 border border-slate-600/50 text-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="party-theme" className="block text-sm font-semibold text-slate-200 mb-2">
                    Theme & Description
                  </label>
                  <textarea
                    id="party-theme"
                    value={newParty.description}
                    onChange={(e) => setNewParty(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-700/50 border border-slate-600/50 text-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                    rows="3"
                    placeholder="Enter the theme or atmosphere for your campaign..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newParty.isPublic}
                    onChange={(e) => setNewParty(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="w-4 h-4 text-amber-500 bg-slate-700 border-slate-600 rounded focus:ring-amber-500/50 focus:ring-2"
                  />
                  <label htmlFor="isPublic" className="ml-2 text-sm font-medium text-slate-300">
                    Public Campaign (visible to all users)
                  </label>
                </div>

                <div className="flex space-x-4">
                  <button 
                    type="submit" 
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Campaign'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-700 hover:to-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* My Campaigns */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600/50 backdrop-blur-sm mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5"></div>
          <div className="relative z-10 p-6 sm:p-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-100">My Campaigns</h2>
            </div>
            
            {safeParties.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-300 mb-2">No Campaigns Yet</h3>
                <p className="text-slate-400 mb-6">Create your first campaign to start adventuring!</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  Create Your First Campaign
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {safeParties.map((party) => (
                  <div key={party.id} className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-600/50 border border-slate-500/50 p-6 hover:from-slate-700/70 hover:to-slate-600/70 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-amber-400 transition-colors duration-300">
                            {party.name}
                          </h3>
                          <p className="text-slate-300 text-sm leading-relaxed mb-3">
                            {party.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-400">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {party.members?.length || 0} members
                            </div>
                            <div className="flex items-center">
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                party.campaignType === 'ai-assist'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-600/20 text-slate-300 border border-slate-500/30'
                              }`}>
                                {party.campaignType === 'ai-assist' ? '🤖 AI Assist' : '✍️ Manual'}
                              </div>
                            </div>
                            {party.members && party.members.length > 0 && (
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="max-w-xs truncate">
                                  {party.members.map((memberId, index) => {
                                    const memberProfile = partyMemberProfiles[memberId];
                                    let memberName = 'Unknown';
                                    
                                    if (memberProfile?.username) {
                                      memberName = memberProfile.username;
                                    } else if (memberProfile?.displayName) {
                                      memberName = memberProfile.displayName;
                                    } else if (memberProfile?.email) {
                                      memberName = memberProfile.email.split('@')[0];
                                    }
                                    
                                    return (
                                      <span key={memberId}>
                                        {memberName}
                                        {index < party.members.length - 1 ? ', ' : ''}
                                      </span>
                                    );
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => handleContinueCampaign(party.id)}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Continue
                        </button>
                        {party.dmId === user?.uid && (
                          <button
                            onClick={() => handleDeleteParty(party.id)}
                            className="flex-1 bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-700 hover:to-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        )}
                      </div>
                      
                      {/* Show invite code if user is DM/creator */}
                      {party.dmId === user?.uid && party.inviteCode && (
                        <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-300">Invite Code:</span>
                            <span className="text-sm font-mono text-amber-400 bg-slate-800 px-2 py-1 rounded select-all">
                              {party.inviteCode}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Public Campaigns */}
        {publicParties.length > 0 && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600/50 backdrop-blur-sm mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-500/5 to-slate-400/5"></div>
            <div className="relative z-10 p-6 sm:p-8">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-500 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-100">Public Campaigns</h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {publicParties.map(party => {
                  const memberProfiles = publicPartyMemberProfiles[party.id] || [];
                  
                  return (
                    <div key={party.id} className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-600/50 border border-slate-500/50 p-6 hover:from-slate-700/70 hover:to-slate-600/70 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-500/5 to-slate-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-bold text-slate-100 group-hover:text-slate-300 transition-colors duration-300">{party.name}</h3>
                          <span className="text-sm text-slate-400 bg-slate-600/50 px-2 py-1 rounded-full">
                            {party.members?.length || 1}/{party.maxPlayers} players
                          </span>
                        </div>
                        
                        {party.description && (
                          <p className="text-slate-300 text-sm leading-relaxed mb-4">
                            {party.description}
                          </p>
                        )}
                        
                        {/* Party Members */}
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Members
                          </h4>
                          <div className="space-y-1">
                            {party.members?.map((memberId, index) => {
                              const memberProfile = publicPartyMemberProfiles[memberId];
                              let username = `User ${index + 1}`;
                              
                              if (memberProfile?.username) {
                                username = memberProfile.username;
                              } else if (memberProfile?.displayName) {
                                username = memberProfile.displayName;
                              } else if (memberProfile?.email) {
                                username = memberProfile.email.split('@')[0];
                              }
                              
                              const isDM = memberId === party.dmId;
                              
                              return (
                                <div key={memberId} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-slate-300">{username}</span>
                                    {isDM && (
                                      <span className="bg-gradient-to-r from-slate-600 to-slate-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                        DM
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          onClick={() => handleJoinPublicParty(party.id)}
                          className="w-full bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-700 hover:to-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                          disabled={loading}
                        >
                          Join Campaign
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
