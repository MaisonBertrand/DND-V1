import { db } from './config';
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
  serverTimestamp,
  limit
} from 'firebase/firestore';

// Helper function to generate unique IDs
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

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

// Calculate character HP and AC based on class, level, and ability scores
const calculateCharacterStats = (characterData) => {
  const { class: characterClass, level, constitution, dexterity, strength } = characterData;
  
  // Calculate HP based on class and constitution
  const hitDieSizes = {
    'Barbarian': 12,
    'Fighter': 10,
    'Paladin': 10,
    'Ranger': 10,
    'Cleric': 8,
    'Druid': 8,
    'Monk': 8,
    'Rogue': 8,
    'Bard': 8,
    'Sorcerer': 6,
    'Warlock': 8,
    'Wizard': 6
  };
  
  const hitDie = hitDieSizes[characterClass] || 8;
  const constitutionMod = Math.floor((constitution - 10) / 2);
  
  // Calculate HP: (hit die + constitution modifier) * level
  const hp = Math.max(1, (hitDie + constitutionMod) * level);
  
  // Calculate AC based on class and dexterity
  const baseAC = 10;
  const dexterityMod = Math.floor((dexterity - 10) / 2);
  
  // Class-based AC bonuses
  const classACBonuses = {
    'Barbarian': 3, // Unarmored Defense: 10 + DEX + CON
    'Monk': 2,      // Unarmored Defense: 10 + DEX + WIS
    'Fighter': 4,   // Chain mail armor
    'Paladin': 4,   // Chain mail armor
    'Cleric': 4,    // Chain mail armor
    'Ranger': 3,    // Scale mail armor
    'Rogue': 2,     // Leather armor
    'Bard': 2,      // Leather armor
    'Druid': 2,     // Leather armor
    'Sorcerer': 0,  // No armor
    'Warlock': 0,   // No armor
    'Wizard': 0     // No armor
  };
  
  const classBonus = classACBonuses[characterClass] || 0;
  const ac = baseAC + dexterityMod + classBonus;
  
  return {
    hp: Math.max(1, hp),
    maxHp: Math.max(1, hp),
    ac: Math.max(10, ac)
  };
};

// Character Management
export const saveCharacter = async (userId, partyId, characterData) => {
  try {
    const characterRef = collection(db, 'characters');
    
    // Calculate HP and AC
    const stats = calculateCharacterStats(characterData);
    
    const newCharacter = {
      ...characterData,
      ...stats, // Add calculated HP and AC
      userId,
      partyId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await addDoc(characterRef, newCharacter);
    const savedCharacter = {
      id: docRef.id,
      ...newCharacter
    };
    
    return savedCharacter;
  } catch (error) {
    throw new Error(`Failed to save character: ${error.message}`);
  }
};

export const getUserCharacters = async (userId) => {
  try {
    const charactersRef = collection(db, 'characters');
    const q = query(charactersRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const characters = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return characters;
  } catch (error) {
    throw new Error(`Failed to get user characters: ${error.message}`);
  }
};

export const getCharacterByUserAndParty = async (userId, partyId) => {
  try {
    const charactersRef = collection(db, 'characters');
    const q = query(
      charactersRef,
      where('userId', '==', userId),
      where('partyId', '==', partyId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Return the first (and should be only) character
    const doc = querySnapshot.docs[0];
    const characterData = {
      id: doc.id,
      ...doc.data()
    };
    
    return characterData;
  } catch (error) {
    throw new Error(`Failed to get character: ${error.message}`);
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
    const characterDoc = await getDoc(characterRef);
    
    if (!characterDoc.exists()) {
      throw new Error(`Character document with ID ${characterId} does not exist`);
    }
    
    const currentData = characterDoc.data();
    const updatedData = {
      ...updates,
      updatedAt: new Date()
    };
    
    // Recalculate HP and AC if class, level, or ability scores changed
    const needsRecalculation = updates.class || updates.level || 
                              updates.constitution || updates.dexterity || 
                              updates.strength || updates.wisdom;
    
    if (needsRecalculation) {
      const mergedData = { ...currentData, ...updates };
      const stats = calculateCharacterStats(mergedData);
      Object.assign(updatedData, stats);
    }
    
    await updateDoc(characterRef, updatedData);
    
    return {
      id: characterId,
      ...currentData,
      ...updatedData
    };
  } catch (error) {
    throw error;
  }
};

export const deleteCharacter = async (characterId) => {
  try {
    const characterRef = doc(db, 'characters', characterId);
    await deleteDoc(characterRef);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete character: ${error.message}`);
  }
};

// Utility function to debug character issues
export const debugUserCharacters = async (userId) => {
  try {
    console.log('Debugging characters for user:', userId);
    
    // Get all characters for this user
    const q = query(
      collection(db, 'characters'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    const characters = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('All characters for user:', characters);
    
    // Check for characters without partyId
    const orphanedCharacters = characters.filter(char => !char.partyId);
    if (orphanedCharacters.length > 0) {
      console.warn('Found characters without partyId:', orphanedCharacters);
    }
    
    // Check for duplicate characters per party
    const partyGroups = {};
    characters.forEach(char => {
      if (char.partyId) {
        if (!partyGroups[char.partyId]) {
          partyGroups[char.partyId] = [];
        }
        partyGroups[char.partyId].push(char);
      }
    });
    
    Object.entries(partyGroups).forEach(([partyId, chars]) => {
      if (chars.length > 1) {
        console.warn(`Multiple characters found for party ${partyId}:`, chars);
      }
    });
    
    return {
      totalCharacters: characters.length,
      orphanedCharacters: orphanedCharacters.length,
      partyGroups
    };
  } catch (error) {
    console.error('Error debugging characters:', error);
    throw error;
  }
};

// Function to clean up orphaned characters
export const cleanupOrphanedCharacters = async (userId) => {
  try {
    const characters = await getUserCharacters(userId);
    const orphanedCharacters = characters.filter(char => !char.partyId);
    
    if (orphanedCharacters.length === 0) {
      return { deleted: 0 };
    }
    
    const deletePromises = orphanedCharacters.map(char => deleteCharacter(char.id));
    await Promise.all(deletePromises);
    
    return { deleted: orphanedCharacters.length };
  } catch (error) {
    throw new Error(`Failed to cleanup orphaned characters: ${error.message}`);
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
      where('isPublic', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    const parties = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      };
    });
    
    // Sort by createdAt in descending order (newest first) in JavaScript
    return parties.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
      const bTime = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
      return bTime - aTime;
    });
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
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Sort by createdAt in descending order and get the first (most recent) one
    const combats = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const sortedCombats = combats.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
      const bTime = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
      return bTime - aTime;
    });
    
    return sortedCombats[0]; // Return the most recent active combat
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
      currentTurn: combatData.currentTurn || 0,
      round: combatData.round || 1,
      combatState: combatData.combatState || 'active',
      environmentalFeatures: combatData.environmentalFeatures,
      teamUpOpportunities: combatData.teamUpOpportunities,
      narrativeElements: combatData.narrativeElements,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'combatSessions'), combat);
    return { id: docRef.id, ...combat };
  } catch (error) {
    handleDatabaseError(error, 'createCombatSession');
  }
};

export const getCombatSession = async (sessionId) => {
  try {
    const combatRef = doc(db, 'combatSessions', sessionId);
    const docSnap = await getDoc(combatRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    handleDatabaseError(error, 'getCombatSession');
  }
};

export const updateCombatSession = async (combatId, updates) => {
  try {
    console.log('💾 updateCombatSession called with:', {
      combatId,
      updates
    });
    
    const combatRef = doc(db, 'combatSessions', combatId);
    await updateDoc(combatRef, {
      ...updates,
      lastUpdated: serverTimestamp()
    });
    
    console.log('💾 updateCombatSession completed successfully');
  } catch (error) {
    console.error('❌ Error in updateCombatSession:', error);
    handleDatabaseError(error, 'updateCombatSession');
  }
};

export const subscribeToCombatSession = (sessionId, callback) => {
  try {
    console.log('📡 Setting up combat session subscription for:', sessionId);
    const combatRef = doc(db, 'combatSessions', sessionId);
    
    const unsubscribe = onSnapshot(combatRef, (docSnap) => {
      console.log('📡 Combat session subscription update received:', docSnap.exists() ? 'Document exists' : 'Document does not exist');
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        console.log('📡 Combat session data from subscription:', data);
        callback(data);
      } else {
        console.log('📡 Combat session document does not exist');
        callback(null);
      }
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error in subscribeToCombatSession:', error);
    handleDatabaseError(error, 'subscribeToCombatSession');
  }
};

// Character Preset Management
export const saveCharacterPreset = async (userId, presetData) => {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }
    
    const preset = {
      id: generateId(),
      ...presetData,
      createdAt: new Date()
    };
    
    const existingPresets = profile.characterPresets || [];
    const updatedPresets = [...existingPresets, preset];
    
    await updateDoc(doc(db, 'userProfiles', profile.id), {
      characterPresets: updatedPresets
    });
    
    return preset;
  } catch (error) {
    throw new Error(`Failed to save character preset: ${error.message}`);
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
    // Create combatants array by combining party members and enemies
    const partyCombatants = (combatData.partyMembers || []).map(member => ({
      ...member,
      id: member.id,
      isEnemy: false,
      userId: member.userId,
      cooldowns: {},
      statusEffects: []
    }));

    const enemyCombatants = (combatData.enemies || []).map(enemy => ({
      ...enemy,
      id: enemy.id,
      isEnemy: true,
      userId: null,
      cooldowns: {},
      statusEffects: []
    }));

    const allCombatants = [...partyCombatants, ...enemyCombatants];

    const combat = {
      partyId,
      status: 'active',
      storyContext: combatData.storyContext,
      partyMembers: combatData.partyMembers,
      enemies: combatData.enemies,
      combatants: allCombatants, // Add the combined combatants array
      initiative: combatData.initiative || [],
      currentTurn: 0,
      round: 1,
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

// Utility function to recalculate character stats for existing characters
export const recalculateCharacterStats = async (characterId) => {
  try {
    const characterRef = doc(db, 'characters', characterId);
    const characterDoc = await getDoc(characterRef);
    
    if (!characterDoc.exists()) {
      throw new Error(`Character document with ID ${characterId} does not exist`);
    }
    
    const characterData = characterDoc.data();
    const stats = calculateCharacterStats(characterData);
    
    await updateDoc(characterRef, {
      ...stats,
      updatedAt: new Date()
    });
    
    return {
      id: characterId,
      ...characterData,
      ...stats
    };
  } catch (error) {
    throw new Error(`Failed to recalculate character stats: ${error.message}`);
  }
};

// Utility function to update all characters in a party with missing HP/AC
export const updatePartyCharacterStats = async (partyId) => {
  try {
    const characters = await getPartyCharacters(partyId);
    const updatePromises = characters
      .filter(char => !char.hp || !char.maxHp || !char.ac)
      .map(char => recalculateCharacterStats(char.id));
    
    const results = await Promise.all(updatePromises);
    return results;
  } catch (error) {
    throw new Error(`Failed to update party character stats: ${error.message}`);
  }
}; 