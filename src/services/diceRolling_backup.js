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
        suggestion: 'This will be handled through story progression.',
        actions: [],
        overallSuccess: true,
        hasCriticalFailures: false,
        criticalFailures: []
      };
    }

    // Apply custom context modifiers if provided
    const customContext = context.customContext;
    let contextModifiers = [];
    let environmentalFeatures = [];
    let npcs = [];
    
    if (customContext) {
      // Add environmental features from context
      if (customContext.environmentalFeatures) {
        environmentalFeatures = customContext.environmentalFeatures;
        contextModifiers.push(`Environmental features: ${environmentalFeatures.join(', ')}`);
      }
      
      // Add NPCs from context
      if (customContext.npcs) {
        npcs = customContext.npcs;
        contextModifiers.push(`NPCs present: ${npcs.map(npc => npc.name).join(', ')}`);
      }
      
      // Add circumstances from context
      if (customContext.circumstances) {
        contextModifiers.push(`Circumstances: ${customContext.circumstances.join(', ')}`);
      }
    }

    // Check each action with fatigue penalties for multiple actions
    const actionChecks = detectedActions.map((action, index) => {
      // Apply fatigue penalty for multiple actions (each action after the first gets harder)
      const fatiguePenalty = Math.max(0, index * 2); // +2 DC for each additional action
      
      // Combine original circumstances with custom context
      const baseCircumstances = [...action.circumstances];
      if (fatiguePenalty > 0) {
        baseCircumstances.push(`while fatigued (action ${index + 1} of ${detectedActions.length})`);
      }
      
      // Add environmental features as circumstances
      environmentalFeatures.forEach(feature => {
        if (!baseCircumstances.includes(feature)) {
          baseCircumstances.push(feature);
        }
      });
      
      // Add custom circumstances
      if (customContext && customContext.circumstances) {
        customContext.circumstances.forEach(circumstance => {
          if (!baseCircumstances.includes(circumstance)) {
            baseCircumstances.push(circumstance);
          }
        });
      }
      
      const check = this.performSkillCheck(character, action.type, baseCircumstances);
      
      return {
        action: action.type,
        description: action.description,
        check,
        difficulty: this.getDifficultyDescription(check.dc),
        position: action.position || index + 1,
        totalInSequence: action.totalInSequence || detectedActions.length,
        quantity: action.quantity || 1,
        keyword: action.keyword,
        isSequence: action.isSequence || false,
        fatiguePenalty,
        contextModifiers: contextModifiers.length > 0 ? contextModifiers : null
      };
    });

    const overallSuccess = actionChecks.every(check => check.check.isSuccess);
    const criticalFailures = actionChecks.filter(check => check.check.degree === 'critical failure');
    const failures = actionChecks.filter(check => !check.check.isSuccess);

    // Generate summary based on number of actions
    let summary = '';
    if (detectedActions.length === 1) {
      summary = `Single action detected: ${actionChecks[0].description}`;
    } else {
      const actionTypes = [...new Set(actionChecks.map(check => check.action))];
      const totalActions = actionChecks.reduce((sum, check) => sum + check.quantity, 0);
      summary = `Multiple actions detected: ${totalActions} total actions across ${actionTypes.length} different types`;
    }

    // Add context information to summary if available
    if (customContext) {
      summary += ` | Context: ${customContext.description.substring(0, 50)}${customContext.description.length > 50 ? '...' : ''}`;
    }

    return {
      possible: true,
      actions: actionChecks,
      overallSuccess,
      hasCriticalFailures: criticalFailures.length > 0,
      criticalFailures,
      failures,
      totalActions: detectedActions.length,
      summary,
      contextInfo: customContext ? {
        description: customContext.description,
        environmentalFeatures,
        npcs,
        circumstances: customContext.circumstances || []
      } : null,
      suggestion: this.generateActionSuggestion(actionChecks, character)
    };
  }

  // Extract actions from a description
  extractActionsFromDescription(description) {
    const actions = [];
    const lowerDescription = description.toLowerCase();
    
    // First, look for quantity patterns (e.g., "6 backflips", "3 punches")
    const quantityPatterns = [
      /\b(\d+)\s+(backflips?|somersaults?|cartwheels?|jumps?|leaps?|hops?)\b/gi,
      /\b(\d+)\s+(punches?|kicks?|strikes?|attacks?|swings?|slashes?)\b/gi,
      /\b(\d+)\s+(spells?|casts?|magic\s+spells?)\b/gi,
      /\b(\d+)\s+(dodges?|evades?|parries?|blocks?)\b/gi,
      /\b(\d+)\s+(climbs?|scales?|swims?)\b/gi,
      /\b(\d+)\s+(searches?|looks?|examines?)\b/gi,
      /\b(\d+)\s+(persuades?|intimidates?|deceives?)\b/gi
    ];
    
    // Process quantity patterns first
    quantityPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(lowerDescription)) !== null) {
        const quantity = parseInt(match[1]);
        const actionKeyword = match[2];
        
        // Map the keyword to action type
        const actionType = this.mapKeywordToActionType(actionKeyword);
        if (actionType) {
          // Create multiple actions for the quantity
          for (let i = 0; i < quantity; i++) {
            const circumstances = this.extractCircumstances(description);
            actions.push({
              type: actionType,
              description: this.actionTypes[actionType]?.description || `${actionType} action`,
              circumstances,
              keyword: actionKeyword,
              quantity: quantity,
              position: i + 1,
              totalInSequence: quantity
            });
          }
        }
      }
    });
    
    // Then look for individual action keywords (for actions without quantities)
    Object.entries(this.actionTypes).forEach(([actionType, config]) => {
      const keywords = this.getActionKeywords(actionType);
      keywords.forEach(keyword => {
        // Skip if we already found this action type in quantity patterns
        const alreadyFound = actions.some(action => action.type === actionType);
        if (!alreadyFound && lowerDescription.includes(keyword)) {
          // Check if this keyword is part of a quantity pattern we already processed
          const isPartOfQuantity = quantityPatterns.some(pattern => {
            const testPattern = new RegExp(pattern.source.replace(/\\d\+/, '\\d+'), 'gi');
            return testPattern.test(lowerDescription);
          });
          
          if (!isPartOfQuantity) {
            const circumstances = this.extractCircumstances(description);
            actions.push({
              type: actionType,
              description: config.description,
              circumstances,
              keyword,
              quantity: 1,
              position: 1,
              totalInSequence: 1
            });
          }
        }
      });
    });
    
    // Look for action sequences (e.g., "backflip and then punch")
    const sequencePatterns = [
      /\b(backflip|somersault|cartwheel|jump|leap|hop)\s+(?:and\s+then\s+)?(punch|kick|strike|attack|swing|slash)\b/gi,
      /\b(punch|kick|strike|attack|swing|slash)\s+(?:and\s+then\s+)?(backflip|somersault|cartwheel|jump|leap|hop)\b/gi,
      /\b(dodge|evade|parry|block)\s+(?:and\s+then\s+)?(attack|strike|punch|kick)\b/gi,
      /\b(attack|strike|punch|kick)\s+(?:and\s+then\s+)?(dodge|evade|parry|block)\b/gi
    ];
    
    sequencePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(lowerDescription)) !== null) {
        const action1 = this.mapKeywordToActionType(match[1]);
        const action2 = this.mapKeywordToActionType(match[2]);
        
        if (action1 && action2) {
          const circumstances = this.extractCircumstances(description);
          
          // Add first action if not already present
          if (!actions.some(a => a.type === action1 && a.keyword === match[1])) {
            actions.push({
              type: action1,
              description: this.actionTypes[action1]?.description || `${action1} action`,
              circumstances,
              keyword: match[1],
              quantity: 1,
              position: 1,
              totalInSequence: 2,
              isSequence: true
            });
          }
          
          // Add second action if not already present
          if (!actions.some(a => a.type === action2 && a.keyword === match[2])) {
            actions.push({
              type: action2,
              description: this.actionTypes[action2]?.description || `${action2} action`,
              circumstances,
              keyword: match[2],
              quantity: 1,
              position: 2,
              totalInSequence: 2,
              isSequence: true
            });
          }
        }
      }
    });
    
    // Look for "and" patterns (e.g., "backflip and punch")
    const andPattern = /\b(\w+)\s+and\s+(\w+)\b/gi;
    let andMatch;
    while ((andMatch = andPattern.exec(lowerDescription)) !== null) {
      const action1 = this.mapKeywordToActionType(andMatch[1]);
      const action2 = this.mapKeywordToActionType(andMatch[2]);
      
      if (action1 && action2) {
        const circumstances = this.extractCircumstances(description);
        
        // Add first action if not already present
        if (!actions.some(a => a.type === action1 && a.keyword === andMatch[1])) {
          actions.push({
            type: action1,
            description: this.actionTypes[action1]?.description || `${action1} action`,
            circumstances,
            keyword: andMatch[1],
            quantity: 1,
            position: 1,
            totalInSequence: 2,
            isSequence: true
          });
        }
        
        // Add second action if not already present
        if (!actions.some(a => a.type === action2 && a.keyword === andMatch[2])) {
          actions.push({
            type: action2,
            description: this.actionTypes[action2]?.description || `${action2} action`,
            circumstances,
            keyword: andMatch[2],
            quantity: 1,
            position: 2,
            totalInSequence: 2,
            isSequence: true
          });
        }
      }
    }
    
    return actions;
  }

  // Helper method to map keywords to action types
  mapKeywordToActionType(keyword) {
    const keywordMap = {
      // Combat actions
      'punch': 'attack',
      'punches': 'attack',
      'kick': 'attack',
      'kicks': 'attack',
      'strike': 'attack',
      'strikes': 'attack',
      'attack': 'attack',
      'attacks': 'attack',
      'swing': 'attack',
      'swings': 'attack',
      'slash': 'attack',
      'slashes': 'attack',
      'thrust': 'attack',
      'thrusts': 'attack',
      
      // Acrobatic actions
      'backflip': 'backflip',
      'backflips': 'backflip',
      'somersault': 'somersault',
      'somersaults': 'somersault',
      'cartwheel': 'cartwheel',
      'cartwheels': 'cartwheel',
      
      // Movement actions
      'jump': 'jump',
      'jumps': 'jump',
      'leap': 'jump',
      'leaps': 'jump',
      'hop': 'jump',
      'hops': 'jump',
      'climb': 'climb',
      'climbs': 'climb',
      'scale': 'climb',
      'scales': 'climb',
      'swim': 'swim',
      'swims': 'swim',
      
      // Defensive actions
      'dodge': 'dodge',
      'dodges': 'dodge',
      'evade': 'dodge',
      'evades': 'dodge',
      'parry': 'parry',
      'parries': 'parry',
      'block': 'parry',
      'blocks': 'parry',
      
      // Magic actions
      'spell': 'spell',
      'spells': 'spell',
      'cast': 'spell',
      'casts': 'spell',
      'magic spell': 'spell',
      'magic spells': 'spell',
      
      // Social actions
      'persuade': 'persuade',
      'persuades': 'persuade',
      'intimidate': 'intimidate',
      'intimidates': 'intimidate',
      'deceive': 'deceive',
      'deceives': 'deceive',
      
      // Perception actions
      'search': 'search',
      'searches': 'search',
      'look': 'search',
      'looks': 'search',
      'examine': 'search',
      'examines': 'search'
    };
    
    return keywordMap[keyword.toLowerCase()];
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

  // Perform multiple skill checks with fatigue penalties
  performMultipleSkillChecks(character, actionType, numberOfAttempts, circumstances = [], targetDC = null) {
    const results = [];
    let cumulativeFatigue = 0;
    const fatiguePenalty = 1; // -1 to rolls for each consecutive attempt
    
    for (let attempt = 1; attempt <= numberOfAttempts; attempt++) {
      // Apply fatigue penalty for repeated attempts
      const fatigueModifier = cumulativeFatigue * fatiguePenalty;
      
      // Create a copy of circumstances with fatigue
      const attemptCircumstances = [...circumstances];
      if (cumulativeFatigue > 0) {
        attemptCircumstances.push(`while fatigued (attempt ${attempt})`);
      }
      
      // Perform the skill check
      const check = this.performSkillCheck(character, actionType, attemptCircumstances, targetDC);
      
      // Add attempt-specific information
      const attemptResult = {
        ...check,
        attemptNumber: attempt,
        fatigueLevel: cumulativeFatigue,
        fatiguePenalty: fatigueModifier,
        adjustedTotalRoll: check.totalRoll - fatigueModifier,
        adjustedMargin: (check.totalRoll - fatigueModifier) - check.dc,
        adjustedSuccess: (check.totalRoll - fatigueModifier) >= check.dc
      };
      
      results.push(attemptResult);
      
      // Increase fatigue for next attempt
      cumulativeFatigue++;
    }
    
    // Calculate overall statistics
    const successfulAttempts = results.filter(r => r.adjustedSuccess).length;
    const criticalSuccesses = results.filter(r => r.adjustedSuccess && r.adjustedMargin >= 10).length;
    const criticalFailures = results.filter(r => !r.adjustedSuccess && r.adjustedMargin <= -10).length;
    const successRate = (successfulAttempts / numberOfAttempts) * 100;
    
    return {
      actionType,
      numberOfAttempts,
      results,
      statistics: {
        successfulAttempts,
        criticalSuccesses,
        criticalFailures,
        successRate,
        averageRoll: results.reduce((sum, r) => sum + r.roll, 0) / numberOfAttempts,
        averageTotalRoll: results.reduce((sum, r) => sum + r.adjustedTotalRoll, 0) / numberOfAttempts,
        bestRoll: Math.max(...results.map(r => r.adjustedTotalRoll)),
        worstRoll: Math.min(...results.map(r => r.adjustedTotalRoll))
      },
      character: {
        name: character.name,
        level: character.level,
        [this.actionTypes[actionType]?.primaryAbility]: character[this.actionTypes[actionType]?.primaryAbility],
        [this.actionTypes[actionType]?.secondaryAbility]: character[this.actionTypes[actionType]?.secondaryAbility]
      }
    };
  }

  // Perform multiple dice rolls with statistics
  performMultipleDiceRolls(numberOfRolls, sides, rollType = 'standard') {
    const results = [];
    
    for (let roll = 1; roll <= numberOfRolls; roll++) {
      let result;
      
      switch (rollType) {
        case 'advantage':
          result = this.rollWithAdvantage();
          break;
        case 'disadvantage':
          result = this.rollWithDisadvantage();
          break;
        default:
          result = {
            result: this.rollDie(sides),
            rolls: [this.rollDie(sides)],
            advantage: false,
            disadvantage: false
          };
      }
      
      results.push({
        ...result,
        rollNumber: roll,
        sides: sides
      });
    }
    
    // Calculate statistics
    const values = results.map(r => r.result);
    const average = values.reduce((sum, val) => sum + val, 0) / numberOfRolls;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    return {
      numberOfRolls,
      sides,
      rollType,
      results,
      statistics: {
        average,
        max,
        min,
        total: values.reduce((sum, val) => sum + val, 0),
        natural20s: values.filter(v => v === 20).length,
        natural1s: values.filter(v => v === 1).length
      }
    };
  }

  // Generate narrative for multiple attempts
  generateMultipleAttemptsNarrative(multipleResults, character) {
    const { actionType, numberOfAttempts, statistics } = multipleResults;
    const action = this.actionTypes[actionType];
    
    if (!action) {
      return `${character.name} attempts ${actionType} ${numberOfAttempts} times.`;
    }
    
    const successRate = statistics.successRate;
    const criticalSuccesses = statistics.criticalSuccesses;
    const criticalFailures = statistics.criticalFailures;
    
    let narrative = `${character.name} attempts to ${action.description} ${numberOfAttempts} times. `;
    
    if (successRate >= 80) {
      narrative += `They perform exceptionally well, succeeding ${statistics.successfulAttempts} out of ${numberOfAttempts} attempts.`;
    } else if (successRate >= 60) {
      narrative += `They perform well, succeeding ${statistics.successfulAttempts} out of ${numberOfAttempts} attempts.`;
    } else if (successRate >= 40) {
      narrative += `They have mixed results, succeeding ${statistics.successfulAttempts} out of ${numberOfAttempts} attempts.`;
    } else if (successRate >= 20) {
      narrative += `They struggle, only succeeding ${statistics.successfulAttempts} out of ${numberOfAttempts} attempts.`;
    } else {
      narrative += `They perform poorly, only succeeding ${statistics.successfulAttempts} out of ${numberOfAttempts} attempts.`;
    }
    
    if (criticalSuccesses > 0) {
      narrative += ` They achieve ${criticalSuccesses} spectacular successes!`;
    }
    
    if (criticalFailures > 0) {
      narrative += ` They suffer ${criticalFailures} embarrassing failures.`;
    }
    
    if (numberOfAttempts > 10) {
      narrative += ` The repeated attempts take their toll, and fatigue begins to set in.`;
    }
    
    return narrative;
  }
}

export default DiceRollingService; 