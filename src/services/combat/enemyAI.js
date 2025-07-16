// Enemy AI logic and decision making

import { actionTypes, enemyTypes } from './combatData.js';

export class EnemyAI {
  // Choose enemy action based on AI logic
  chooseEnemyAction(enemy, combatSession) {
    const availableActions = this.getAvailableActions(enemy);
    
    if (availableActions.length === 0) {
      return null;
    }
    
    return this.makeEnemyDecision(enemy, availableActions, combatSession);
  }

  // Get available actions for enemy
  getAvailableActions(enemy) {
    const actions = ['attack', 'defend'];
    
    // Add spell actions for spellcasters
    if (enemy.class && ['wizard', 'priest', 'mage', 'sorcerer'].includes(enemy.class.toLowerCase())) {
      actions.push('spell');
    }
    
    // Add special actions for bosses
    if (enemy.class && ['boss', 'dragon'].includes(enemy.class.toLowerCase())) {
      actions.push('special');
    }
    
    // Add item actions if enemy has items
    if (enemy.items && enemy.items.length > 0) {
      actions.push('item');
    }
    
    // Add environmental actions if available
    if (combatSession?.environmentalFeatures?.length > 0) {
      actions.push('environmental');
    }
    
    return actions;
  }

  // Get valid targets for enemy action
  getValidTargets(enemy, actionType, combatSession) {
    const targets = [];
    
    // Get all living party members
    const partyMembers = combatSession.combatants.filter(c => 
      !c.id.startsWith('enemy_') && c.hp > 0
    );
    
    // Get all living enemies (for healing/buffing)
    const allies = combatSession.combatants.filter(c => 
      c.id.startsWith('enemy_') && c.hp > 0 && c.id !== enemy.id
    );
    
    switch (actionType) {
      case 'attack':
      case 'spell':
        // Can target party members
        targets.push(...partyMembers);
        break;
        
      case 'special':
        // Can target party members
        targets.push(...partyMembers);
        break;
        
      case 'item':
        // Can target self or allies
        targets.push(enemy, ...allies);
        break;
        
      case 'defend':
        // No target needed
        break;
        
      case 'environmental':
        // Can target party members
        targets.push(...partyMembers);
        break;
    }
    
    return targets;
  }

  // Make enemy decision based on AI logic
  makeEnemyDecision(enemy, availableActions, combatSession) {
    const validTargets = this.getValidTargets(enemy, availableActions[0], combatSession);
    
    // If no valid targets for this action, default to defend
    if (validTargets.length === 0) {
      return { 
        action: 'defend', 
        target: null,
        specialAttack: 'Defensive Stance',
        damageType: 'defense',
        attribute: 'dexterity'
      };
    }
    
    // Ensure we have a valid target
    const target = validTargets[Math.floor(Math.random() * validTargets.length)];
    
    // Health-based decision making
    const healthPercentage = enemy.hp / enemy.maxHp;
    
    // Enhanced AI with special attacks and attributes
    const enemyClass = enemy.class?.toLowerCase();
    const enemyLevel = enemy.level || 1;
    
    // Special attacks based on enemy class and level
    if (enemyClass === 'priest' || enemyClass === 'cleric') {
      // Priests have healing and divine attacks
      if (healthPercentage < 0.4 && availableActions.includes('spell')) {
        return { 
          action: 'spell', 
          target: enemy.id, 
          spellType: 'healing',
          specialAttack: 'Divine Healing',
          damageType: 'healing',
          attribute: 'wisdom'
        };
      }
      if (availableActions.includes('spell') && target) {
        return { 
          action: 'spell', 
          target: target.id, 
          spellType: 'divine',
          specialAttack: 'Divine Smite',
          damageType: 'radiant',
          attribute: 'wisdom'
        };
      }
    }
    
    if (enemyClass === 'wizard' || enemyClass === 'mage' || enemyClass === 'sorcerer') {
      // Wizards have powerful spells
      if (availableActions.includes('spell')) {
        const spells = ['fireball', 'lightning', 'ice', 'arcane'];
        const spellType = spells[Math.floor(Math.random() * spells.length)];
        return { 
          action: 'spell', 
          target: target.id, 
          spellType: spellType,
          specialAttack: `${spellType.charAt(0).toUpperCase() + spellType.slice(1)} Spell`,
          damageType: spellType === 'fireball' ? 'fire' : spellType === 'lightning' ? 'lightning' : spellType === 'ice' ? 'cold' : 'arcane',
          attribute: 'intelligence'
        };
      }
    }
    
    if (enemyClass === 'boss' || enemyClass === 'dragon') {
      // Bosses have devastating attacks
      if (availableActions.includes('special')) {
        return { 
          action: 'special', 
          target: target.id, 
          specialAttack: 'Devastating Strike',
          damageType: 'physical',
          attribute: 'strength',
          isBossAttack: true
        };
      }
    }
    
    if (enemyClass === 'undead' || enemyClass === 'skeleton' || enemyClass === 'zombie') {
      // Undead have necrotic attacks
      if (availableActions.includes('spell')) {
        return { 
          action: 'spell', 
          target: target.id, 
          spellType: 'necrotic',
          specialAttack: 'Death Touch',
          damageType: 'necrotic',
          attribute: 'constitution'
        };
      }
    }
    
    // If low health, prioritize healing/defense
    if (healthPercentage < 0.3) {
      if (availableActions.includes('item')) {
        return { 
          action: 'item', 
          target: enemy.id, 
          itemType: 'healing',
          specialAttack: 'Use Healing Potion',
          damageType: 'healing',
          attribute: 'constitution'
        };
      }
      if (availableActions.includes('defend')) {
        return { 
          action: 'defend', 
          target: null,
          specialAttack: 'Defensive Stance',
          damageType: 'defense',
          attribute: 'dexterity'
        };
      }
    }
    
    // If multiple enemies are low health, use area attacks
    const lowHealthAllies = combatSession.combatants.filter(c => 
      c.id.startsWith('enemy_') && c.hp / c.maxHp < 0.5
    );
    
    if (lowHealthAllies.length > 1 && availableActions.includes('spell')) {
      return { 
        action: 'spell', 
        target: target.id, 
        spellType: 'area',
        specialAttack: 'Area Attack',
        damageType: 'mixed',
        attribute: 'intelligence'
      };
    }
    
    // Default to attack with enhanced attributes
    if (availableActions.includes('attack')) {
      return { 
        action: 'attack', 
        target: target.id,
        specialAttack: 'Standard Attack',
        damageType: 'physical',
        attribute: 'strength'
      };
    }
    
    // Fallback to any available action
    const action = availableActions[Math.floor(Math.random() * availableActions.length)];
    return { 
      action, 
      target: target.id,
      specialAttack: 'Basic Action',
      damageType: 'physical',
      attribute: 'strength'
    };
  }

  // Execute enemy turn automatically
  async executeEnemyTurn(combatSession, enemy, executeAction) {
    // Check if enemy is still alive
    if (enemy.hp <= 0) {
      return {
        success: false,
        message: `${enemy.name} is already defeated`
      };
    }
    
    const decision = this.chooseEnemyAction(enemy, combatSession);
    
    if (!decision) {
      return await executeAction(combatSession, enemy.id, 'defend', enemy.id, {
        specialAttack: 'Defensive Stance',
        damageType: 'defense',
        attribute: 'dexterity'
      });
    }
    
    if (decision.target) {
      return await executeAction(combatSession, enemy.id, decision.action, decision.target, {
        itemType: decision.itemType,
        spellType: decision.spellType,
        specialAttack: decision.specialAttack,
        damageType: decision.damageType,
        attribute: decision.attribute,
        isBossAttack: decision.isBossAttack
      });
    } else {
      // Defend action
      return await executeAction(combatSession, enemy.id, 'defend', enemy.id, {
        specialAttack: decision.specialAttack,
        damageType: decision.damageType,
        attribute: decision.attribute
      });
    }
  }
}

export const enemyAI = new EnemyAI(); 