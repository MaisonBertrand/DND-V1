// Dice Rolling and Action Validation Service
// Handles dice rolls, skill checks, and action validation based on character stats

export class DiceRollingService {
  constructor() {
    this.diceTypes = {
      d4: 4,
      d6: 6,
      d8: 8,
      d10: 10,
      d12: 12,
      d20: 20,
      d100: 100
    };

    // Skill check DCs by difficulty
    this.difficultyClasses = {
      veryEasy: 5,
      easy: 10,
      medium: 15,
      hard: 20,
      veryHard: 25,
      nearlyImpossible: 30
    };

    // Action types and their associated skills/abilities
    this.actionTypes = {
      // Combat actions
      attack: {
        primaryAbility: 'strength',
        secondaryAbility: 'dexterity',
        baseDC: 10,
        description: 'Physical attack roll'
      },
      spell: {
        primaryAbility: 'intelligence',
        secondaryAbility: 'wisdom',
        baseDC: 12,
        description: 'Spell casting check'
      },
      dodge: {
        primaryAbility: 'dexterity',
        secondaryAbility: 'wisdom',
        baseDC: 15,
        description: 'Dodge incoming attacks'
      },
      parry: {
        primaryAbility: 'strength',
        secondaryAbility: 'dexterity',
        baseDC: 18,
        description: 'Parry with weapon'
      },
      
      // Acrobatic actions
      backflip: {
        primaryAbility: 'dexterity',
        secondaryAbility: 'strength',
        baseDC: 20,
        description: 'Perform a backflip'
      },
      somersault: {
        primaryAbility: 'dexterity',
        secondaryAbility: 'strength',
        baseDC: 18,
        description: 'Perform a somersault'
      },
      cartwheel: {
        primaryAbility: 'dexterity',
        secondaryAbility: 'strength',
        baseDC: 16,
        description: 'Perform a cartwheel'
      },
      wallRun: {
        primaryAbility: 'dexterity',
        secondaryAbility: 'strength',
        baseDC: 22,
        description: 'Run up a wall'
      },
      
      // Movement actions
      jump: {
        primaryAbility: 'strength',
        secondaryAbility: 'dexterity',
        baseDC: 12,
        description: 'Jump over obstacles'
      },
      climb: {
        primaryAbility: 'strength',
        secondaryAbility: 'dexterity',
        baseDC: 15,
        description: 'Climb surfaces'
      },
      swim: {
        primaryAbility: 'strength',
        secondaryAbility: 'constitution',
        baseDC: 14,
        description: 'Swim through water'
      },
      fly: {
        primaryAbility: 'dexterity',
        secondaryAbility: 'intelligence',
        baseDC: 30, // Nearly impossible without magic
        description: 'Fly through the air'
      },
      
      // Social actions
      persuade: {
        primaryAbility: 'charisma',
        secondaryAbility: 'intelligence',
        baseDC: 15,
        description: 'Persuade someone'
      },
      intimidate: {
        primaryAbility: 'charisma',
        secondaryAbility: 'strength',
        baseDC: 16,
        description: 'Intimidate someone'
      },
      deceive: {
        primaryAbility: 'charisma',
        secondaryAbility: 'intelligence',
        baseDC: 18,
        description: 'Deceive someone'
      },
      
      // Perception actions
      spot: {
        primaryAbility: 'wisdom',
        secondaryAbility: 'intelligence',
        baseDC: 12,
        description: 'Spot hidden objects or creatures'
      },
      listen: {
        primaryAbility: 'wisdom',
        secondaryAbility: 'intelligence',
        baseDC: 10,
        description: 'Listen for sounds'
      },
      search: {
        primaryAbility: 'intelligence',
        secondaryAbility: 'wisdom',
        baseDC: 14,
        description: 'Search for hidden items'
      },
      
      // Utility actions
      pickLock: {
        primaryAbility: 'dexterity',
        secondaryAbility: 'intelligence',
        baseDC: 20,
        description: 'Pick a lock'
      },
      disarmTrap: {
        primaryAbility: 'dexterity',
        secondaryAbility: 'intelligence',
        baseDC: 22,
        description: 'Disarm a trap'
      },
      heal: {
        primaryAbility: 'wisdom',
        secondaryAbility: 'intelligence',
        baseDC: 16,
        description: 'Provide medical aid'
      },
      craft: {
        primaryAbility: 'intelligence',
        secondaryAbility: 'dexterity',
        baseDC: 18,
        description: 'Craft an item'
      }
    };

    // Impossible action patterns that should be automatically rejected
    this.impossibleActionPatterns = [
      // Superhuman feats
      /\b(?:do|perform|execute)\s+\d+\s+(?:backflips?|somersaults?|cartwheels?)\b/gi,
      /\b(?:fly|levitate|float)\s+(?:to|up|over|across)\b/gi,
      /\b(?:jump|leap)\s+(?:to|over|across)\s+(?:the\s+)?(?:moon|sky|clouds?)\b/gi,
      /\b(?:teleport|blink|phase)\s+(?:to|through)\b/gi,
      /\b(?:time\s+travel|rewind|fast\s+forward)\b/gi,
      /\b(?:summon|create)\s+(?:a\s+)?(?:dragon|god|demon)\b/gi,
      /\b(?:become|turn\s+into)\s+(?:invisible|invincible|immortal)\b/gi,
      
      // Story-breaking actions
      /\b(?:kill|destroy|eliminate)\s+(?:the\s+)?(?:dm|dungeon\s+master|narrator)\b/gi,
      /\b(?:break|destroy)\s+(?:the\s+)?(?:fourth\s+wall|game|story)\b/gi,
      /\b(?:skip|ignore)\s+(?:the\s+)?(?:quest|mission|story)\b/gi,
      /\b(?:teleport|go)\s+(?:to\s+)?(?:the\s+)?(?:end|final\s+boss|treasure)\b/gi,
      
      // Impossible environmental interactions
      /\b(?:grab|take|steal)\s+(?:the\s+)?(?:quest\s+item|treasure|artifact)\s+(?:from\s+)?(?:nowhere|thin\s+air)\b/gi,
      /\b(?:open|unlock)\s+(?:the\s+)?(?:door|chest)\s+(?:without\s+)?(?:key|lockpick)\b/gi,
      /\b(?:find|locate)\s+(?:the\s+)?(?:hidden\s+)?(?:passage|door)\s+(?:without\s+)?(?:searching)\b/gi
    ];

    // Action modifiers based on circumstances
    this.circumstanceModifiers = {
      // Environmental modifiers
      'in darkness': -2,
      'in bright light': +1,
      'in difficult terrain': -2,
      'on slippery surface': -3,
      'in water': -2,
      'in tight space': -1,
      'with cover': +2,
      'with high ground': +1,
      'with low ground': -1,
      
      // Equipment modifiers
      'with proper tools': +2,
      'with improvised tools': -1,
      'without tools': -3,
      'with magical item': +1,
      'with masterwork item': +2,
      
      // Status modifiers
      'while injured': -2,
      'while exhausted': -3,
      'while hasted': +2,
      'while blessed': +1,
      'while cursed': -2,
      'while poisoned': -1,
      
      // Time pressure modifiers
      'under time pressure': -2,
      'with preparation': +1,
      'with careful planning': +2,
      'in a hurry': -2,
      
      // Social modifiers
      'with authority': +1,
      'with evidence': +2,
      'with witnesses': -1,
      'in private': +1,
      'in public': -1
    };
  }

  // Roll a single die
  rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  // Roll multiple dice
  rollDice(number, sides) {
    const rolls = [];
    for (let i = 0; i < number; i++) {
      rolls.push(this.rollDie(sides));
    }
    return rolls;
  }

  // Roll with advantage (roll 2d20, take highest)
  rollWithAdvantage() {
    const roll1 = this.rollDie(20);
    const roll2 = this.rollDie(20);
    return {
      result: Math.max(roll1, roll2),
      rolls: [roll1, roll2],
      advantage: true
    };
  }

  // Roll with disadvantage (roll 2d20, take lowest)
  rollWithDisadvantage() {
    const roll1 = this.rollDie(20);
    const roll2 = this.rollDie(20);
    return {
      result: Math.min(roll1, roll2),
      rolls: [roll1, roll2],
      disadvantage: true
    };
  }

  // Calculate ability modifier
  getAbilityModifier(abilityScore) {
    return Math.floor((abilityScore - 10) / 2);
  }

  // Calculate proficiency bonus based on level
  getProficiencyBonus(level) {
    return Math.floor((level - 1) / 4) + 2;
  }

  // Perform a skill check
  performSkillCheck(character, actionType, circumstances = [], targetDC = null) {
    const action = this.actionTypes[actionType];
    if (!action) {
      throw new Error(`Unknown action type: ${actionType}`);
    }

    // Calculate base DC
    let dc = targetDC || action.baseDC;

    // Apply circumstance modifiers
    let circumstanceBonus = 0;
    circumstances.forEach(circumstance => {
      if (this.circumstanceModifiers[circumstance]) {
        circumstanceBonus += this.circumstanceModifiers[circumstance];
      }
    });

    // Calculate character bonuses
    const primaryMod = this.getAbilityModifier(character[action.primaryAbility] || 10);
    const secondaryMod = this.getAbilityModifier(character[action.secondaryAbility] || 10);
    const proficiencyBonus = this.getProficiencyBonus(character.level || 1);
    
    // Check if character is proficient in this action
    const isProficient = this.checkProficiency(character, actionType);
    const proficiencyMod = isProficient ? proficiencyBonus : 0;

    // Roll the dice
    const roll = this.rollDie(20);
    const totalRoll = roll + primaryMod + proficiencyMod + circumstanceBonus;

    // Determine success/failure
    const isSuccess = totalRoll >= dc;
    const margin = totalRoll - dc;

    // Determine degree of success
    let degree = 'failure';
    if (isSuccess) {
      if (margin >= 10) degree = 'critical success';
      else if (margin >= 5) degree = 'great success';
      else degree = 'success';
    } else {
      if (margin <= -10) degree = 'critical failure';
      else if (margin <= -5) degree = 'great failure';
      else degree = 'failure';
    }

    return {
      actionType,
      roll,
      totalRoll,
      dc,
      primaryMod,
      secondaryMod,
      proficiencyMod,
      circumstanceBonus,
      isSuccess,
      degree,
      margin,
      circumstances,
      character: {
        name: character.name,
        level: character.level,
        [action.primaryAbility]: character[action.primaryAbility],
        [action.secondaryAbility]: character[action.secondaryAbility]
      }
    };
  }

  // Check if character is proficient in an action
  checkProficiency(character, actionType) {
    const proficiencies = character.proficiencies || [];
    
    // Class-based proficiencies
    const classProficiencies = {
      'Fighter': ['attack', 'dodge', 'parry'],
      'Rogue': ['dodge', 'pickLock', 'disarmTrap', 'spot', 'listen'],
      'Wizard': ['spell', 'search', 'craft'],
      'Cleric': ['heal', 'persuade', 'spot'],
      'Ranger': ['spot', 'listen', 'climb', 'swim'],
      'Paladin': ['attack', 'parry', 'persuade'],
      'Monk': ['attack', 'dodge', 'backflip', 'somersault', 'cartwheel'],
      'Bard': ['persuade', 'deceive', 'intimidate'],
      'Druid': ['heal', 'spot', 'listen'],
      'Sorcerer': ['spell', 'persuade'],
      'Warlock': ['spell', 'intimidate'],
      'Barbarian': ['attack', 'intimidate', 'jump', 'climb']
    };

    const classProfs = classProficiencies[character.class] || [];
    return proficiencies.includes(actionType) || classProfs.includes(actionType);
  }

  // Validate if an action is possible
  validateAction(actionDescription, character, context = {}) {
    const description = actionDescription.toLowerCase();
    
    // Check for impossible actions
    for (const pattern of this.impossibleActionPatterns) {
      if (pattern.test(description)) {
        return {
          possible: false,
          reason: 'This action is beyond the realm of possibility in this world.',
          suggestion: 'Try a more realistic approach that fits within the story and your character\'s abilities.'
        };
      }
    }

    // Extract action types from description
    const detectedActions = this.extractActionsFromDescription(description);
    
    if (detectedActions.length === 0) {
      return {
        possible: true,
        reason: 'Action appears to be narrative in nature.',
        suggestion: 'This will be handled through story progression.'
      };
    }

    // Check each action
    const actionChecks = detectedActions.map(action => {
      const check = this.performSkillCheck(character, action.type, action.circumstances);
      return {
        action: action.type,
        description: action.description,
        check,
        difficulty: this.getDifficultyDescription(check.dc)
      };
    });

    const overallSuccess = actionChecks.every(check => check.check.isSuccess);
    const criticalFailures = actionChecks.filter(check => check.check.degree === 'critical failure');

    return {
      possible: true,
      actions: actionChecks,
      overallSuccess,
      hasCriticalFailures: criticalFailures.length > 0,
      criticalFailures,
      suggestion: this.generateActionSuggestion(actionChecks, character)
    };
  }

  // Extract actions from a description
  extractActionsFromDescription(description) {
    const actions = [];
    
    // Look for action keywords
    Object.entries(this.actionTypes).forEach(([actionType, config]) => {
      const keywords = this.getActionKeywords(actionType);
      keywords.forEach(keyword => {
        if (description.includes(keyword)) {
          // Extract circumstances
          const circumstances = this.extractCircumstances(description);
          
          actions.push({
            type: actionType,
            description: config.description,
            circumstances,
            keyword
          });
        }
      });
    });

    return actions;
  }

  // Get keywords for each action type
  getActionKeywords(actionType) {
    const keywordMap = {
      attack: ['attack', 'strike', 'hit', 'swing', 'slash', 'thrust', 'punch', 'kick'],
      spell: ['cast', 'spell', 'magic', 'enchant', 'charm'],
      dodge: ['dodge', 'evade', 'avoid', 'sidestep'],
      parry: ['parry', 'block', 'deflect'],
      backflip: ['backflip', 'back flip'],
      somersault: ['somersault', 'forward roll'],
      cartwheel: ['cartwheel'],
      wallRun: ['wall run', 'run up wall'],
      jump: ['jump', 'leap', 'hop'],
      climb: ['climb', 'scale'],
      swim: ['swim'],
      fly: ['fly', 'levitate', 'float'],
      persuade: ['persuade', 'convince', 'talk into'],
      intimidate: ['intimidate', 'threaten', 'scare'],
      deceive: ['deceive', 'lie', 'trick'],
      spot: ['spot', 'see', 'notice', 'observe'],
      listen: ['listen', 'hear'],
      search: ['search', 'look for', 'find'],
      pickLock: ['pick lock', 'lockpick'],
      disarmTrap: ['disarm', 'trap'],
      heal: ['heal', 'cure', 'treat'],
      craft: ['craft', 'make', 'create', 'build']
    };

    return keywordMap[actionType] || [];
  }

  // Extract circumstances from description
  extractCircumstances(description) {
    const circumstances = [];
    
    Object.keys(this.circumstanceModifiers).forEach(circumstance => {
      if (description.includes(circumstance)) {
        circumstances.push(circumstance);
      }
    });

    return circumstances;
  }

  // Get difficulty description
  getDifficultyDescription(dc) {
    if (dc <= 5) return 'Very Easy';
    if (dc <= 10) return 'Easy';
    if (dc <= 15) return 'Medium';
    if (dc <= 20) return 'Hard';
    if (dc <= 25) return 'Very Hard';
    return 'Nearly Impossible';
  }

  // Generate action suggestion
  generateActionSuggestion(actionChecks, character) {
    const failures = actionChecks.filter(check => !check.check.isSuccess);
    
    if (failures.length === 0) {
      return 'All actions are within your capabilities. Proceed with confidence!';
    }

    const suggestions = failures.map(failure => {
      const action = failure.action;
      const check = failure.check;
      
      if (check.degree === 'critical failure') {
        return `The ${action} is extremely difficult for you. Consider an alternative approach or ask for help.`;
      } else {
        return `The ${action} is challenging. You might want to take your time or use better equipment.`;
      }
    });

    return suggestions.join(' ');
  }

  // Perform a complex action sequence
  performActionSequence(character, actions, context = {}) {
    const results = [];
    let cumulativeModifier = 0;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      
      // Apply cumulative modifier from previous actions
      const circumstances = [...action.circumstances];
      if (cumulativeModifier > 0) {
        circumstances.push('with momentum');
      } else if (cumulativeModifier < 0) {
        circumstances.push('while fatigued');
      }

      const check = this.performSkillCheck(character, action.type, circumstances);
      results.push({
        action: action.type,
        check,
        sequencePosition: i + 1
      });

      // Update cumulative modifier based on success/failure
      if (check.isSuccess) {
        cumulativeModifier += 1;
      } else {
        cumulativeModifier -= 2;
      }
    }

    const overallSuccess = results.every(result => result.check.isSuccess);
    const criticalFailures = results.filter(result => result.check.degree === 'critical failure');

    return {
      actions: results,
      overallSuccess,
      hasCriticalFailures: criticalFailures.length > 0,
      criticalFailures,
      sequenceLength: actions.length,
      finalModifier: cumulativeModifier
    };
  }

  // Generate narrative result for an action
  generateActionNarrative(actionResult, character) {
    const { actionType, check, degree } = actionResult;
    const action = this.actionTypes[actionType];
    
    const narratives = {
      attack: {
        'critical success': `${character.name} executes a perfect ${actionType}, striking with incredible precision!`,
        'great success': `${character.name} performs an excellent ${actionType}, hitting the target solidly.`,
        'success': `${character.name} successfully ${actionType}s the target.`,
        'failure': `${character.name} attempts to ${actionType} but misses the mark.`,
        'great failure': `${character.name} completely fails to ${actionType}, leaving themselves open.`,
        'critical failure': `${character.name} botches the ${actionType} spectacularly, potentially harming themselves!`
      },
      backflip: {
        'critical success': `${character.name} performs a flawless backflip, landing gracefully with perfect form!`,
        'great success': `${character.name} executes a smooth backflip, impressing onlookers.`,
        'success': `${character.name} manages to complete the backflip successfully.`,
        'failure': `${character.name} attempts a backflip but loses balance and stumbles.`,
        'great failure': `${character.name} fails the backflip badly, landing awkwardly.`,
        'critical failure': `${character.name} completely fails the backflip, potentially injuring themselves!`
      },
      fly: {
        'critical success': `${character.name} somehow defies gravity and soars through the air with supernatural grace!`,
        'great success': `${character.name} manages to achieve brief flight through incredible effort!`,
        'success': `${character.name} makes a valiant attempt at flight, achieving a brief hover.`,
        'failure': `${character.name} tries to fly but only manages an awkward hop.`,
        'great failure': `${character.name} attempts flight but falls flat on their face.`,
        'critical failure': `${character.name} tries to fly and crashes spectacularly, looking quite foolish!`
      }
    };

    const actionNarratives = narratives[actionType] || narratives.attack;
    return actionNarratives[degree] || actionNarratives.failure;
  }
}

export default DiceRollingService; 