import { 
  getCampaignStory, 
  updateCampaignStory
} from '../firebase/database';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Monster Catalog
export const monsters = [
  {
    id: 'goblin',
    name: 'Goblin',
    type: 'Humanoid',
    cr: '1/4',
    hp: '7 (2d6)',
    ac: 15,
    speed: '30 ft.',
    stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    actions: [
      { name: 'Scimitar', type: 'Melee Weapon Attack', attack: '+4', damage: '1d6+2 slashing' },
      { name: 'Shortbow', type: 'Ranged Weapon Attack', attack: '+4', damage: '1d6+2 piercing', range: '80/320 ft.' }
    ],
    description: 'Small, green-skinned humanoids that live in caves and ruins.'
  },
  {
    id: 'orc',
    name: 'Orc',
    type: 'Humanoid',
    cr: '1/2',
    hp: '15 (2d8+6)',
    ac: 13,
    speed: '30 ft.',
    stats: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 },
    actions: [
      { name: 'Greataxe', type: 'Melee Weapon Attack', attack: '+5', damage: '1d12+3 slashing' },
      { name: 'Javelin', type: 'Ranged Weapon Attack', attack: '+5', damage: '1d6+3 piercing', range: '30/120 ft.' }
    ],
    description: 'Large, muscular humanoids with tusks and greenish skin.'
  },
  {
    id: 'dragon',
    name: 'Young Red Dragon',
    type: 'Dragon',
    cr: '10',
    hp: '178 (17d10+85)',
    ac: 18,
    speed: '40 ft., fly 80 ft.',
    stats: { str: 23, dex: 14, con: 21, int: 14, wis: 11, cha: 19 },
    actions: [
      { name: 'Bite', type: 'Melee Weapon Attack', attack: '+10', damage: '2d10+6 piercing' },
      { name: 'Claw', type: 'Melee Weapon Attack', attack: '+10', damage: '2d6+6 slashing' },
      { name: 'Fire Breath', type: 'Cone', damage: '7d6 fire', save: 'DC 17 Dex' }
    ],
    description: 'A young red dragon with scales the color of molten rock.'
  }
];

// Item Catalog
export const items = [
  {
    id: 'sword',
    name: 'Longsword',
    type: 'Weapon',
    rarity: 'Common',
    damage: '1d8 slashing',
    properties: ['Versatile (1d10)'],
    description: 'A standard longsword with a sharp blade.'
  },
  {
    id: 'shield',
    name: 'Shield',
    type: 'Armor',
    rarity: 'Common',
    ac: '+2',
    properties: ['Shield'],
    description: 'A wooden shield for protection.'
  },
  {
    id: 'potion',
    name: 'Healing Potion',
    type: 'Consumable',
    rarity: 'Common',
    effect: '2d4+2 healing',
    description: 'A red potion that restores hit points.'
  }
];

// Spell Catalog
export const spells = [
  {
    id: 'fireball',
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    castingTime: '1 action',
    range: '150 feet',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    damage: '8d6 fire',
    save: 'DC 15 Dex',
    description: 'A bright streak flashes from your pointing finger to a point you choose within range.'
  },
  {
    id: 'cure_wounds',
    name: 'Cure Wounds',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Touch',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    healing: '1d8+modifier',
    description: 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier.'
  },
  {
    id: 'magic_missile',
    name: 'Magic Missile',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    damage: '1d4+1 force per missile',
    description: 'You create three glowing darts of magical force.'
  }
];

// Dice Rolling Functions
export const diceRoller = {
  // Roll a single die
  rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  },

  // Roll multiple dice (e.g., "3d6")
  rollDice(diceNotation) {
    const match = diceNotation.match(/(\d+)d(\d+)/);
    if (!match) return 0;
    
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    let total = 0;
    
    for (let i = 0; i < count; i++) {
      total += this.rollDie(sides);
    }
    
    return total;
  },

  // Roll with modifier (e.g., "1d20+5")
  rollWithModifier(diceNotation) {
    const parts = diceNotation.split('+');
    const dicePart = parts[0];
    const modifier = parts.length > 1 ? parseInt(parts[1]) : 0;
    
    return this.rollDice(dicePart) + modifier;
  },

  // Roll initiative (1d20 + modifier)
  rollInitiative(modifier = 0) {
    return this.rollDie(20) + modifier;
  },

  // Roll damage for a weapon or spell
  rollDamage(damageNotation) {
    return this.rollDice(damageNotation);
  }
};

// Combat Planning Service
export class CombatPlanningService {
  constructor() {
    this.initiativeOrder = [];
    this.currentTurn = 0;
    this.round = 1;
    this.combatActive = false;
  }

  // Monster Catalog Methods
  getMonsterById(id) {
    return monsters.find(monster => monster.id === id);
  }

  searchMonsters(query) {
    const searchTerm = query.toLowerCase();
    return monsters.filter(monster => 
      monster.name.toLowerCase().includes(searchTerm) ||
      monster.type.toLowerCase().includes(searchTerm) ||
      monster.description.toLowerCase().includes(searchTerm)
    );
  }

  getRandomMonster() {
    return monsters[Math.floor(Math.random() * monsters.length)];
  }

  getRandomItem() {
    return items[Math.floor(Math.random() * items.length)];
  }

  getRandomSpell() {
    return spells[Math.floor(Math.random() * spells.length)];
  }

  // Item Catalog Methods
  getItemById(id) {
    return items.find(item => item.id === id);
  }

  searchItems(query) {
    const searchTerm = query.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm) ||
      item.type.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm)
    );
  }

  // Spell Catalog Methods
  getSpellById(id) {
    return spells.find(spell => spell.id === id);
  }

  searchSpells(query) {
    const searchTerm = query.toLowerCase();
    return spells.filter(spell => 
      spell.name.toLowerCase().includes(searchTerm) ||
      spell.school.toLowerCase().includes(searchTerm) ||
      spell.description.toLowerCase().includes(searchTerm)
    );
  }

  getSpellsByLevel(level) {
    return spells.filter(spell => spell.level === level);
  }

  // Initiative and Combat Methods
  async rollInitiative(partyId, participants) {
    try {
      const initiativeResults = participants.map(participant => {
        const roll = diceRoller.rollInitiative(participant.initiativeModifier || 0);
        
        return {
          id: participant.id,
          name: participant.name,
          type: participant.type, // 'player' or 'enemy'
          roll: roll - (participant.initiativeModifier || 0),
          modifier: participant.initiativeModifier || 0,
          total: roll,
          initiative: roll
        };
      });

      // Sort by initiative (highest first)
      initiativeResults.sort((a, b) => b.initiative - a.initiative);

      // Save to campaign story
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }
      
      const updatedStory = {
        ...campaignStory,
        combat: {
          ...campaignStory?.combat,
          initiativeOrder: initiativeResults,
          currentTurn: 0,
          round: 1,
          active: true,
          startedAt: new Date()
        }
      };

      await updateCampaignStory(campaignStory.id, updatedStory);
      return initiativeResults;
    } catch (error) {
      console.error('Error rolling initiative:', error);
      throw error;
    }
  }

  async getInitiativeOrder(partyId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      return campaignStory?.combat?.initiativeOrder || [];
    } catch (error) {
      console.error('Error getting initiative order:', error);
      throw error;
    }
  }

  async nextTurn(partyId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }
      
      const combat = campaignStory?.combat;
      
      if (!combat || !combat.active) {
        throw new Error('No active combat');
      }

      let newTurn = combat.currentTurn + 1;
      let newRound = combat.round;

      // If we've gone through all participants, start new round
      if (newTurn >= combat.initiativeOrder.length) {
        newTurn = 0;
        newRound = combat.round + 1;
      }

      const updatedStory = {
        ...campaignStory,
        combat: {
          ...combat,
          currentTurn: newTurn,
          round: newRound
        }
      };

      await updateCampaignStory(campaignStory.id, updatedStory);
      return {
        currentTurn: newTurn,
        round: newRound,
        currentParticipant: combat.initiativeOrder[newTurn]
      };
    } catch (error) {
      console.error('Error advancing turn:', error);
      throw error;
    }
  }

  async endCombat(partyId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }
      
      const updatedStory = {
        ...campaignStory,
        combat: {
          ...campaignStory?.combat,
          active: false,
          endedAt: new Date()
        }
      };

      await updateCampaignStory(campaignStory.id, updatedStory);
      return true;
    } catch (error) {
      console.error('Error ending combat:', error);
      throw error;
    }
  }

  async getCombatState(partyId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      return campaignStory?.combat || null;
    } catch (error) {
      console.error('Error getting combat state:', error);
      throw error;
    }
  }

  async addParticipant(partyId, participant) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }
      
      const combat = campaignStory?.combat;
      
      if (!combat || !combat.active) {
        throw new Error('No active combat');
      }

      const roll = diceRoller.rollInitiative(participant.initiativeModifier || 0);
      const modifier = participant.initiativeModifier || 0;

      const newParticipant = {
        id: participant.id,
        name: participant.name,
        type: participant.type,
        roll: roll - modifier,
        modifier: modifier,
        total: roll,
        initiative: roll
      };

      const updatedInitiativeOrder = [...combat.initiativeOrder, newParticipant];
      updatedInitiativeOrder.sort((a, b) => b.initiative - a.initiative);

      const updatedStory = {
        ...campaignStory,
        combat: {
          ...combat,
          initiativeOrder: updatedInitiativeOrder
        }
      };

      await updateCampaignStory(campaignStory.id, updatedStory);
      return newParticipant;
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  }

  async removeParticipant(partyId, participantId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }
      
      const combat = campaignStory?.combat;
      
      if (!combat || !combat.active) {
        throw new Error('No active combat');
      }

      const updatedInitiativeOrder = combat.initiativeOrder.filter(p => p.id !== participantId);
      
      // Adjust current turn if necessary
      let newTurn = combat.currentTurn;
      if (combat.currentTurn >= updatedInitiativeOrder.length) {
        newTurn = 0;
      }

      const updatedStory = {
        ...campaignStory,
        combat: {
          ...combat,
          initiativeOrder: updatedInitiativeOrder,
          currentTurn: newTurn
        }
      };

      await updateCampaignStory(campaignStory.id, updatedStory);
      return true;
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }

  // Listen to combat state changes
  async listenToCombatState(partyId, callback) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        console.error('Campaign story not found for partyId:', partyId);
        return null;
      }
      
      const campaignStoryRef = doc(db, 'campaignStories', campaignStory.id);
      
      return onSnapshot(campaignStoryRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const combatState = data.combat;
          if (combatState) {
            callback(combatState);
          }
        }
      });
    } catch (error) {
      console.error('Error setting up combat state listener:', error);
      return null;
    }
  }

  // Utility Methods
  calculateInitiativeModifier(dexterity) {
    return Math.floor((dexterity - 10) / 2);
  }

  parseHpString(hpString) {
    const match = hpString.match(/(\d+)/);
    return match ? parseInt(match[1]) : 10;
  }

  createEnemyFromMonster(monster) {
    return {
      id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: monster.name,
      type: 'enemy',
      monster: monster,
      hp: this.parseHpString(monster.hp),
      maxHp: this.parseHpString(monster.hp),
      ac: monster.ac,
      initiativeModifier: this.calculateInitiativeModifier(monster.stats.dex),
      position: null,
      spells: [],
      statusEffects: []
    };
  }
}

// Export singleton instance
export const combatPlanningService = new CombatPlanningService(); 