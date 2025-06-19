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
import { db } from './config';

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
    console.error('Error saving character:', error);
    throw error;
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
    console.error('Error getting user characters:', error);
    throw error;
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
    console.error('Error getting character by user and party:', error);
    throw error;
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
    console.error('Error getting party characters:', error);
    throw error;
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
    console.error('Error updating character:', error);
    throw error;
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
    console.error('Error creating party:', error);
    throw error;
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
    throw error;
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
    console.error('Error joining party:', error);
    throw error;
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
    console.error('Error disbanding party:', error);
    throw error;
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
    console.error('Error getting party by invite code:', error);
    throw error;
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
    console.error('Error saving campaign:', error);
    throw error;
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
    console.error('Error getting campaign:', error);
    throw error;
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
    console.error('Error updating campaign:', error);
    throw error;
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
    console.error('Error saving combat:', error);
    throw error;
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
    console.error('Error getting active combat:', error);
    throw error;
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
    console.error('Error updating combat:', error);
    throw error;
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
      status: 'ready_up', // ready_up, voting, storytelling, paused
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
    console.error('Error creating campaign story:', error);
    throw error;
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
    console.error('Error getting campaign story:', error);
    throw error;
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
    console.error('Error updating campaign story:', error);
    throw error;
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
    console.error('Error adding story message:', error);
    throw error;
  }
};

export const castVote = async (storyId, userId, vote) => {
  try {
    const storyRef = doc(db, 'campaignStories', storyId);
    const storyDoc = await getDoc(storyRef);
    const storyData = storyDoc.data();
    
    const currentVotes = storyData.votingSession?.votes || {};
    const newVotes = { ...currentVotes, [userId]: vote };
    
    await updateDoc(storyRef, {
      votingSession: {
        ...storyData.votingSession,
        votes: newVotes
      },
      lastUpdated: serverTimestamp()
    });
    
    return newVotes;
  } catch (error) {
    console.error('Error casting vote:', error);
    throw error;
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
    console.error('Error setting player ready:', error);
    throw error;
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
    console.error('Error subscribing to campaign story:', error);
    throw error;
  }
}; 