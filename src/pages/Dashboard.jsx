import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { getUserParties, getUserProfile, getUserProfiles } from '../firebase/database';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [parties, setParties] = useState([]);
  const [partyMemberProfiles, setPartyMemberProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      loadUserData(user.uid);
    });
    return () => unsubscribe();
  }, [navigate]);

  const loadUserData = async (userId) => {
    try {
      const [userParties, profile] = await Promise.all([
        getUserParties(userId),
        getUserProfile(userId)
      ]);
      setParties(userParties);
      setUserProfile(profile);
      
      // Load user profiles for all party members
      await loadPartyMemberProfiles(userParties);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
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

  const displayName = userProfile?.username || user.email;

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card">
        <div className="flex justify-between items-center mb-6">
          <h1 className="fantasy-title mb-0">Welcome, {displayName}</h1>
        </div>
        
        {/* Your Parties */}
        <div>
          <h2 className="text-2xl font-bold text-stone-800 mb-6">Your Parties</h2>
          {parties.length === 0 ? (
            <div className="text-center py-8 text-stone-600">
              <p>You haven't joined any parties yet.</p>
              <p className="text-sm mt-2">Go to the Parties tab to create or join a party!</p>
              <button
                onClick={() => navigate('/party-management')}
                className="fantasy-button mt-4"
              >
                Go to Parties
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {parties.map(party => {
                const memberProfiles = partyMemberProfiles[party.id] || [];
                
                return (
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
                    
                    {/* Party Members */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-stone-700 mb-2">Party Members:</h4>
                      <div className="space-y-1">
                        {memberProfiles.map((member, index) => {
                          const username = member.profile?.username || `User ${index + 1}`;
                          const isDM = member.userId === party.dmId;
                          
                          return (
                            <div key={member.userId} className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="text-stone-600">{username}</span>
                                {isDM && (
                                  <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                    DM
                                  </span>
                                )}
                              </div>
                              {member.userId === user?.uid && (
                                <span className="text-blue-600 text-xs font-medium">(You)</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/campaign-story/${party.id}`)}
                        className="fantasy-button flex-1"
                      >
                        View Campaign
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 