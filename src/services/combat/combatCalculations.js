// Combat calculations and damage formulas

import { actionTypes, enemyTypes } from './combatData.js';

export class CombatCalculations {
  // Calculate initiative with modifiers
  calculateInitiative(combatant) {
    const baseInitiative = Math.floor(Math.random() * 20) + 1;
    const dexModifier = Math.floor((combatant.dexterity - 10) / 2);
    const levelBonus = Math.floor((combatant.level || 1) / 2);
    
    return baseInitiative + dexModifier + levelBonus;
  }

  // Calculate attack damage
  calculateAttackDamage(combatant, target, additionalData = {}) {
    const baseDamage = this.rollDice(combatant.damage || '1d6');
    const strengthModifier = Math.floor((combatant.strength - 10) / 2);
    const levelBonus = combatant.level || 1;
    
    // Weapon bonus
    const weaponBonus = combatant.weapon ? this.calculateWeaponBonus(combatant.weapon) : 0;
    
    // Class-specific bonuses
    const classBonus = this.calculateClassBonus(combatant, 'attack');
    
    // Environmental and situational bonuses
    const situationalBonus = additionalData.situationalBonus || 0;
    
    const totalDamage = Math.max(1, baseDamage + strengthModifier + levelBonus + weaponBonus + classBonus + situationalBonus);
    
    return {
      damage: totalDamage,
      damageType: 'physical',
      critical: this.isCriticalHit(combatant, target),
      breakdown: {
        baseDamage,
        strengthModifier,
        levelBonus,
        weaponBonus,
        classBonus,
        situationalBonus
      }
    };
  }

  // Calculate spell damage
  calculateSpellDamage(combatant, target, additionalData = {}) {
    const spellType = additionalData.spellType || 'arcane';
    const baseDamage = this.rollDice(combatant.spellDamage || '1d8');
    const intelligenceModifier = Math.floor((combatant.intelligence - 10) / 2);
    const levelBonus = combatant.level || 1;
    
    // Spell-specific bonuses
    const spellBonus = this.calculateSpellBonus(spellType, combatant);
    
    // Class-specific bonuses
    const classBonus = this.calculateClassBonus(combatant, 'spell');
    
    const totalDamage = Math.max(1, baseDamage + intelligenceModifier + levelBonus + spellBonus + classBonus);
    
    return {
      damage: totalDamage,
      damageType: spellType,
      critical: this.isCriticalHit(combatant, target),
      breakdown: {
        baseDamage,
        intelligenceModifier,
        levelBonus,
        spellBonus,
        classBonus
      }
    };
  }

  // Calculate special ability damage
  calculateSpecialDamage(combatant, target, additionalData = {}) {
    const abilityType = additionalData.abilityType || 'special';
    const baseDamage = this.rollDice('2d6');
    const primaryAttribute = this.getPrimaryAttribute(combatant.class);
    const attributeModifier = Math.floor((combatant[primaryAttribute] - 10) / 2);
    const levelBonus = (combatant.level || 1) * 2;
    
    const totalDamage = Math.max(1, baseDamage + attributeModifier + levelBonus);
    
    return {
      damage: totalDamage,
      damageType: 'special',
      critical: this.isCriticalHit(combatant, target),
      breakdown: {
        baseDamage,
        attributeModifier,
        levelBonus
      }
    };
  }

  // Calculate item effect
  calculateItemEffect(combatant, target, additionalData = {}) {
    const itemType = additionalData.itemType || 'healing';
    
    if (itemType === 'healing') {
      const healingAmount = this.rollDice('1d8') + 2;
      return {
        effect: 'healing',
        amount: healingAmount,
        target: combatant.id
      };
    }
    
    if (itemType === 'damage') {
      const damageAmount = this.rollDice('1d6');
      return {
        effect: 'damage',
        amount: damageAmount,
        damageType: 'item',
        target: target.id
      };
    }
    
    return {
      effect: 'none',
      amount: 0
    };
  }

  // Calculate team up damage
  calculateTeamUpDamage(combatant, target, additionalData = {}) {
    const baseDamage = this.rollDice('3d6');
    const strengthModifier = Math.floor((combatant.strength - 10) / 2);
    const allyBonus = additionalData.allyBonus || 2;
    
    const totalDamage = Math.max(1, baseDamage + strengthModifier + allyBonus);
    
    return {
      damage: totalDamage,
      damageType: 'physical',
      critical: this.isCriticalHit(combatant, target),
      breakdown: {
        baseDamage,
        strengthModifier,
        allyBonus
      }
    };
  }

  // Calculate enemy damage
  calculateEnemyDamage(enemy, target, additionalData = {}) {
    const enemyClass = enemy.class?.toLowerCase();
    const enemyType = enemyTypes[enemyClass] || enemyTypes.wizard;
    const primaryAttribute = enemyType.primaryAttribute;
    const attributeModifier = Math.floor((enemy[primaryAttribute] - 10) / 2);
    
    let baseDamage = this.rollDice(enemy.damage || '1d6');
    let damageType = 'physical';
    
    // Boss/enemy-specific damage bonuses
    if (enemyClass === 'boss' || enemyClass === 'dragon') {
      baseDamage = Math.floor(baseDamage * 1.5);
    }
    
    // Spell-based enemies
    if (enemyType.spellTypes.length > 0) {
      damageType = additionalData.spellType || enemyType.spellTypes[0];
      baseDamage = this.rollDice('1d8');
    }
    
    const totalDamage = Math.max(1, baseDamage + attributeModifier);
    
    return {
      damage: totalDamage,
      damageType,
      critical: this.isCriticalHit(enemy, target),
      breakdown: {
        baseDamage,
        attributeModifier
      }
    };
  }

  // Helper methods
  rollDice(diceNotation) {
    const match = diceNotation.match(/(\d+)d(\d+)/);
    if (!match) return 0;
    
    const [_, count, sides] = match;
    let total = 0;
    
    for (let i = 0; i < parseInt(count); i++) {
      total += Math.floor(Math.random() * parseInt(sides)) + 1;
    }
    
    return total;
  }

  isCriticalHit(attacker, target) {
    const attackRoll = Math.floor(Math.random() * 20) + 1;
    return attackRoll >= 20; // Natural 20 is critical
  }

  calculateWeaponBonus(weapon) {
    const weaponBonuses = {
      'sword': 1,
      'axe': 2,
      'bow': 1,
      'staff': 0,
      'dagger': 0
    };
    
    return weaponBonuses[weapon] || 0;
  }

  calculateSpellBonus(spellType, combatant) {
    const spellBonuses = {
      'fireball': 2,
      'lightning': 3,
      'ice': 1,
      'arcane': 1,
      'divine': 2,
      'necrotic': 2
    };
    
    return spellBonuses[spellType] || 0;
  }

  calculateClassBonus(combatant, actionType) {
    const characterClass = combatant.class?.toLowerCase();
    
    if (actionType === 'attack' && characterClass === 'fighter') {
      return 1;
    }
    
    if (actionType === 'spell' && characterClass === 'wizard') {
      return 2;
    }
    
    if (actionType === 'special' && characterClass === 'rogue') {
      return 1;
    }
    
    return 0;
  }

  getPrimaryAttribute(characterClass) {
    const classAttributes = {
      'fighter': 'strength',
      'wizard': 'intelligence',
      'rogue': 'dexterity',
      'cleric': 'wisdom'
    };
    
    return classAttributes[characterClass?.toLowerCase()] || 'strength';
  }

  getEnemyPrimaryAttribute(enemyClass) {
    const enemyType = enemyTypes[enemyClass?.toLowerCase()];
    return enemyType?.primaryAttribute || 'strength';
  }

  calculateEnemyItemBonus(enemy) {
    const enemyClass = enemy.class?.toLowerCase();
    
    if (enemyClass === 'boss' || enemyClass === 'dragon') {
      return 3;
    }
    
    if (enemyClass === 'wizard' || enemyClass === 'priest') {
      return 1;
    }
    
    return 0;
  }
}

export const combatCalculations = new CombatCalculations(); 