// Level Up Service
// Handles character leveling, XP calculations, attribute increases, and spell progression

export class LevelUpService {
  constructor() {
    // D&D 5e XP thresholds for leveling
    this.xpThresholds = {
      1: 0,
      2: 300,
      3: 900,
      4: 2700,
      5: 6500,
      6: 14000,
      7: 23000,
      8: 34000,
      9: 48000,
      10: 64000,
      11: 85000,
      12: 100000,
      13: 120000,
      14: 140000,
      15: 165000,
      16: 195000,
      17: 225000,
      18: 265000,
      19: 305000,
      20: 355000
    };

    // Ability Score Improvement levels (every 4th level)
    this.abilityScoreImprovementLevels = [4, 8, 12, 16, 19];

    // Class-specific spell progression
    this.spellProgression = {
      'Wizard': {
        cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
        spellSlots: {
          1: [2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
          2: [0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          3: [0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          4: [0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          5: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
          6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
          8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
          9: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1]
        }
      },
      'Sorcerer': {
        cantrips: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
        spellSlots: {
          1: [2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
          2: [0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          3: [0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          4: [0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          5: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
          6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
          8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
          9: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1]
        }
      },
      'Cleric': {
        cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
        spellSlots: {
          1: [2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
          2: [0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          3: [0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          4: [0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          5: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
          6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
          8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
          9: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1]
        }
      },
      'Druid': {
        cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        spellSlots: {
          1: [2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
          2: [0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          3: [0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          4: [0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          5: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
          6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
          8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
          9: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1]
        }
      },
      'Bard': {
        cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        spellSlots: {
          1: [2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
          2: [0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          3: [0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          4: [0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          5: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
          6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
          8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
          9: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1]
        }
      },
      'Warlock': {
        cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        spellSlots: {
          1: [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          2: [0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          3: [0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          4: [0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          5: [0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0],
          7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0],
          8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0],
          9: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0]
        }
      },
      'Paladin': {
        cantrips: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        spellSlots: {
          1: [0, 0, 2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
          2: [0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          3: [0, 0, 0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          4: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
          5: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        }
      },
      'Ranger': {
        cantrips: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        spellSlots: {
          1: [0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          2: [0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          3: [0, 0, 0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          4: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
          5: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        }
      }
    };
  }

  // Calculate current level based on XP
  calculateLevel(xp) {
    for (let level = 20; level >= 1; level--) {
      if (xp >= this.xpThresholds[level]) {
        return level;
      }
    }
    return 1;
  }

  // Calculate XP needed for next level
  calculateXPForNextLevel(currentLevel) {
    if (currentLevel >= 20) return null; // Max level
    return this.xpThresholds[currentLevel + 1];
  }

  // Calculate XP progress to next level
  calculateXPProgress(xp, currentLevel) {
    const xpForNextLevel = this.calculateXPForNextLevel(currentLevel);
    if (!xpForNextLevel) return 100; // Max level
    
    const xpForCurrentLevel = this.xpThresholds[currentLevel];
    const xpInCurrentLevel = xp - xpForCurrentLevel;
    const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
    
    return Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100);
  }

  // Check if character should level up
  shouldLevelUp(character) {
    const currentLevel = character.level || 1;
    const calculatedLevel = this.calculateLevel(character.xp || 0);
    return calculatedLevel > currentLevel;
  }

  // Get level up information
  getLevelUpInfo(character) {
    const currentLevel = character.level || 1;
    const calculatedLevel = this.calculateLevel(character.xp || 0);
    
    if (calculatedLevel <= currentLevel) {
      return null;
    }

    const newLevel = calculatedLevel;
    const levelsGained = newLevel - currentLevel;
    
    return {
      oldLevel: currentLevel,
      newLevel: newLevel,
      levelsGained: levelsGained,
      hasAbilityScoreImprovement: this.abilityScoreImprovementLevels.includes(newLevel),
      abilityScorePoints: this.getAbilityScorePoints(currentLevel, newLevel),
      newSpellSlots: this.getSpellSlotsForLevel(character.class, newLevel),
      oldSpellSlots: this.getSpellSlotsForLevel(character.class, currentLevel),
      canLearnSpells: this.canLearnSpells(character.class, newLevel)
    };
  }

  // Calculate ability score improvement points
  getAbilityScorePoints(oldLevel, newLevel) {
    let points = 0;
    for (let level = oldLevel + 1; level <= newLevel; level++) {
      if (this.abilityScoreImprovementLevels.includes(level)) {
        points += 2; // Standard D&D 5e: 2 ability score points per improvement
      }
    }
    return points;
  }

  // Get spell slots for a specific level
  getSpellSlotsForLevel(characterClass, level) {
    const progression = this.spellProgression[characterClass];
    if (!progression) return {};

    const slots = {};
    for (let spellLevel = 1; spellLevel <= 9; spellLevel++) {
      const slotCount = progression.spellSlots[spellLevel]?.[level - 1] || 0;
      if (slotCount > 0) {
        slots[spellLevel] = slotCount;
      }
    }
    
    // Add cantrips
    const cantripCount = progression.cantrips[level - 1] || 0;
    if (cantripCount > 0) {
      slots[0] = cantripCount;
    }

    return slots;
  }

  // Check if character can learn new spells
  canLearnSpells(characterClass, level) {
    const progression = this.spellProgression[characterClass];
    if (!progression) return false;

    // Check if any new spell slots were gained
    const currentSlots = this.getSpellSlotsForLevel(characterClass, level);
    const previousSlots = this.getSpellSlotsForLevel(characterClass, level - 1);
    
    for (let spellLevel = 1; spellLevel <= 9; spellLevel++) {
      if ((currentSlots[spellLevel] || 0) > (previousSlots[spellLevel] || 0)) {
        return true;
      }
    }
    
    return false;
  }

  // Apply level up to character
  applyLevelUp(character, levelUpInfo, abilityScoreIncreases = {}, newSpells = []) {
    const updatedCharacter = { ...character };
    
    // Update level
    updatedCharacter.level = levelUpInfo.newLevel;
    
    // Apply ability score increases
    Object.entries(abilityScoreIncreases).forEach(([ability, increase]) => {
      if (updatedCharacter[ability]) {
        updatedCharacter[ability] = Math.min(20, updatedCharacter[ability] + increase);
      }
    });
    
    // Add new spells
    if (newSpells.length > 0) {
      updatedCharacter.spells = [...(updatedCharacter.spells || []), ...newSpells];
    }
    
    // Recalculate HP based on new level and constitution
    const hitDieSizes = {
      'Barbarian': 12, 'Fighter': 10, 'Paladin': 10, 'Ranger': 10,
      'Cleric': 8, 'Druid': 8, 'Monk': 8, 'Rogue': 8, 'Bard': 8,
      'Sorcerer': 6, 'Warlock': 8, 'Wizard': 6
    };
    
    const hitDie = hitDieSizes[updatedCharacter.class] || 8;
    const constitutionMod = Math.floor((updatedCharacter.constitution - 10) / 2);
    const newMaxHP = Math.max(1, (hitDie + constitutionMod) * updatedCharacter.level);
    
    // Increase current HP by the difference
    const oldMaxHP = updatedCharacter.maxHp || newMaxHP;
    updatedCharacter.maxHp = newMaxHP;
    updatedCharacter.hp = Math.min(updatedCharacter.hp + (newMaxHP - oldMaxHP), newMaxHP);
    
    return updatedCharacter;
  }

  // Get available spells for a character at a specific level
  getAvailableSpells(characterClass, level) {
    // Import dmCatalogsService dynamically to avoid circular dependencies
    const { dmCatalogsService } = require('./dmCatalogs');
    
    try {
      const allSpells = dmCatalogsService.initializeSpells();
      
      // Filter spells by class and level
      const classSpellLists = {
        'Wizard': ['Evocation', 'Abjuration', 'Enchantment', 'Divination', 'Necromancy', 'Transmutation', 'Illusion', 'Conjuration'],
        'Cleric': ['Evocation', 'Abjuration', 'Enchantment', 'Divination', 'Necromancy', 'Transmutation'],
        'Druid': ['Evocation', 'Abjuration', 'Enchantment', 'Divination', 'Necromancy', 'Transmutation', 'Conjuration'],
        'Bard': ['Enchantment', 'Divination', 'Illusion', 'Transmutation'],
        'Sorcerer': ['Evocation', 'Abjuration', 'Enchantment', 'Divination', 'Necromancy', 'Transmutation', 'Illusion', 'Conjuration'],
        'Warlock': ['Enchantment', 'Evocation', 'Necromancy', 'Conjuration', 'Abjuration', 'Divination', 'Illusion', 'Transmutation'],
        'Paladin': ['Abjuration', 'Divination', 'Enchantment', 'Evocation'],
        'Ranger': ['Divination', 'Enchantment', 'Evocation', 'Transmutation']
      };
      
      const allowedSchools = classSpellLists[characterClass] || [];
      
      return allSpells.filter(spell => 
        spell.level <= level && 
        allowedSchools.includes(spell.school)
      );
    } catch (error) {
      console.error('Error loading spells:', error);
      // Fallback to basic spell list
      const fallbackSpells = {
        'Wizard': [
          { name: 'Magic Missile', level: 1, school: 'Evocation' },
          { name: 'Shield', level: 1, school: 'Abjuration' },
          { name: 'Burning Hands', level: 1, school: 'Evocation' },
          { name: 'Charm Person', level: 1, school: 'Enchantment' },
          { name: 'Detect Magic', level: 1, school: 'Divination' },
          { name: 'Mage Armor', level: 1, school: 'Abjuration' },
          { name: 'Sleep', level: 1, school: 'Enchantment' },
          { name: 'Thunderwave', level: 1, school: 'Evocation' }
        ],
        'Cleric': [
          { name: 'Cure Wounds', level: 1, school: 'Evocation' },
          { name: 'Bless', level: 1, school: 'Enchantment' },
          { name: 'Command', level: 1, school: 'Enchantment' },
          { name: 'Detect Evil and Good', level: 1, school: 'Divination' },
          { name: 'Guiding Bolt', level: 1, school: 'Evocation' },
          { name: 'Healing Word', level: 1, school: 'Evocation' },
          { name: 'Inflict Wounds', level: 1, school: 'Necromancy' },
          { name: 'Sanctuary', level: 1, school: 'Abjuration' }
        ]
      };
      
      return fallbackSpells[characterClass] || [];
    }
  }
}

export const levelUpService = new LevelUpService(); 