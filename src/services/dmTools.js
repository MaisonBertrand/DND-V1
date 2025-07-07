import { 
  getCampaignStory, 
  updateCampaignStory,
  createCampaignStory,
  db
} from '../firebase/database';
import { doc, onSnapshot } from 'firebase/firestore';

export class DMToolsService {
  constructor() {
    this.scenes = new Map();
    this.currentScene = null;
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
      const updatedStory = {
        ...campaignStory,
        scenes: [...(campaignStory?.scenes || []), scene],
        currentScene: scene.id
      };

      await updateCampaignStory(partyId, updatedStory);
      return scene;
    } catch (error) {
      console.error('Error creating scene:', error);
      throw error;
    }
  }

  async updateScene(partyId, sceneId, updates) {
    try {
      const campaignStory = await getCampaignStory(partyId);
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

      await updateCampaignStory(partyId, updatedStory);
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

      await updateCampaignStory(partyId, updatedStory);
      return newObjective;
    } catch (error) {
      console.error('Error adding objective:', error);
      throw error;
    }
  }

  async addProblem(partyId, sceneId, problem) {
    try {
      const campaignStory = await getCampaignStory(partyId);
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

      await updateCampaignStory(partyId, updatedStory);
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

      await updateCampaignStory(partyId, updatedStory);
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
      const updatedStory = {
        ...campaignStory,
        playerViewMode: viewMode,
        lastViewUpdate: new Date()
      };

      await updateCampaignStory(partyId, updatedStory);
      return viewMode;
    } catch (error) {
      console.error('Error updating player view:', error);
      throw error;
    }
  }

  async getPlayerView(partyId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      return campaignStory?.playerViewMode || 'map';
    } catch (error) {
      console.error('Error getting player view:', error);
      throw error;
    }
  }

  // Real-time listener for player view changes
  listenToPlayerView(partyId, callback) {
    try {
      const campaignStoryRef = doc(db, 'campaignStories', partyId);
      return onSnapshot(campaignStoryRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const viewMode = data?.playerViewMode || 'map';
          callback(viewMode);
        }
      }, (error) => {
        console.error('Error listening to player view:', error);
      });
    } catch (error) {
      console.error('Error setting up player view listener:', error);
      return null;
    }
  }
}

export const dmToolsService = new DMToolsService(); 