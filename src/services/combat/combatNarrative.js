// Combat narrative generation and story integration

import { actionTypes } from './combatData.js';

export class CombatNarrative {
  // Generate action narrative
  generateActionNarrative(combatant, actionType, target, additionalData) {
    const template = actionTypes[actionType]?.narrativeTemplate || '{character} performs an action!';
    
    let narrative = template
      .replace('{character}', combatant.name)
      .replace('{action}', this.getActionVerb(actionType, combatant.class))
      .replace('{weapon}', combatant.weapon || 'their weapon')
      .replace('{spell}', additionalData.spellType || 'magic')
      .replace('{ability}', additionalData.specialAttack || 'special ability')
      .replace('{item}', additionalData.itemType || 'item')
      .replace('{environment}', additionalData.environment || 'surroundings')
      .replace('{ally}', additionalData.ally || 'ally');
    
    // Add class-specific flavor
    const classFlavor = this.getClassFlavor(combatant.class, actionType);
    if (classFlavor) {
      narrative += ` ${classFlavor}`;
    }
    
    // Add target information
    if (target && target.id !== combatant.id) {
      narrative += ` against ${target.name}`;
    }
    
    return narrative;
  }

  // Get action verb based on action type and character class
  getActionVerb(actionType, characterClass) {
    const verbs = {
      attack: {
        fighter: 'swings',
        wizard: 'casts',
        rogue: 'strikes',
        cleric: 'smites',
        default: 'attacks'
      },
      spell: {
        wizard: 'channels',
        cleric: 'invokes',
        default: 'casts'
      },
      special: {
        fighter: 'unleashes',
        wizard: 'unleashes',
        rogue: 'executes',
        cleric: 'blesses',
        default: 'uses'
      },
      item: {
        default: 'uses'
      },
      defend: {
        default: 'defends'
      },
      environmental: {
        default: 'utilizes'
      },
      teamUp: {
        default: 'coordinates with'
      }
    };
    
    const actionVerbs = verbs[actionType] || verbs.attack;
    return actionVerbs[characterClass?.toLowerCase()] || actionVerbs.default;
  }

  // Get class-specific flavor text
  getClassFlavor(characterClass, actionType) {
    const flavors = {
      fighter: {
        attack: 'with practiced precision',
        special: 'their martial prowess',
        defend: 'with shield raised high'
      },
      wizard: {
        attack: 'with arcane might',
        spell: 'weaving intricate patterns',
        special: 'their magical mastery'
      },
      rogue: {
        attack: 'from the shadows',
        special: 'their deadly precision',
        defend: 'with nimble footwork'
      },
      cleric: {
        attack: 'with divine authority',
        spell: 'calling upon the gods',
        special: 'their holy power'
      }
    };
    
    const classFlavors = flavors[characterClass?.toLowerCase()];
    return classFlavors?.[actionType] || '';
  }

  // Extract environmental features from story context
  extractEnvironmentalFeatures(storyContext) {
    const features = [];
    
    if (!storyContext) return features;
    
    const context = storyContext.toLowerCase();
    
    // Check for environmental elements
    if (context.includes('forest') || context.includes('trees')) {
      features.push({
        name: 'Dense Forest',
        effect: 'Provides cover (+1 AC)',
        narrative: 'The dense trees provide natural cover'
      });
    }
    
    if (context.includes('cave') || context.includes('underground')) {
      features.push({
        name: 'Dark Cave',
        effect: 'Reduced visibility (-1 to attack)',
        narrative: 'The darkness makes it harder to aim'
      });
    }
    
    if (context.includes('water') || context.includes('river')) {
      features.push({
        name: 'Water Hazard',
        effect: 'Difficult terrain',
        narrative: 'The water makes movement difficult'
      });
    }
    
    if (context.includes('fire') || context.includes('flame')) {
      features.push({
        name: 'Burning Environment',
        effect: 'Fire damage to all combatants',
        narrative: 'The flames lick at all present'
      });
    }
    
    return features;
  }

  // Identify team up opportunities
  identifyTeamUpOpportunities(partyMembers) {
    const opportunities = [];
    
    // Check for complementary classes
    const hasFighter = partyMembers.some(m => m.class?.toLowerCase() === 'fighter');
    const hasWizard = partyMembers.some(m => m.class?.toLowerCase() === 'wizard');
    const hasRogue = partyMembers.some(m => m.class?.toLowerCase() === 'rogue');
    const hasCleric = partyMembers.some(m => m.class?.toLowerCase() === 'cleric');
    
    if (hasFighter && hasWizard) {
      opportunities.push({
        name: 'Tank and Spell',
        description: 'Fighter distracts while Wizard casts',
        bonus: '+2 damage'
      });
    }
    
    if (hasRogue && hasCleric) {
      opportunities.push({
        name: 'Divine Stealth',
        description: 'Cleric blesses Rogue for enhanced stealth',
        bonus: '+1d6 damage'
      });
    }
    
    if (hasFighter && hasCleric) {
      opportunities.push({
        name: 'Holy Warrior',
        description: 'Cleric enhances Fighter with divine power',
        bonus: '+1 to all rolls'
      });
    }
    
    return opportunities;
  }

  // Extract narrative elements from story context
  extractNarrativeElements(storyContext) {
    if (!storyContext) return {};
    
    return {
      mood: this.determineCombatMood(storyContext),
      stakes: this.determineStakes(storyContext),
      hazards: this.identifyHazards(storyContext),
      npcs: this.extractNPCs(storyContext)
    };
  }

  // Determine combat mood from story context
  determineCombatMood(storyContext) {
    const context = storyContext.toLowerCase();
    
    if (context.includes('desperate') || context.includes('last stand')) {
      return 'desperate';
    }
    
    if (context.includes('epic') || context.includes('legendary')) {
      return 'epic';
    }
    
    if (context.includes('stealth') || context.includes('sneak')) {
      return 'stealthy';
    }
    
    if (context.includes('chaos') || context.includes('confusion')) {
      return 'chaotic';
    }
    
    return 'standard';
  }

  // Determine stakes from story context
  determineStakes(storyContext) {
    const context = storyContext.toLowerCase();
    
    if (context.includes('save the world') || context.includes('apocalypse')) {
      return 'world-ending';
    }
    
    if (context.includes('save the kingdom') || context.includes('royal')) {
      return 'kingdom-level';
    }
    
    if (context.includes('save the village') || context.includes('town')) {
      return 'village-level';
    }
    
    if (context.includes('personal') || context.includes('revenge')) {
      return 'personal';
    }
    
    return 'standard';
  }

  // Identify hazards from story context
  identifyHazards(storyContext) {
    const hazards = [];
    const context = storyContext.toLowerCase();
    
    if (context.includes('poison') || context.includes('toxic')) {
      hazards.push('poison');
    }
    
    if (context.includes('fire') || context.includes('flame')) {
      hazards.push('fire');
    }
    
    if (context.includes('ice') || context.includes('cold')) {
      hazards.push('cold');
    }
    
    if (context.includes('electricity') || context.includes('lightning')) {
      hazards.push('lightning');
    }
    
    return hazards;
  }

  // Extract NPCs from story context
  extractNPCs(storyContext) {
    const npcs = [];
    
    if (!storyContext) return npcs;
    
    // Simple NPC extraction - look for capitalized names
    const nameMatches = storyContext.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
    
    if (nameMatches) {
      nameMatches.forEach(name => {
        // Filter out common words that might be capitalized
        const commonWords = ['The', 'A', 'An', 'And', 'Or', 'But', 'In', 'On', 'At', 'To', 'For', 'Of', 'With', 'By'];
        if (!commonWords.includes(name)) {
          npcs.push({
            name,
            role: 'unknown',
            disposition: 'neutral'
          });
        }
      });
    }
    
    return npcs;
  }

  // Generate combat summary
  generateCombatSummary(combatSession, result) {
    const { combatants, round } = combatSession;
    const partyMembers = combatants.filter(c => !c.id.startsWith('enemy_'));
    const enemies = combatants.filter(c => c.id.startsWith('enemy_'));
    
    const aliveParty = partyMembers.filter(c => c.hp > 0);
    const aliveEnemies = enemies.filter(c => c.hp > 0);
    
    return {
      rounds: round,
      partyCasualties: partyMembers.length - aliveParty.length,
      enemyCasualties: enemies.length - aliveEnemies.length,
      result: result,
      survivors: {
        party: aliveParty.map(c => c.name),
        enemies: aliveEnemies.map(c => c.name)
      }
    };
  }

  // Generate combat narrative
  generateCombatNarrative(combatSession, result) {
    const summary = this.generateCombatSummary(combatSession, result);
    
    let narrative = `The battle raged for ${summary.rounds} rounds. `;
    
    if (result === 'victory') {
      narrative += `The party emerged victorious, defeating ${summary.enemyCasualties} enemies`;
      if (summary.partyCasualties > 0) {
        narrative += ` at the cost of ${summary.partyCasualties} fallen comrades`;
      }
      narrative += '.';
    } else if (result === 'defeat') {
      narrative += `The party was defeated by their enemies`;
      if (summary.enemyCasualties > 0) {
        narrative += `, though they managed to take ${summary.enemyCasualties} enemies with them`;
      }
      narrative += '.';
    } else {
      narrative += 'The battle ended in a draw, with both sides withdrawing.';
    }
    
    return narrative;
  }
}

export const combatNarrative = new CombatNarrative(); 