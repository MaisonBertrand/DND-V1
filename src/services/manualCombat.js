// Manual Combat Service - Completely separate from AI-assisted combat
// This handles simple, DM-controlled combat for manual campaigns

import { 
  getCampaignStory, 
  updateCampaignStory
} from '../firebase/database';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Monster Catalog for Manual Combat
export const manualMonsters = [
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
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    type: 'Undead',
    cr: '1/4',
    hp: '13 (2d8+4)',
    ac: 13,
    speed: '30 ft.',
    stats: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
    actions: [
      { name: 'Shortsword', type: 'Melee Weapon Attack', attack: '+4', damage: '1d6+2 piercing' },
      { name: 'Shortbow', type: 'Ranged Weapon Attack', attack: '+4', damage: '1d6+2 piercing', range: '80/320 ft.' }
    ],
    description: 'Animated bones that serve dark masters.'
  },
  {
    id: 'wolf',
    name: 'Wolf',
    type: 'Beast',
    cr: '1/4',
    hp: '11 (2d8+2)',
    ac: 13,
    speed: '40 ft.',
    stats: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
    actions: [
      { name: 'Bite', type: 'Melee Weapon Attack', attack: '+4', damage: '1d6+1 piercing' }
    ],
    description: 'A fierce wolf with sharp teeth and keen senses.'
  }
];

// Item Catalog for Manual Combat
export const manualItems = [
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
  },
  {
    id: 'bow',
    name: 'Shortbow',
    type: 'Weapon',
    rarity: 'Common',
    damage: '1d6 piercing',
    properties: ['Ammunition', 'Range (80/320)'],
    description: 'A simple wooden bow for ranged attacks.'
  },
  {
    id: 'armor',
    name: 'Leather Armor',
    type: 'Armor',
    rarity: 'Common',
    ac: '+1',
    properties: ['Light Armor'],
    description: 'Light leather armor for mobility.'
  }
];

// Spell Catalog for Manual Combat
export const manualSpells = [
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
  },
  {
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    level: 3,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Self (100-foot line)',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    damage: '8d6 lightning',
    save: 'DC 15 Dex',
    description: 'A stroke of lightning forming a line of 100 feet long and 5 feet wide blasts out from you.'
  },
  {
    id: 'shield',
    name: 'Shield',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 reaction',
    range: 'Self',
    components: ['V', 'S'],
    duration: '1 round',
    effect: '+5 AC until start of next turn',
    description: 'An invisible barrier of magical force appears and protects you.'
  }
];

// Manual Dice Rolling Functions
export const manualDiceRoller = {
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
  },

  // Roll attack with bonus
  rollAttack(attackBonus = 0) {
    return this.rollDie(20) + attackBonus;
  }
};

// Manual Combat Service - Completely separate from AI combat
export class ManualCombatService {
  constructor() {
    this.initiativeOrder = [];
    this.currentTurn = 0;
    this.round = 1;
    this.combatActive = false;
  }

  // Monster Catalog Methods
  getMonsterById(id) {
    return manualMonsters.find(monster => monster.id === id);
  }

  searchMonsters(query) {
    const searchTerm = query.toLowerCase();
    return manualMonsters.filter(monster => 
      monster.name.toLowerCase().includes(searchTerm) ||
      monster.type.toLowerCase().includes(searchTerm) ||
      monster.description.toLowerCase().includes(searchTerm)
    );
  }

  getRandomMonster() {
    return manualMonsters[Math.floor(Math.random() * manualMonsters.length)];
  }

  // Item Catalog Methods
  getItemById(id) {
    return manualItems.find(item => item.id === id);
  }

  searchItems(query) {
    const searchTerm = query.toLowerCase();
    return manualItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm) ||
      item.type.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm)
    );
  }

  getRandomItem() {
    return manualItems[Math.floor(Math.random() * manualItems.length)];
  }

  // Spell Catalog Methods
  getSpellById(id) {
    return manualSpells.find(spell => spell.id === id);
  }

  searchSpells(query) {
    const searchTerm = query.toLowerCase();
    return manualSpells.filter(spell => 
      spell.name.toLowerCase().includes(searchTerm) ||
      spell.school.toLowerCase().includes(searchTerm) ||
      spell.description.toLowerCase().includes(searchTerm)
    );
  }

  getSpellsByLevel(level) {
    return manualSpells.filter(spell => spell.level === level);
  }

  getRandomSpell() {
    return manualSpells[Math.floor(Math.random() * manualSpells.length)];
  }

  // Combat Management Methods
  async rollInitiative(partyId, participants) {
    try {
      const initiativeResults = participants.map(participant => {
        const roll = manualDiceRoller.rollInitiative(participant.initiativeModifier || 0);
        
        return {
          id: participant.id,
          name: participant.name,
          type: participant.type, // 'player' or 'enemy'
          roll: roll - (participant.initiativeModifier || 0),
          modifier: participant.initiativeModifier || 0,
          total: roll,
          initiative: roll,
          position: participant.position || null,
          hp: participant.hp || 0,
          maxHp: participant.maxHp || 0,
          ac: participant.ac || 10,
          spells: participant.spells || [],
          character: participant.character || null,
          monster: participant.monster || null
        };
      });

      // Sort by initiative (highest first)
      initiativeResults.sort((a, b) => b.initiative - a.initiative);

      // Save to campaign story
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }
      
      // Clean the initiative results to remove any undefined values
      const cleanedInitiativeResults = this.cleanDataForFirestore(initiativeResults);
      
      const updatedStory = {
        ...campaignStory,
        combat: {
          ...campaignStory?.combat,
          initiativeOrder: cleanedInitiativeResults,
          currentTurn: 0,
          round: 1,
          active: true,
          startedAt: new Date()
        }
      };

      // Clean the entire story data to remove any undefined values
      const cleanedStory = this.cleanDataForFirestore(updatedStory);

      await updateCampaignStory(campaignStory.id, cleanedStory);
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

      // Clean the story data to remove any undefined values
      const cleanedStory = this.cleanDataForFirestore(updatedStory);

      await updateCampaignStory(campaignStory.id, cleanedStory);
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

      // Clean the story data to remove any undefined values
      const cleanedStory = this.cleanDataForFirestore(updatedStory);

      await updateCampaignStory(campaignStory.id, cleanedStory);
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

  // Clean data to remove undefined values before saving to Firestore
  cleanDataForFirestore(data) {
    if (data === null || data === undefined) {
      return null;
    }
    
    if (typeof data === 'object' && !Array.isArray(data)) {
      const cleaned = {};
      for (const [key, value] of Object.entries(data)) {
        const cleanedValue = this.cleanDataForFirestore(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
      return cleaned;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.cleanDataForFirestore(item)).filter(item => item !== undefined);
    }
    
    return data;
  }

  async saveCombatSetup(partyId, setupData) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }
      
      // Clean the setup data to remove any undefined values
      const cleanedSetupData = this.cleanDataForFirestore(setupData);
      
      const updatedStory = {
        ...campaignStory,
        combat: {
          ...campaignStory?.combat,
          setup: cleanedSetupData,
          lastUpdated: new Date()
        }
      };

      // Clean the entire story data to remove any undefined values
      const cleanedStory = this.cleanDataForFirestore(updatedStory);

      await updateCampaignStory(campaignStory.id, cleanedStory);
      return true;
    } catch (error) {
      console.error('Error saving combat setup:', error);
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

      const roll = manualDiceRoller.rollInitiative(participant.initiativeModifier || 0);
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

      // Clean the initiative order to remove any undefined values
      const cleanedInitiativeOrder = this.cleanDataForFirestore(updatedInitiativeOrder);

      const updatedStory = {
        ...campaignStory,
        combat: {
          ...combat,
          initiativeOrder: cleanedInitiativeOrder
        }
      };

      // Clean the entire story data to remove any undefined values
      const cleanedStory = this.cleanDataForFirestore(updatedStory);

      await updateCampaignStory(campaignStory.id, cleanedStory);
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

      // Clean the initiative order to remove any undefined values
      const cleanedInitiativeOrder = this.cleanDataForFirestore(updatedInitiativeOrder);

      const updatedStory = {
        ...campaignStory,
        combat: {
          ...combat,
          initiativeOrder: cleanedInitiativeOrder,
          currentTurn: newTurn
        }
      };

      // Clean the entire story data to remove any undefined values
      const cleanedStory = this.cleanDataForFirestore(updatedStory);

      await updateCampaignStory(campaignStory.id, cleanedStory);
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

  // Load combat setup from database
  async getCombatSetup(partyId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        return null;
      }
      
      const combat = campaignStory?.combat;
      if (!combat || !combat.setup) {
        return null;
      }
      
      return combat.setup;
    } catch (error) {
      console.error('Error loading combat setup:', error);
      return null;
    }
  }

  // Utility Methods
  calculateInitiativeModifier(dexterity) {
    return Math.floor((dexterity - 10) / 2);
  }

  calculateDistance(pos1, pos2) {
    // Calculate Manhattan distance (no diagonal movement)
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  parseHpString(hpString) {
    const match = hpString.match(/(\d+)\s*\(([^)]+)\)/);
    if (match) {
      return {
        average: parseInt(match[1]),
        dice: match[2]
      };
    }
    return { average: parseInt(hpString) || 10, dice: '1d8' };
  }

  createEnemyFromMonster(monster) {
    const hpData = this.parseHpString(monster.hp);
    const initiativeModifier = this.calculateInitiativeModifier(monster.stats.dex);
    
    return {
      id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: monster.name,
      type: 'enemy',
      hp: hpData.average,
      maxHp: hpData.average,
      ac: monster.ac,
      initiativeModifier: initiativeModifier,
      stats: monster.stats,
      actions: monster.actions,
      description: monster.description,
      monster: monster
    };
  }

  // Combat Action Methods
  async performAttack(partyId, attackerId, targetId, actionName, customRolls = null) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }
      
      const combat = campaignStory?.combat;
      if (!combat || !combat.active) {
        throw new Error('No active combat');
      }

      // Find attacker and target
      const attacker = combat.initiativeOrder.find(p => p.id === attackerId);
      const target = combat.initiativeOrder.find(p => p.id === targetId);
      
      if (!attacker || !target) {
        throw new Error('Attacker or target not found');
      }

      // Get action details
      let action;
      if (attacker.type === 'enemy') {
        action = attacker.monster?.actions?.find(a => a.name === actionName);
      } else {
        // For players, we'll use basic weapon attacks for now
        action = {
          name: actionName || 'Basic Attack',
          type: 'Melee Weapon Attack',
          attack: '+0',
          damage: '1d6'
        };
      }

      if (!action) {
        throw new Error('Action not found');
      }

      // Calculate attack bonus
      let attackBonus = 0;
      if (attacker.type === 'enemy') {
        attackBonus = parseInt(action.attack.replace('+', '')) || 0;
      } else {
        // For players, calculate based on character stats
        const character = attacker.character;
        if (character) {
          const strengthMod = Math.floor((character.strength - 10) / 2);
          const dexterityMod = Math.floor((character.dexterity - 10) / 2);
          // Use the higher modifier for attack bonus
          attackBonus = Math.max(strengthMod, dexterityMod);
        }
      }

      // Roll attack (use custom roll if provided)
      let attackRoll;
      if (customRolls && customRolls.attack) {
        attackRoll = customRolls.attack;
      } else {
        attackRoll = manualDiceRoller.rollAttack(attackBonus);
      }
      const targetAC = target.ac || 10;

      // Determine if hit
      const isHit = attackRoll >= targetAC;
      const isCritical = attackRoll === 20;

      let damage = 0;
      let damageDetails = '';

      if (isHit) {
        // Roll damage (use custom roll if provided)
        if (isCritical) {
          // Critical hit - roll damage dice twice
          let baseDamage, critDamage;
          if (customRolls && customRolls.damage) {
            baseDamage = customRolls.damage;
            critDamage = customRolls.criticalDamage || manualDiceRoller.rollDamage(action.damage);
          } else {
            baseDamage = manualDiceRoller.rollDamage(action.damage);
            critDamage = manualDiceRoller.rollDamage(action.damage);
          }
          damage = baseDamage + critDamage;
          damageDetails = `Critical Hit! ${baseDamage} + ${critDamage} = ${damage}`;
        } else {
          if (customRolls && customRolls.damage) {
            damage = customRolls.damage;
          } else {
            damage = manualDiceRoller.rollDamage(action.damage);
          }
          damageDetails = `Hit! ${damage} damage`;
        }

        // Apply damage to target
        const updatedInitiativeOrder = combat.initiativeOrder.map(p => {
          if (p.id === targetId) {
            const newHp = Math.max(0, p.hp - damage);
            return { ...p, hp: newHp };
          }
          return p;
        });

        // Update combat state
        const updatedStory = {
          ...campaignStory,
          combat: {
            ...combat,
            initiativeOrder: updatedInitiativeOrder
          }
        };

        // Clean the story data to remove any undefined values
        const cleanedStory = this.cleanDataForFirestore(updatedStory);

        await updateCampaignStory(campaignStory.id, cleanedStory);
      }

      return {
        attacker: attacker.name,
        target: target.name,
        action: action.name,
        attackRoll,
        attackBonus,
        targetAC,
        isHit,
        isCritical,
        damage,
        damageDetails,
        targetNewHp: target.hp - damage
      };
    } catch (error) {
      console.error('Error performing attack:', error);
      throw error;
    }
  }

  async getAvailableActions(partyId, combatantId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }
      
      const combat = campaignStory?.combat;
      if (!combat || !combat.active) {
        throw new Error('No active combat');
      }

      const combatant = combat.initiativeOrder.find(p => p.id === combatantId);
      if (!combatant) {
        throw new Error('Combatant not found');
      }

      if (combatant.type === 'enemy') {
        // Return monster actions plus movement
        const monsterActions = combatant.monster?.actions || [];
        return [
          { name: 'Move', type: 'Movement', description: 'Move to a new position on the grid' },
          ...monsterActions
        ];
      } else {
        // Return basic actions for players plus movement
        return [
          { name: 'Move', type: 'Movement', description: 'Move to a new position on the grid' },
          { name: 'Basic Attack', type: 'Melee Weapon Attack', attack: '+0', damage: '1d6', range: '5 ft.' },
          { name: 'Ranged Attack', type: 'Ranged Weapon Attack', attack: '+0', damage: '1d6', range: '15 ft.' }
        ];
      }
    } catch (error) {
      console.error('Error getting available actions:', error);
      throw error;
    }
  }

  async getValidTargets(partyId, attackerId, actionName) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }
      
      const combat = campaignStory?.combat;
      if (!combat || !combat.active) {
        throw new Error('No active combat');
      }

      const attacker = combat.initiativeOrder.find(p => p.id === attackerId);
      if (!attacker) {
        throw new Error('Attacker not found');
      }

      // If it's a movement action, return valid movement positions
      if (actionName === 'Move') {
        return this.getValidMovementPositions(partyId, attackerId);
      }

      // For attacks, check range and return valid targets
      const allTargets = combat.initiativeOrder.filter(p => p.id !== attackerId && p.hp > 0);
      
      if (!attacker.position) {
        return []; // Can't attack if not positioned
      }

      return allTargets.filter(target => {
        if (!target.position) {
          return false; // Can't attack targets without positions
        }

        const distance = this.calculateDistance(attacker.position, target.position);
        
        // Check if target is within range based on action type
        if (actionName === 'Basic Attack') {
          return distance <= 1; // Melee attack - adjacent squares only
        } else if (actionName === 'Ranged Attack') {
          return distance <= 3; // Ranged attack - 3 squares range
        } else {
          // For monster actions, check if they have a range specified
          if (attacker.type === 'enemy' && attacker.monster) {
            const action = attacker.monster.actions?.find(a => a.name === actionName);
            if (action && action.range) {
              // Parse range like "5 ft." or "60 ft."
              const rangeMatch = action.range.match(/(\d+)/);
              if (rangeMatch) {
                const rangeInSquares = Math.ceil(parseInt(rangeMatch[1]) / 5); // 5 ft = 1 square
                return distance <= rangeInSquares;
              }
            }
          }
          return distance <= 1; // Default to melee range
        }
      });
    } catch (error) {
      console.error('Error getting valid targets:', error);
      throw error;
    }
  }

  async getValidMovementPositions(partyId, combatantId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }
      
      const combat = campaignStory?.combat;
      if (!combat || !combat.active) {
        throw new Error('No active combat');
      }

      const combatant = combat.initiativeOrder.find(p => p.id === combatantId);
      if (!combatant || !combatant.position) {
        return [];
      }

      const currentPos = combatant.position;
      const movementRange = 1; // 1 square movement for now
      const validPositions = [];

      // Check all positions within movement range
      for (let dx = -movementRange; dx <= movementRange; dx++) {
        for (let dy = -movementRange; dy <= movementRange; dy++) {
          // Skip current position and diagonal movement (for now)
          if ((dx === 0 && dy === 0) || (Math.abs(dx) + Math.abs(dy) > 1)) {
            continue;
          }

          const newX = currentPos.x + dx;
          const newY = currentPos.y + dy;

          // Check if position is within grid bounds
          if (newX >= 0 && newX < 12 && newY >= 0 && newY < 8) {
            // Check if position is not occupied by another combatant
            const isOccupied = combat.initiativeOrder.some(p => 
              p.position && p.position.x === newX && p.position.y === newY
            );

            if (!isOccupied) {
              validPositions.push({
                id: `pos_${newX}_${newY}`,
                name: `Position (${newX}, ${newY})`,
                type: 'position',
                x: newX,
                y: newY,
                distance: Math.abs(dx) + Math.abs(dy)
              });
            }
          }
        }
      }

      return validPositions;
    } catch (error) {
      console.error('Error getting valid movement positions:', error);
      throw error;
    }
  }

  async performMovement(partyId, combatantId, targetPosition) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      if (!campaignStory) {
        throw new Error('Campaign story not found');
      }
      
      const combat = campaignStory?.combat;
      if (!combat || !combat.active) {
        throw new Error('No active combat');
      }

      const combatant = combat.initiativeOrder.find(p => p.id === combatantId);
      if (!combatant) {
        throw new Error('Combatant not found');
      }

      const oldPosition = combatant.position;
      const newPosition = { x: targetPosition.x, y: targetPosition.y };

      // Update combatant position
      const updatedInitiativeOrder = combat.initiativeOrder.map(p => {
        if (p.id === combatantId) {
          return { ...p, position: newPosition };
        }
        return p;
      });

      // Update combat state
      const updatedStory = {
        ...campaignStory,
        combat: {
          ...combat,
          initiativeOrder: updatedInitiativeOrder
        }
      };

      // Clean the story data to remove any undefined values
      const cleanedStory = this.cleanDataForFirestore(updatedStory);

      await updateCampaignStory(campaignStory.id, cleanedStory);

      return {
        combatant: combatant.name,
        oldPosition,
        newPosition,
        movementDistance: Math.abs(newPosition.x - oldPosition.x) + Math.abs(newPosition.y - oldPosition.y)
      };
    } catch (error) {
      console.error('Error performing movement:', error);
      throw error;
    }
  }

  async performAction(partyId, attackerId, targetId, actionName, customRolls = null) {
    try {
      let result;
      
      // Handle movement separately
      if (actionName === 'Move') {
        const targetPosition = { x: parseInt(targetId.split('_')[1]), y: parseInt(targetId.split('_')[2]) };
        result = await this.performMovement(partyId, attackerId, targetPosition);
      } else {
        // Handle attacks
        result = await this.performAttack(partyId, attackerId, targetId, actionName, customRolls);
      }

      // Get the combatant to check if it's a player or enemy
      const campaignStory = await getCampaignStory(partyId);
      const combat = campaignStory?.combat;
      const combatant = combat?.initiativeOrder?.find(p => p.id === attackerId);
      
      // Only auto-advance turns for player actions (DM controls enemy turns manually)
      if (combatant && combatant.type === 'player') {
        await this.nextTurn(partyId);
      }
      
      return result;
    } catch (error) {
      console.error('Error performing action:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const manualCombatService = new ManualCombatService(); 