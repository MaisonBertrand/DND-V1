// Main combat service - refactored to use modular components

import { actionTypes, statusEffects } from './combatData.js';
import { combatCalculations } from './combatCalculations.js';
import { enemyAI } from './enemyAI.js';
import { combatNarrative } from './combatNarrative.js';

export class CombatService {
  constructor() {
    this.calculations = combatCalculations;
    this.ai = enemyAI;
    this.narrative = combatNarrative;
  }

  // Initialize combat session with Pokemon-style mechanics
  initializeCombat(partyMembers, enemies, storyContext) {
    const allCombatants = [...partyMembers, ...enemies];
    
    // Calculate initiative with modifiers
    const initiativeOrder = allCombatants.map(combatant => ({
      ...combatant,
      initiative: this.calculations.calculateInitiative(combatant),
      statusEffects: [],
      cooldowns: {},
      lastAction: null,
      turnCount: 0
    })).sort((a, b) => b.initiative - a.initiative);

    return {
      combatants: initiativeOrder,
      currentTurn: 0,
      round: 1,
      combatState: 'active',
      storyContext: storyContext,
      environmentalFeatures: this.narrative.extractEnvironmentalFeatures(storyContext),
      teamUpOpportunities: this.narrative.identifyTeamUpOpportunities(partyMembers),
      narrativeElements: this.narrative.extractNarrativeElements(storyContext)
    };
  }

  // Centralized combat session creation with existing session check
  async createCombatSession(partyId, partyMembers, enemies, storyContext) {
    try {
      // Import database functions dynamically to avoid circular dependencies
      const { createCombatSession: dbCreateCombatSession } = await import('../../firebase/database');
      
      // Force cleanup before checking for existing sessions
      await this.cleanupOldCombatSessions(partyId);
      
      // Check for existing active combat session
      const existingSession = await this.getExistingCombatSession(partyId);
      if (existingSession) {
        return existingSession;
      }

      // Prepare party members with proper stats
      const preparedPartyMembers = this.preparePartyMembers(partyMembers);
      
      // Prepare enemies with proper stats
      const preparedEnemies = this.prepareEnemies(enemies);
      
      // Initialize combat
      const combatSession = this.initializeCombat(
        preparedPartyMembers,
        preparedEnemies,
        storyContext
      );

      // Create database session
      const dbSession = await dbCreateCombatSession(partyId, {
        storyContext: combatSession.storyContext,
        partyMembers: combatSession.combatants.filter(c => !c.id.startsWith('enemy_')),
        enemies: combatSession.combatants.filter(c => c.id.startsWith('enemy_')),
        combatants: combatSession.combatants,
        initiative: combatSession.combatants.map(c => ({ id: c.id, name: c.name, initiative: c.initiative })),
        currentTurn: combatSession.currentTurn,
        round: combatSession.round,
        combatState: combatSession.combatState,
        environmentalFeatures: combatSession.environmentalFeatures,
        teamUpOpportunities: combatSession.teamUpOpportunities,
        narrativeElements: combatSession.narrativeElements
      });

      return dbSession;
    } catch (error) {
      console.error('❌ Error creating combat session:', error);
      throw error;
    }
  }

  // Get existing combat session
  async getExistingCombatSession(partyId) {
    try {
      const { getCombatSession } = await import('../../firebase/database');
      const session = await getCombatSession(partyId);
      
      if (session && session.combatState === 'active') {
        return session;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting existing combat session:', error);
      return null;
    }
  }

  // Cleanup old combat sessions
  async cleanupOldCombatSessions(partyId) {
    try {
      const { deleteCombatSession } = await import('../../firebase/database');
      await deleteCombatSession(partyId);
    } catch (error) {
      console.error('❌ Error cleaning up old combat sessions:', error);
    }
  }

  // Force cleanup combat sessions
  async forceCleanupCombatSessions(partyId) {
    try {
      const { deleteCombatSession } = await import('../../firebase/database');
      await deleteCombatSession(partyId);
      return { success: true, message: 'Combat sessions cleaned up' };
    } catch (error) {
      console.error('❌ Error force cleaning up combat sessions:', error);
      return { success: false, message: 'Failed to cleanup combat sessions' };
    }
  }

  // Prepare party members with proper stats
  preparePartyMembers(partyMembers) {
    return partyMembers.map(member => ({
      ...member,
      id: member.id || `player_${member.userId}`,
      hp: member.hp || member.maxHp || 10,
      maxHp: member.maxHp || 10,
      ac: member.ac || 10,
      attackBonus: member.attackBonus || 3,
      damage: member.damage || '1d6',
      spellDamage: member.spellDamage || '1d8',
      weapon: member.weapon || 'sword',
      level: member.level || 1,
      // Ensure all ability scores exist
      strength: member.strength || 10,
      dexterity: member.dexterity || 10,
      constitution: member.constitution || 10,
      intelligence: member.intelligence || 10,
      wisdom: member.wisdom || 10,
      charisma: member.charisma || 10
    }));
  }

  // Prepare enemies with proper stats
  prepareEnemies(enemies) {
    return enemies.map((enemy, index) => ({
      ...enemy,
      id: enemy.id || `enemy_${index}`,
      hp: enemy.hp || enemy.maxHp || 10,
      maxHp: enemy.maxHp || 10,
      ac: enemy.ac || 10,
      attackBonus: enemy.attackBonus || 3,
      damage: enemy.damage || '1d6',
      level: enemy.level || 1,
      // Ensure all ability scores exist
      strength: enemy.strength || 10,
      dexterity: enemy.dexterity || 10,
      constitution: enemy.constitution || 10,
      intelligence: enemy.intelligence || 10,
      wisdom: enemy.wisdom || 10,
      charisma: enemy.charisma || 10
    }));
  }

  // Execute action
  async executeAction(combatSession, combatantId, actionType, targetId, additionalData = {}) {
    try {
      const combatant = combatSession.combatants.find(c => c.id === combatantId);
      const target = combatSession.combatants.find(c => c.id === targetId);
      
      if (!combatant) {
        return { success: false, message: 'Combatant not found' };
      }
      
      if (combatant.hp <= 0) {
        return { success: false, message: 'Combatant is defeated' };
      }
      
      // Generate narrative
      const narrative = this.narrative.generateActionNarrative(combatant, actionType, target, additionalData);
      
      // Calculate results
      const results = this.calculateActionResults(combatant, actionType, target, additionalData);
      
      // Apply effects
      this.applyActionEffects(combatSession, combatant, target, results);
      
      // Update cooldowns
      this.updateCooldowns(combatSession, combatant, actionType);
      
      // Check status effects
      this.checkStatusEffectApplication(combatant, actionType, target, results);
      
      // Calculate environmental impact
      this.calculateEnvironmentalImpact(combatSession, actionType, results);
      
      // Check if combat has ended
      const combatResult = this.checkCombatEnd(combatSession);
      
      return {
        success: true,
        narrative,
        results,
        combatResult,
        combatSession
      };
    } catch (error) {
      console.error('❌ Error executing action:', error);
      return { success: false, message: 'Failed to execute action' };
    }
  }

  // Calculate action results
  calculateActionResults(combatant, actionType, target, additionalData) {
    switch (actionType) {
      case 'attack':
        return this.calculations.calculateAttackDamage(combatant, target, additionalData);
      case 'spell':
        return this.calculations.calculateSpellDamage(combatant, target, additionalData);
      case 'special':
        return this.calculations.calculateSpecialDamage(combatant, target, additionalData);
      case 'item':
        return this.calculations.calculateItemEffect(combatant, target, additionalData);
      case 'teamUp':
        return this.calculations.calculateTeamUpDamage(combatant, target, additionalData);
      case 'defend':
        return { effect: 'defense', amount: 2 };
      default:
        return { damage: 0, damageType: 'none' };
    }
  }

  // Apply action effects
  applyActionEffects(combatSession, combatant, target, results) {
    if (results.damage && target) {
      target.hp = Math.max(0, target.hp - results.damage);
    }
    
    if (results.effect === 'healing' && results.target) {
      const targetCombatant = combatSession.combatants.find(c => c.id === results.target);
      if (targetCombatant) {
        targetCombatant.hp = Math.min(targetCombatant.maxHp, targetCombatant.hp + results.amount);
      }
    }
  }

  // Update cooldowns
  updateCooldowns(combatSession, combatant, actionType) {
    const cooldown = actionTypes[actionType]?.cooldown || 0;
    if (cooldown > 0) {
      combatant.cooldowns[actionType] = cooldown;
    }
  }

  // Check status effect application
  checkStatusEffectApplication(combatant, actionType, target, results) {
    // Simple status effect logic
    if (actionType === 'spell' && results.damageType === 'fire') {
      target.statusEffects.push({
        type: 'burned',
        duration: 2,
        effect: 'lose 2 HP per turn'
      });
    }
  }

  // Calculate environmental impact
  calculateEnvironmentalImpact(combatSession, actionType, results) {
    // Environmental effects logic
    if (combatSession.environmentalFeatures.length > 0) {
      // Apply environmental bonuses/penalties
    }
  }

  // Process status effects
  processStatusEffects(combatSession, combatant) {
    combatant.statusEffects = combatant.statusEffects.filter(effect => {
      effect.duration--;
      return effect.duration > 0;
    });
    
    // Apply status effect damage
    combatant.statusEffects.forEach(effect => {
      if (effect.effect.includes('lose')) {
        const damage = parseInt(effect.effect.match(/\d+/)[0]);
        combatant.hp = Math.max(0, combatant.hp - damage);
      }
    });
  }

  // Check combat end
  checkCombatEnd(combatSession) {
    const partyMembers = combatSession.combatants.filter(c => !c.id.startsWith('enemy_'));
    const enemies = combatSession.combatants.filter(c => c.id.startsWith('enemy_'));
    
    const aliveParty = partyMembers.filter(c => c.hp > 0);
    const aliveEnemies = enemies.filter(c => c.hp > 0);
    
    if (aliveParty.length === 0) {
      return 'defeat';
    }
    
    if (aliveEnemies.length === 0) {
      return 'victory';
    }
    
    return null;
  }

  // Execute enemy turn
  async executeEnemyTurn(combatSession, enemy) {
    return await this.ai.executeEnemyTurn(combatSession, enemy, this.executeAction.bind(this));
  }

  // Generate combat summary
  generateCombatSummary(combatSession, result) {
    return this.narrative.generateCombatSummary(combatSession, result);
  }

  // Generate combat narrative
  generateCombatNarrative(combatSession, result) {
    return this.narrative.generateCombatNarrative(combatSession, result);
  }
}

export const combatService = new CombatService(); 