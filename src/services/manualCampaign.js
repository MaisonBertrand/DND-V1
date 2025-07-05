import { 
  getCampaignStory, 
  updateCampaignStory,
  createCampaignStory
} from '../firebase/database';
import { combatService } from './combat';

export class ManualCampaignService {
  constructor() {
    this.tileTypes = {
      // Terrain
      grass: { name: 'Grass', color: 'bg-green-600', symbol: '🌱' },
      water: { name: 'Water', color: 'bg-blue-500', symbol: '💧' },
      mountain: { name: 'Mountain', color: 'bg-gray-600', symbol: '⛰️' },
      forest: { name: 'Forest', color: 'bg-green-800', symbol: '🌲' },
      desert: { name: 'Desert', color: 'bg-yellow-600', symbol: '🏜️' },
      swamp: { name: 'Swamp', color: 'bg-green-900', symbol: '🐸' },
      lava: { name: 'Lava', color: 'bg-red-800', symbol: '🌋' },
      ice: { name: 'Ice', color: 'bg-blue-200', symbol: '❄️' },
      sand: { name: 'Sand', color: 'bg-yellow-400', symbol: '🏖️' },
      stone: { name: 'Stone', color: 'bg-gray-500', symbol: '🪨' },
      
      // Paths & Roads
      road: { name: 'Road', color: 'bg-yellow-800', symbol: '🛣️' },
      bridge: { name: 'Bridge', color: 'bg-amber-700', symbol: '🌉' },
      stairs: { name: 'Stairs', color: 'bg-gray-400', symbol: '🪜' },
      path: { name: 'Path', color: 'bg-yellow-700', symbol: '🛤️' },
      
      // Structures
      wall: { name: 'Wall', color: 'bg-gray-800', symbol: '🧱' },
      door: { name: 'Door', color: 'bg-amber-800', symbol: '🚪' },
      window: { name: 'Window', color: 'bg-blue-300', symbol: '🪟' },
      tower: { name: 'Tower', color: 'bg-gray-700', symbol: '🗼' },
      castle: { name: 'Castle', color: 'bg-gray-600', symbol: '🏰' },
      house: { name: 'House', color: 'bg-amber-600', symbol: '🏠' },
      temple: { name: 'Temple', color: 'bg-purple-700', symbol: '⛪' },
      cave: { name: 'Cave', color: 'bg-gray-900', symbol: '🕳️' },
      
      // Objects & Items
      chest: { name: 'Chest', color: 'bg-yellow-700', symbol: '📦' },
      barrel: { name: 'Barrel', color: 'bg-amber-900', symbol: '🛢️' },
      table: { name: 'Table', color: 'bg-amber-800', symbol: '🪑' },
      chair: { name: 'Chair', color: 'bg-amber-700', symbol: '🪑' },
      bed: { name: 'Bed', color: 'bg-blue-800', symbol: '🛏️' },
      fireplace: { name: 'Fireplace', color: 'bg-red-700', symbol: '🔥' },
      altar: { name: 'Altar', color: 'bg-purple-800', symbol: '🕯️' },
      fountain: { name: 'Fountain', color: 'bg-blue-400', symbol: '⛲' },
      statue: { name: 'Statue', color: 'bg-gray-300', symbol: '🗿' },
      tree: { name: 'Tree', color: 'bg-green-700', symbol: '🌳' },
      bush: { name: 'Bush', color: 'bg-green-600', symbol: '🌿' },
      
      // Characters & Creatures
      npc: { name: 'NPC', color: 'bg-purple-600', symbol: '👤' },
      enemy: { name: 'Enemy', color: 'bg-red-600', symbol: '⚔️' },
      player: { name: 'Player', color: 'bg-blue-600', symbol: '👤' },
      boss: { name: 'Boss', color: 'bg-red-800', symbol: '👹' },
      merchant: { name: 'Merchant', color: 'bg-green-500', symbol: '💰' },
      guard: { name: 'Guard', color: 'bg-blue-700', symbol: '🛡️' },
      animal: { name: 'Animal', color: 'bg-orange-600', symbol: '🐾' },
      
      // Special & Magical
      portal: { name: 'Portal', color: 'bg-purple-500', symbol: '🌀' },
      trap: { name: 'Trap', color: 'bg-red-500', symbol: '💥' },
      magic: { name: 'Magic', color: 'bg-purple-400', symbol: '✨' },
      crystal: { name: 'Crystal', color: 'bg-cyan-400', symbol: '💎' },
      empty: { name: 'Empty', color: 'bg-slate-700', symbol: '⬜' }
    };
  }

  // Campaign Management
  async loadCampaignData(partyId) {
    try {
      // Load or create campaign story
      const existingStory = await getCampaignStory(partyId);
      if (existingStory) {
        return existingStory;
      } else {
        // Create new manual campaign story
        const newStory = {
          partyId,
          type: 'manual',
          currentScene: '',
          storyHistory: [],
          status: 'active',
          createdAt: new Date()
        };
        await updateCampaignStory(partyId, newStory);
        return newStory;
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
      throw error;
    }
  }

  async saveScene(partyId, story, currentScene) {
    try {
      const updatedStory = {
        ...story,
        currentScene,
        storyHistory: [
          ...(story?.storyHistory || []),
          {
            timestamp: new Date(),
            content: currentScene,
            type: 'scene'
          }
        ]
      };
      
      await updateCampaignStory(partyId, updatedStory);
      return updatedStory;
    } catch (error) {
      console.error('Error saving scene:', error);
      throw error;
    }
  }

  async endSession(partyId, story) {
    try {
      const updatedStory = {
        ...story,
        status: 'ended',
        endedAt: new Date()
      };
      
      await updateCampaignStory(partyId, updatedStory);
      return updatedStory;
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }

  // Map Management
  loadMap(partyId) {
    try {
      const savedMap = localStorage.getItem(`campaign-map-${partyId}`);
      if (savedMap) {
        const mapData = JSON.parse(savedMap);
        return {
          title: mapData.title || 'Campaign Map',
          content: mapData.content || [],
          size: mapData.size || { width: 15, height: 10 },
          subMaps: mapData.subMaps || {},
          updatedAt: mapData.updatedAt
        };
      } else {
        return {
          title: 'Campaign Map',
          content: this.initializeMap({ width: 15, height: 10 }),
          size: { width: 15, height: 10 },
          subMaps: {},
          updatedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Error loading map:', error);
      return {
        title: 'Campaign Map',
        content: this.initializeMap({ width: 15, height: 10 }),
        size: { width: 15, height: 10 },
        subMaps: {},
        updatedAt: new Date().toISOString()
      };
    }
  }

  saveMap(partyId, mapData) {
    try {
      const mapToSave = {
        title: mapData.title,
        content: mapData.content,
        size: mapData.size,
        subMaps: mapData.subMaps,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(`campaign-map-${partyId}`, JSON.stringify(mapToSave));
      return true;
    } catch (error) {
      console.error('Error saving map:', error);
      throw error;
    }
  }

  initializeMap(size) {
    const newMap = [];
    for (let y = 0; y < size.height; y++) {
      const row = [];
      for (let x = 0; x < size.width; x++) {
        row.push('empty');
      }
      newMap.push(row);
    }
    return newMap;
  }

  initializeSubMap() {
    const newSubMap = [];
    for (let y = 0; y < 8; y++) {
      const row = [];
      for (let x = 0; x < 8; x++) {
        row.push('empty');
      }
      newSubMap.push(row);
    }
    return newSubMap;
  }

  updateMapTile(map, x, y, tileType) {
    const newMap = [...map];
    newMap[y][x] = tileType;
    return newMap;
  }

  updateSubMapTile(subMap, x, y, tileType) {
    const newSubMap = [...subMap];
    newSubMap[y][x] = tileType;
    return newSubMap;
  }

  getTileHasSubMap(subMaps, x, y) {
    const tileKey = `${x}-${y}`;
    return subMaps[tileKey] && subMaps[tileKey].some(row => row.some(tile => tile !== 'empty'));
  }

  saveSubMap(subMaps, x, y, subMap) {
    const tileKey = `${x}-${y}`;
    return { ...subMaps, [tileKey]: subMap };
  }

  // Combat Management
  async startCombat(partyId, partyCharacters, enemyDetails, currentScene) {
    if (!enemyDetails.trim()) {
      throw new Error('Please enter enemy details before starting combat');
    }

    try {
      // Parse enemy details (simple format: "Enemy Name, HP, AC, Level")
      const enemyLines = enemyDetails.split('\n').filter(line => line.trim());
      const enemies = enemyLines.map((line, index) => {
        const [name, hp, ac, level] = line.split(',').map(s => s.trim());
        return {
          id: `enemy_${index}`,
          name: name || `Enemy ${index + 1}`,
          hp: parseInt(hp) || 20,
          maxHp: parseInt(hp) || 20,
          ac: parseInt(ac) || 12,
          level: parseInt(level) || 1,
          class: 'enemy',
          race: 'unknown'
        };
      });

      // Create combat session using the combat service
      const session = await combatService.createCombatSession(
        partyId,
        partyCharacters,
        enemies,
        currentScene || 'Manual combat encounter'
      );

      return session;
    } catch (error) {
      console.error('Error starting combat:', error);
      throw error;
    }
  }

  // Utility Methods
  getTileTypes() {
    return this.tileTypes;
  }

  validateMapSize(width, height) {
    return {
      width: Math.max(5, Math.min(30, width)),
      height: Math.max(5, Math.min(20, height))
    };
  }

  // Ready-up functionality (optional, as requested)
  async setPlayerReady(partyId, userId) {
    try {
      const story = await getCampaignStory(partyId);
      const readyPlayers = story?.readyPlayers || [];
      
      if (!readyPlayers.includes(userId)) {
        const updatedStory = {
          ...story,
          readyPlayers: [...readyPlayers, userId]
        };
        await updateCampaignStory(partyId, updatedStory);
      }
      
      return true;
    } catch (error) {
      console.error('Error setting player ready:', error);
      throw error;
    }
  }

  async checkAllPlayersReady(partyId, totalPlayers) {
    try {
      const story = await getCampaignStory(partyId);
      const readyPlayers = story?.readyPlayers || [];
      return readyPlayers.length === totalPlayers;
    } catch (error) {
      console.error('Error checking player readiness:', error);
      return false;
    }
  }
}

// Export singleton instance
export const manualCampaignService = new ManualCampaignService(); 