import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  getPartyById, 
  getPartyCharacters, 
  getUserProfiles,
  subscribeToParty 
} from '../firebase/database';
import { useAuth } from './AuthContext';

const PartyContext = createContext();

export const useParty = () => {
  const context = useContext(PartyContext);
  if (!context) {
    throw new Error('useParty must be used within a PartyProvider');
  }
  return context;
};

export const PartyProvider = ({ children }) => {
  const { partyId } = useParams();
  const { user, isAuthenticated } = useAuth();
  
  const [party, setParty] = useState(null);
  const [partyCharacters, setPartyCharacters] = useState([]);
  const [partyMemberProfiles, setPartyMemberProfiles] = useState({});
  const [userCharacter, setUserCharacter] = useState(null);
  const [isDM, setIsDM] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load party data
  const loadPartyData = useCallback(async () => {
    if (!partyId || !isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      // Load party information
      const partyData = await getPartyById(partyId);
      setParty(partyData);
      
      // Check if user is DM
      setIsDM(partyData.dmId === user.uid);
      
      // Load party characters
      const characters = await getPartyCharacters(partyId);
      setPartyCharacters(characters);
      
      // Find user's character
      const userChar = characters.find(char => char.userId === user.uid);
      setUserCharacter(userChar);
      
      // Load party member profiles
      if (partyData.members && partyData.members.length > 0) {
        const profiles = await getUserProfiles(partyData.members);
        const profileMap = {};
        profiles.forEach(profile => {
          if (profile && profile.userId) {
            profileMap[profile.userId] = profile;
          }
        });
        setPartyMemberProfiles(profileMap);
      }
    } catch (err) {
      console.error('Error loading party data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [partyId, user?.uid, isAuthenticated]);

  // Subscribe to real-time party updates
  useEffect(() => {
    if (!partyId || !isAuthenticated) return;

    const unsubscribe = subscribeToParty(partyId, async (updatedParty) => {
      if (updatedParty) {
        setParty(updatedParty);
        setIsDM(updatedParty.dmId === user.uid);
        
        // Reload characters when party updates
        try {
          const characters = await getPartyCharacters(partyId);
          setPartyCharacters(characters);
          
          const userChar = characters.find(char => char.userId === user.uid);
          setUserCharacter(userChar);
        } catch (err) {
          console.error('Error reloading characters:', err);
        }
      }
    });

    return () => unsubscribe();
  }, [partyId, user?.uid, isAuthenticated]);

  // Initial load
  useEffect(() => {
    loadPartyData();
  }, [loadPartyData]);

  // Memoized utility functions
  const getUsername = useCallback((userId) => {
    const profile = partyMemberProfiles[userId];
    if (profile && profile.username) {
      return profile.username;
    }
    return 'Unknown User';
  }, [partyMemberProfiles]);

  const getCharacterStatus = useCallback((character) => {
    if (!character) return 'No Character';
    if (character.hp <= 0) return 'Dead';
    if (character.hp < character.maxHp * 0.5) return 'Injured';
    return 'Ready';
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'Ready': return 'text-green-400';
      case 'Injured': return 'text-yellow-400';
      case 'Dead': return 'text-red-400';
      case 'No Character': return 'text-red-400';
      default: return 'text-slate-400';
    }
  }, []);

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'Ready': return '✅';
      case 'Injured': return '⚠️';
      case 'Dead': return '💀';
      case 'No Character': return '❌';
      default: return '❓';
    }
  }, []);

  // Memoized computed values
  const playerCount = useMemo(() => {
    return partyCharacters.filter(char => char.userId !== party?.dmId).length;
  }, [partyCharacters, party?.dmId]);

  const nonDMMembers = useMemo(() => {
    return party?.members?.filter(memberId => memberId !== party.dmId) || [];
  }, [party?.members, party?.dmId]);

  // Memoized context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    // State
    party,
    partyCharacters,
    partyMemberProfiles,
    userCharacter,
    isDM,
    loading,
    error,
    
    // Computed values
    playerCount,
    nonDMMembers,
    
    // Actions
    setParty,
    setPartyCharacters,
    setPartyMemberProfiles,
    setUserCharacter,
    setError,
    reloadPartyData: loadPartyData,
    
    // Utility functions
    getUsername,
    getCharacterStatus,
    getStatusColor,
    getStatusIcon
  }), [
    party,
    partyCharacters,
    partyMemberProfiles,
    userCharacter,
    isDM,
    loading,
    error,
    playerCount,
    nonDMMembers,
    loadPartyData,
    getUsername,
    getCharacterStatus,
    getStatusColor,
    getStatusIcon
  ]);

  return (
    <PartyContext.Provider value={value}>
      {children}
    </PartyContext.Provider>
  );
}; 