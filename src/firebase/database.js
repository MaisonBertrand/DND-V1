import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from './config';

// Helper function to handle Firestore errors
const handleDatabaseError = (error, operation) => {
  console.error(`Error in ${operation}:`, error);
  
  // Handle specific error types
  if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
    throw new Error('Network connection issue. Please check your internet connection and try again.');
  } else if (error.code === 'permission-denied') {
    throw new Error('Access denied. Please check your permissions.');
  } else if (error.code === 'not-found') {
    throw new Error('The requested data was not found.');
  } else {
    throw new Error(`Database error: ${error.message}`);
  }
};

// User Profile Management
export const createUserProfile = async (userId, userData) => {
  try {
    const profile = {
      ...userData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'userProfiles'), profile);
    return { id: docRef.id, ...profile };
  } catch (error) {
    handleDatabaseError(error, 'createUserProfile');
  }
};

export const getUserProfile = async (userId) => {
  try {
    const q = query(
      collection(db, 'userProfiles'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    handleDatabaseError(error, 'getUserProfile');
  }
};

export const getUserProfiles = async (userIds) => {
  try {
    if (!userIds || userIds.length === 0) {
      return [];
    }
    
    // Firestore doesn't support 'in' queries with more than 10 items
    // So we'll batch the requests if needed
    const batches = [];
    for (let i = 0; i < userIds.length; i += 10) {
      const batch = userIds.slice(i, i + 10);
      const q = query(
        collection(db, 'userProfiles'),
        where('userId', 'in', batch)
      );
      batches.push(getDocs(q));
    }
    
    const results = await Promise.all(batches);
    const profiles = [];
    
    results.forEach(querySnapshot => {
      querySnapshot.docs.forEach(doc => {
        profiles.push({ id: doc.id, ...doc.data() });
      });
    });
    
    return profiles;
  } catch (error) {
    handleDatabaseError(error, 'getUserProfiles');
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }
    
    const profileRef = doc(db, 'userProfiles', profile.id);
    await updateDoc(profileRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleDatabaseError(error, 'updateUserProfile');
  }
};

export const checkUsernameAvailability = async (username) => {
  try {
    const q = query(
      collection(db, 'userProfiles'),
      where('username', '==', username)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty; // true if username is available
  } catch (error) {
    handleDatabaseError(error, 'checkUsernameAvailability');
  }
};

// Character Management
export const saveCharacter = async (userId, partyId, characterData) => {
  try {
    const character = {
      ...characterData,
      userId,
      partyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'characters'), character);
    return { id: docRef.id, ...character };
  } catch (error) {
    handleDatabaseError(error, 'saveCharacter');
  }
};

export const getUserCharacters = async (userId) => {
  try {
    const q = query(
      collection(db, 'characters'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    handleDatabaseError(error, 'getUserCharacters');
  }
};

export const getCharacterByUserAndParty = async (userId, partyId) => {
  try {
    const q = query(
      collection(db, 'characters'),
      where('userId', '==', userId),
      where('partyId', '==', partyId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    handleDatabaseError(error, 'getCharacterByUserAndParty');
  }
};

export const getPartyCharacters = async (partyId) => {
  try {
    const q = query(
      collection(db, 'characters'),
      where('partyId', '==', partyId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    handleDatabaseError(error, 'getPartyCharacters');
  }
};

export const updateCharacter = async (characterId, updates) => {
  try {
    const characterRef = doc(db, 'characters', characterId);
    await updateDoc(characterRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleDatabaseError(error, 'updateCharacter');
  }
};

// Party Management
export const createParty = async (dmId, partyData) => {
  try {
    const party = {
      ...partyData,
      dmId,
      members: [dmId], // DM is automatically a member
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'parties'), party);
    return { id: docRef.id, ...party };
  } catch (error) {
    handleDatabaseError(error, 'createParty');
  }
};

export const getUserParties = async (userId) => {
  try {
    const q = query(
      collection(db, 'parties'),
      where('members', 'array-contains', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    const parties = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      };
    });
    
    return parties;
  } catch (error) {
    handleDatabaseError(error, 'getUserParties');
  }
};

export const getPublicParties = async () => {
  try {
    const q = query(
      collection(db, 'parties'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const parties = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      };
    });
    
    return parties;
  } catch (error) {
    handleDatabaseError(error, 'getPublicParties');
  }
};

export const joinParty = async (partyId, userId) => {
  try {
    const partyRef = doc(db, 'parties', partyId);
    const partyDoc = await getDoc(partyRef);
    
    if (!partyDoc.exists()) {
      throw new Error('Party not found');
    }
    
    const partyData = partyDoc.data();
    if (partyData.members.includes(userId)) {
      throw new Error('User already in party');
    }
    
    await updateDoc(partyRef, {
      members: [...partyData.members, userId],
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleDatabaseError(error, 'joinParty');
  }
};

export const disbandParty = async (partyId, dmId) => {
  try {
    const partyRef = doc(db, 'parties', partyId);
    const partyDoc = await getDoc(partyRef);
    
    if (!partyDoc.exists()) {
      throw new Error('Party not found');
    }
    
    const partyData = partyDoc.data();
    if (partyData.dmId !== dmId) {
      throw new Error('Only the party leader can disband the party');
    }
    
    // Delete the party
    await deleteDoc(partyRef);
    
    // Delete all characters in this party
    const charactersQuery = query(
      collection(db, 'characters'),
      where('partyId', '==', partyId)
    );
    const characterDocs = await getDocs(charactersQuery);
    
    const deletePromises = characterDocs.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Delete campaign story if it exists
    const storyQuery = query(
      collection(db, 'campaignStories'),
      where('partyId', '==', partyId)
    );
    const storyDocs = await getDocs(storyQuery);
    
    const storyDeletePromises = storyDocs.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(storyDeletePromises);
    
  } catch (error) {
    handleDatabaseError(error, 'disbandParty');
  }
};

export const getPartyByInviteCode = async (inviteCode) => {
  try {
    const q = query(
      collection(db, 'parties'),
      where('inviteCode', '==', inviteCode)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    handleDatabaseError(error, 'getPartyByInviteCode');
  }
};

export const getPartyById = async (partyId) => {
  try {
    const partyRef = doc(db, 'parties', partyId);
    const partyDoc = await getDoc(partyRef);
    
    if (!partyDoc.exists()) {
      return null;
    }
    
    return { id: partyDoc.id, ...partyDoc.data() };
  } catch (error) {
    handleDatabaseError(error, 'getPartyById');
  }
};

// Campaign Management
export const saveCampaign = async (partyId, campaignData) => {
  try {
    const campaign = {
      ...campaignData,
      partyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'campaigns'), campaign);
    return { id: docRef.id, ...campaign };
  } catch (error) {
    handleDatabaseError(error, 'saveCampaign');
  }
};

export const getCampaignByParty = async (partyId) => {
  try {
    const q = query(
      collection(db, 'campaigns'),
      where('partyId', '==', partyId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    handleDatabaseError(error, 'getCampaignByParty');
  }
};

export const updateCampaign = async (campaignId, updates) => {
  try {
    const campaignRef = doc(db, 'campaigns', campaignId);
    await updateDoc(campaignRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleDatabaseError(error, 'updateCampaign');
  }
};

// Combat Management
export const saveCombat = async (partyId, combatData) => {
  try {
    const combat = {
      ...combatData,
      partyId,
      status: 'active', // active, ended
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'combats'), combat);
    return { id: docRef.id, ...combat };
  } catch (error) {
    handleDatabaseError(error, 'saveCombat');
  }
};

export const getActiveCombat = async (partyId) => {
  try {
    const q = query(
      collection(db, 'combats'),
      where('partyId', '==', partyId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    handleDatabaseError(error, 'getActiveCombat');
  }
};

export const updateCombat = async (combatId, updates) => {
  try {
    const combatRef = doc(db, 'combats', combatId);
    await updateDoc(combatRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleDatabaseError(error, 'updateCombat');
  }
};

// Real-time listeners
export const subscribeToParty = (partyId, callback) => {
  const partyRef = doc(db, 'parties', partyId);
  return onSnapshot(partyRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
};

export const subscribeToCampaign = (partyId, callback) => {
  const q = query(
    collection(db, 'campaigns'),
    where('partyId', '==', partyId)
  );
  return onSnapshot(q, (querySnapshot) => {
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
};

export const subscribeToCombat = (partyId, callback) => {
  const q = query(
    collection(db, 'combats'),
    where('partyId', '==', partyId),
    where('status', '==', 'active')
  );
  return onSnapshot(q, (querySnapshot) => {
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
};

// Campaign Story Management
export const createCampaignStory = async (partyId) => {
  try {
    const story = {
      partyId,
      status: 'ready_up', // ready_up, voting, storytelling, paused, completed
      currentPlot: null,
      storyMessages: [],
      votingSession: null,
      readyPlayers: [],
      lastUpdated: serverTimestamp(),
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'campaignStories'), story);
    return { id: docRef.id, ...story };
  } catch (error) {
    handleDatabaseError(error, 'createCampaignStory');
  }
};

export const getCampaignStory = async (partyId) => {
  try {
    const q = query(
      collection(db, 'campaignStories'),
      where('partyId', '==', partyId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    handleDatabaseError(error, 'getCampaignStory');
  }
};

export const updateCampaignStory = async (storyId, updates) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    await updateDoc(storyRef, {
      ...updates,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    handleDatabaseError(error, 'updateCampaignStory');
  }
};

export const addStoryMessage = async (storyId, message) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    const storyDoc = await getDoc(storyRef);
    const storyData = storyDoc.data();
    
    const newMessage = {
      id: `msg_${Date.now()}`,
      ...message,
      timestamp: new Date()
    };
    
    await updateDoc(storyRef, {
      storyMessages: [...storyData.storyMessages, newMessage],
      lastUpdated: serverTimestamp()
    });
    
    return newMessage;
  } catch (error) {
    handleDatabaseError(error, 'addStoryMessage');
  }
};

export const setPlayerReady = async (storyId, userId) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    const storyDoc = await getDoc(storyRef);
    const storyData = storyDoc.data();
    
    const readyPlayers = storyData.readyPlayers || [];
    if (!readyPlayers.includes(userId)) {
      await updateDoc(storyRef, {
        readyPlayers: [...readyPlayers, userId],
        lastUpdated: serverTimestamp()
      });
    }
  } catch (error) {
    handleDatabaseError(error, 'setPlayerReady');
  }
};

export const subscribeToCampaignStory = (storyId, callback) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    return onSnapshot(storyRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      } else {
        callback(null);
      }
    });
  } catch (error) {
    handleDatabaseError(error, 'subscribeToCampaignStory');
  }
};

export const setCurrentSpeaker = async (storyId, speakerData) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    await updateDoc(storyRef, {
      currentSpeaker: speakerData,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    handleDatabaseError(error, 'setCurrentSpeaker');
  }
};

export const setCurrentController = async (storyId, controllerId) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    await updateDoc(storyRef, {
      currentController: controllerId,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    handleDatabaseError(error, 'setCurrentController');
  }
};

export const createCombatSession = async (partyId, combatData) => {
  try {
    const combat = {
      partyId,
      status: 'active',
      storyContext: combatData.storyContext,
      partyMembers: combatData.partyMembers,
      enemies: combatData.enemies,
      initiative: combatData.initiative,
      currentTurn: 0,
      combatState: 'preparation',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'combatSessions'), combat);
    return { id: docRef.id, ...combat };
  } catch (error) {
    handleDatabaseError(error, 'createCombatSession');
  }
};

export const getCombatSession = async (partyId) => {
  try {
    const q = query(
      collection(db, 'combatSessions'),
      where('partyId', '==', partyId),
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    handleDatabaseError(error, 'getCombatSession');
  }
};

export const updateCombatSession = async (combatId, updates) => {
  try {
    const combatRef = doc(db, 'combatSessions', combatId);
    await updateDoc(combatRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleDatabaseError(error, 'updateCombatSession');
  }
};

export const subscribeToCombatSession = (partyId, callback) => {
  try {
    const q = query(
      collection(db, 'combatSessions'),
      where('partyId', '==', partyId),
      where('status', '==', 'active')
    );
    return onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        callback({ id: doc.id, ...doc.data() });
      } else {
        callback(null);
      }
    });
  } catch (error) {
    handleDatabaseError(error, 'subscribeToCombatSession');
  }
};

// Character Preset Management
export const saveCharacterPreset = async (userId, presetData) => {
  try {
    console.log('saveCharacterPreset called with:', { userId, presetData });
    
    const profile = await getUserProfile(userId);
    console.log('User profile retrieved:', profile);
    
    if (!profile) {
      console.error('User profile not found for userId:', userId);
      throw new Error('User profile not found');
    }
    
    const preset = {
      id: Date.now().toString(), // Simple ID generation
      name: presetData.name,
      data: presetData.data,
      createdAt: new Date() // Use regular Date instead of serverTimestamp for arrays
    };
    
    console.log('Created preset object:', preset);
    
    const existingPresets = profile.characterPresets || [];
    console.log('Existing presets:', existingPresets);
    
    const updatedPresets = [...existingPresets, preset];
    console.log('Updated presets array:', updatedPresets);
    
    const profileRef = doc(db, 'userProfiles', profile.id);
    console.log('Updating profile with ID:', profile.id);
    
    await updateDoc(profileRef, {
      characterPresets: updatedPresets,
      updatedAt: serverTimestamp()
    });
    
    console.log('Profile updated successfully');
    return preset;
  } catch (error) {
    handleDatabaseError(error, 'saveCharacterPreset');
  }
};

export const getUserCharacterPresets = async (userId) => {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) {
      return [];
    }
    
    return profile.characterPresets || [];
  } catch (error) {
    handleDatabaseError(error, 'getUserCharacterPresets');
  }
};

export const deleteCharacterPreset = async (userId, presetId) => {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }
    
    const existingPresets = profile.characterPresets || [];
    const updatedPresets = existingPresets.filter(preset => preset.id !== presetId);
    
    const profileRef = doc(db, 'userProfiles', profile.id);
    await updateDoc(profileRef, {
      characterPresets: updatedPresets,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleDatabaseError(error, 'deleteCharacterPreset');
  }
};

export const updateCampaignMetadata = async (storyId, updates) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    const storyDoc = await getDoc(storyRef);
    const storyData = storyDoc.data();
    
    const currentMetadata = storyData.campaignMetadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...updates,
      lastUpdated: serverTimestamp()
    };
    
    await updateDoc(storyRef, {
      campaignMetadata: updatedMetadata,
      lastUpdated: serverTimestamp()
    });
    
    return updatedMetadata;
  } catch (error) {
    handleDatabaseError(error, 'updateCampaignMetadata');
  }
};

export const saveCampaignSession = async (storyId, sessionData) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    const storyDoc = await getDoc(storyRef);
    const storyData = storyDoc.data();
    
    const sessions = storyData.campaignSessions || [];
    const newSession = {
      id: `session_${Date.now()}`,
      ...sessionData,
      timestamp: serverTimestamp()
    };
    
    await updateDoc(storyRef, {
      campaignSessions: [...sessions, newSession],
      lastUpdated: serverTimestamp()
    });
    
    return newSession;
  } catch (error) {
    handleDatabaseError(error, 'saveCampaignSession');
  }
};

export const addCampaignNote = async (storyId, note) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    const storyDoc = await getDoc(storyRef);
    const storyData = storyDoc.data();
    
    const notes = storyData.campaignNotes || [];
    const newNote = {
      id: `note_${Date.now()}`,
      content: note.content,
      type: note.type || 'general',
      timestamp: serverTimestamp(),
      createdBy: note.createdBy
    };
    
    await updateDoc(storyRef, {
      campaignNotes: [...notes, newNote],
      lastUpdated: serverTimestamp()
    });
    
    return newNote;
  } catch (error) {
    handleDatabaseError(error, 'addCampaignNote');
  }
};

export const updateCampaignGoal = async (storyId, goal) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    await updateDoc(storyRef, {
      'campaignMetadata.mainGoal': goal,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    handleDatabaseError(error, 'updateCampaignGoal');
  }
};

// Story State Management Functions
export const saveStoryState = async (storyId, storyState) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    await updateDoc(storyRef, {
      storyState: {
        ...storyState,
        lastUpdated: serverTimestamp()
      },
      lastUpdated: serverTimestamp()
    });
    
    return storyState;
  } catch (error) {
    handleDatabaseError(error, 'saveStoryState');
  }
};

export const getStoryState = async (storyId) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    const storyDoc = await getDoc(storyRef);
    const storyData = storyDoc.data();
    
    return storyData.storyState || null;
  } catch (error) {
    handleDatabaseError(error, 'getStoryState');
  }
};

export const updateStoryState = async (storyId, updates) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    const storyDoc = await getDoc(storyRef);
    const storyData = storyDoc.data();
    
    const currentState = storyData.storyState || {};
    const updatedState = {
      ...currentState,
      ...updates,
      lastUpdated: serverTimestamp()
    };
    
    await updateDoc(storyRef, {
      storyState: updatedState,
      lastUpdated: serverTimestamp()
    });
    
    return updatedState;
  } catch (error) {
    handleDatabaseError(error, 'updateStoryState');
  }
};

// Enhanced combat session management
export const createEnhancedCombatSession = async (partyId, combatData) => {
  try {
    const combat = {
      partyId,
      status: 'active',
      storyContext: combatData.storyContext,
      partyMembers: combatData.partyMembers,
      enemies: combatData.enemies,
      initiative: combatData.initiative,
      currentTurn: 0,
      combatState: 'preparation',
      environmentalFeatures: combatData.environmentalFeatures || [],
      teamUpOpportunities: combatData.teamUpOpportunities || [],
      narrativeElements: combatData.narrativeElements || {},
      statusEffects: {},
      cooldowns: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'combatSessions'), combat);
    return { id: docRef.id, ...combat };
  } catch (error) {
    handleDatabaseError(error, 'createEnhancedCombatSession');
  }
};

export const updateCombatSessionWithNarrative = async (combatId, updates) => {
  try {
    const combatRef = doc(db, 'combatSessions', combatId);
    await updateDoc(combatRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleDatabaseError(error, 'updateCombatSessionWithNarrative');
  }
};

// Enhanced story message with metadata
export const addStoryMessageWithMetadata = async (storyId, message, storyState = null) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    const storyDoc = await getDoc(storyRef);
    const storyData = storyDoc.data();
    
    const newMessage = {
      id: `msg_${Date.now()}`,
      ...message,
      timestamp: new Date(),
      metadata: {
        storyStateSnapshot: storyState ? {
          currentLocation: storyState.currentLocation?.name,
          activeNPCs: Object.keys(storyState.activeNPCs || {}),
          activePlotThreads: storyState.activePlotThreads?.map(t => t.title) || [],
          characterRelationships: storyState.characterArcs ? 
            Object.entries(storyState.characterArcs).map(([charId, arc]) => ({
              characterId: charId,
              relationships: Object.keys(arc.relationships || {})
            })) : []
        } : null
      }
    };
    
    await updateDoc(storyRef, {
      storyMessages: [...storyData.storyMessages, newMessage],
      lastUpdated: serverTimestamp()
    });
    
    return newMessage;
  } catch (error) {
    handleDatabaseError(error, 'addStoryMessageWithMetadata');
  }
};

// Story consistency helpers
export const getStoryConsistencyData = async (storyId) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    const storyDoc = await getDoc(storyRef);
    const storyData = storyDoc.data();
    
    return {
      storyState: storyData.storyState || null,
      campaignMetadata: storyData.campaignMetadata || null,
      recentMessages: storyData.storyMessages?.slice(-10) || [],
      activeNPCs: storyData.storyState?.activeNPCs || {},
      characterArcs: storyData.storyState?.characterArcs || {},
      plotThreads: storyData.storyState?.activePlotThreads || []
    };
  } catch (error) {
    handleDatabaseError(error, 'getStoryConsistencyData');
  }
}; 