import { 
  getCampaignStory, 
  updateCampaignStory,
  createManualCampaignStory,
  db
} from '../firebase/database';
import { doc, onSnapshot, query, collection, where } from 'firebase/firestore';

export class DMToolsService {
  constructor() {
    this.scenes = new Map();
    this.currentScene = null;
    this.listeners = new Map(); // Cache for listeners
  }

  // Scene Management
  async createScene(partyId, sceneData) {
    try {
      const scene = {
        id: `scene_${Date.now()}`,
        title: sceneData.title,
        description: sceneData.description,
        mapLocation: sceneData.mapLocation,
        objectives: sceneData.objectives || [],
        problems: sceneData.problems || [],
        createdAt: new Date(),
        status: 'active'
      };

      // Save to campaign story
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }

      const updatedStory = {
        ...campaignStory,
        scenes: [...(campaignStory?.scenes || []), scene],
        currentScene: scene.id
      };

      await updateCampaignStory(campaignStory.id, updatedStory);
      return scene;
    } catch (error) {
      console.error('Error creating scene:', error);
      throw error;
    }
  }

  async updateScene(partyId, sceneId, updates) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }

      const scenes = campaignStory?.scenes || [];
      const sceneIndex = scenes.findIndex(s => s.id === sceneId);
      
      if (sceneIndex === -1) {
        throw new Error('Scene not found');
      }

      scenes[sceneIndex] = { ...scenes[sceneIndex], ...updates };
      
      const updatedStory = {
        ...campaignStory,
        scenes
      };

      await updateCampaignStory(campaignStory.id, updatedStory);
      return scenes[sceneIndex];
    } catch (error) {
      console.error('Error updating scene:', error);
      throw error;
    }
  }

  async getCurrentScene(partyId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      const currentSceneId = campaignStory?.currentScene;
      
      if (!currentSceneId) return null;
      
      const scenes = campaignStory?.scenes || [];
      return scenes.find(s => s.id === currentSceneId) || null;
    } catch (error) {
      console.error('Error getting current scene:', error);
      throw error;
    }
  }

  // Problem/Objective Management
  async addObjective(partyId, sceneId, objective) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }

      const scenes = campaignStory?.scenes || [];
      const sceneIndex = scenes.findIndex(s => s.id === sceneId);
      
      if (sceneIndex === -1) {
        throw new Error('Scene not found');
      }

      const newObjective = {
        id: `obj_${Date.now()}`,
        text: objective,
        completed: false,
        createdAt: new Date()
      };

      scenes[sceneIndex].objectives = [...(scenes[sceneIndex].objectives || []), newObjective];
      
      const updatedStory = {
        ...campaignStory,
        scenes
      };

      await updateCampaignStory(campaignStory.id, updatedStory);
      return newObjective;
    } catch (error) {
      console.error('Error adding objective:', error);
      throw error;
    }
  }

  async addProblem(partyId, sceneId, problem) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }

      const scenes = campaignStory?.scenes || [];
      const sceneIndex = scenes.findIndex(s => s.id === sceneId);
      
      if (sceneIndex === -1) {
        throw new Error('Scene not found');
      }

      const newProblem = {
        id: `prob_${Date.now()}`,
        text: problem,
        solved: false,
        createdAt: new Date()
      };

      scenes[sceneIndex].problems = [...(scenes[sceneIndex].problems || []), newProblem];
      
      const updatedStory = {
        ...campaignStory,
        scenes
      };

      await updateCampaignStory(campaignStory.id, updatedStory);
      return newProblem;
    } catch (error) {
      console.error('Error adding problem:', error);
      throw error;
    }
  }

  // Player Position Tracking
  async updatePlayerPosition(partyId, playerId, position) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }

      const playerPositions = campaignStory?.playerPositions || {};
      
      playerPositions[playerId] = {
        x: position.x,
        y: position.y,
        updatedAt: new Date()
      };

      const updatedStory = {
        ...campaignStory,
        playerPositions
      };

      await updateCampaignStory(campaignStory.id, updatedStory);
      return playerPositions[playerId];
    } catch (error) {
      console.error('Error updating player position:', error);
      throw error;
    }
  }

  async getPlayerPositions(partyId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      return campaignStory?.playerPositions || {};
    } catch (error) {
      console.error('Error getting player positions:', error);
      throw error;
    }
  }

  // Player View Control
  async updatePlayerView(partyId, viewMode) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        console.error('Campaign story not found for party:', partyId);
        throw new Error('Campaign story not found. Please try refreshing the page.');
      }

      const updatedStory = {
        ...campaignStory,
        playerViewMode: viewMode,
        lastViewUpdate: new Date()
      };

      await updateCampaignStory(campaignStory.id, updatedStory);
      return viewMode;
    } catch (error) {
      console.error('Error updating player view:', error);
      throw error;
    }
  }

  async getPlayerView(partyId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      return campaignStory?.playerViewMode || 'hidden';
    } catch (error) {
      console.error('Error getting player view:', error);
      throw error;
    }
  }

  // Real-time listener for player view changes
  listenToPlayerView(partyId, callback) {
    const listenerKey = `playerView_${partyId}`;
    
    // Return existing listener if already set up
    if (this.listeners.has(listenerKey)) {
      const existingListener = this.listeners.get(listenerKey);
      // Add callback to existing listener
      existingListener.callbacks.add(callback);
      return () => {
        existingListener.callbacks.delete(callback);
        if (existingListener.callbacks.size === 0) {
          existingListener.unsubscribe();
          this.listeners.delete(listenerKey);
        }
      };
    }

    try {
      const q = query(
        collection(db, 'campaignStories'),
        where('partyId', '==', partyId)
      );
      
      const callbacks = new Set([callback]);
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          const viewMode = data?.playerViewMode || 'hidden';
          // Call all registered callbacks
          callbacks.forEach(cb => cb(viewMode));
        }
      }, (error) => {
        console.error('Error listening to player view:', error);
      });

      // Store the listener
      this.listeners.set(listenerKey, { unsubscribe, callbacks });

      return () => {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          unsubscribe();
          this.listeners.delete(listenerKey);
        }
      };
    } catch (error) {
      console.error('Error setting up player view listener:', error);
      return null;
    }
  }

  // Real-time listener for campaign story changes (including map updates)
  listenToCampaignStory(partyId, callback) {
    const listenerKey = `campaignStory_${partyId}`;
    
    // Return existing listener if already set up
    if (this.listeners.has(listenerKey)) {
      const existingListener = this.listeners.get(listenerKey);
      existingListener.callbacks.add(callback);
      return () => {
        existingListener.callbacks.delete(callback);
        if (existingListener.callbacks.size === 0) {
          existingListener.unsubscribe();
          this.listeners.delete(listenerKey);
        }
      };
    }

    try {
      const q = query(
        collection(db, 'campaignStories'),
        where('partyId', '==', partyId)
      );
      
      const callbacks = new Set([callback]);
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = { id: doc.id, ...doc.data() };
          callbacks.forEach(cb => cb(data));
        } else {
          callbacks.forEach(cb => cb(null));
        }
      }, (error) => {
        console.error('Error listening to campaign story:', error);
      });

      this.listeners.set(listenerKey, { unsubscribe, callbacks });

      return () => {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          unsubscribe();
          this.listeners.delete(listenerKey);
        }
      };
    } catch (error) {
      console.error('Error setting up campaign story listener:', error);
      return null;
    }
  }

  // Real-time listener for party character changes
  listenToPartyCharacters(partyId, callback) {
    const listenerKey = `partyCharacters_${partyId}`;
    
    // Return existing listener if already set up
    if (this.listeners.has(listenerKey)) {
      const existingListener = this.listeners.get(listenerKey);
      existingListener.callbacks.add(callback);
      return () => {
        existingListener.callbacks.delete(callback);
        if (existingListener.callbacks.size === 0) {
          existingListener.unsubscribe();
          this.listeners.delete(listenerKey);
        }
      };
    }

    try {
      const q = query(
        collection(db, 'characters'),
        where('partyId', '==', partyId)
      );
      
      const callbacks = new Set([callback]);
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const characters = [];
        querySnapshot.forEach((doc) => {
          characters.push({ id: doc.id, ...doc.data() });
        });
        callbacks.forEach(cb => cb(characters));
      }, (error) => {
        console.error('Error listening to party characters:', error);
      });

      this.listeners.set(listenerKey, { unsubscribe, callbacks });

      return () => {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          unsubscribe();
          this.listeners.delete(listenerKey);
        }
      };
    } catch (error) {
      console.error('Error setting up party characters listener:', error);
      return null;
    }
  }
}

export const dmToolsService = new DMToolsService(); 