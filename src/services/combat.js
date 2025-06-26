// Enhanced Combat Service with Pokemon-style mechanics
// Handles turn-based combat with story integration, status effects, and narrative actions

export class CombatService {
  constructor() {
    this.actionTypes = {
      attack: { 
        name: 'Attack', 
        cooldown: 0, 
        priority: 'normal',
        description: 'A basic physical attack',
        narrativeTemplate: '{character} {action} with {weapon}!'
      },
      spell: { 
        name: 'Cast Spell', 
        cooldown: 1, 
        priority: 'normal',
        description: 'Cast a magical spell',
        narrativeTemplate: '{character} channels arcane energy into {spell}!'
      },
      special: { 
        name: 'Special Ability', 
        cooldown: 2, 
        priority: 'high',
        description: 'Use a special class ability',
        narrativeTemplate: '{character} unleashes their {ability}!'
      },
      item: { 
        name: 'Use Item', 
        cooldown: 0, 
        priority: 'low',
        description: 'Use an item or consumable',
        narrativeTemplate: '{character} uses {item}!'
      },
      defend: { 
        name: 'Defend', 
        cooldown: 0, 
        priority: 'high',
        description: 'Take a defensive stance',
        narrativeTemplate: '{character} takes a defensive stance!'
      },
      environmental: {
        name: 'Environmental Action',
        cooldown: 1,
        priority: 'normal',
        description: 'Use the environment to your advantage',
        narrativeTemplate: '{character} uses the {environment} to their advantage!'
      },
      teamUp: {
        name: 'Team Up',
        cooldown: 3,
        priority: 'high',
        description: 'Coordinate with another party member',
        narrativeTemplate: '{character} coordinates with {ally} for a powerful combination!'
      }
    };

    this.statusEffects = {
      poisoned: {
        name: 'Poisoned',
        duration: 3,
        effect: 'lose 1 HP per turn',
        narrative: 'is suffering from poison'
      },
      burned: {
        name: 'Burned',
        duration: 2,
        effect: 'lose 2 HP per turn',
        narrative: 'is burning with magical flames'
      },
      frozen: {
        name: 'Frozen',
        duration: 1,
        effect: 'skip next turn',
        narrative: 'is frozen solid'
      },
      paralyzed: {
        name: 'Paralyzed',
        duration: 2,
        effect: '50% chance to skip turn',
        narrative: 'is paralyzed and can barely move'
      },
      confused: {
        name: 'Confused',
        duration: 2,
        effect: 'may attack randomly',
        narrative: 'is confused and disoriented'
      },
      blessed: {
        name: 'Blessed',
        duration: 3,
        effect: '+2 to attack rolls',
        narrative: 'is blessed with divine favor'
      },
      hasted: {
        name: 'Hasted',
        duration: 2,
        effect: 'extra action per turn',
        narrative: 'is moving with supernatural speed'
      }
    };

    this.classAbilities = {
      fighter: {
        name: 'Second Wind',
        description: 'Recover some HP',
        effect: 'heal 1d6+2 HP',
        cooldown: 3
      },
      wizard: {
        name: 'Arcane Surge',
        description: 'Enhance next spell',
        effect: '+2 to spell damage',
        cooldown: 2
      },
      rogue: {
        name: 'Sneak Attack',
        description: 'Deal extra damage from stealth',
        effect: '+1d6 damage if target is unaware',
        cooldown: 1
      },
      cleric: {
        name: 'Divine Favor',
        description: 'Bless an ally',
        effect: 'target gets +1 to all rolls',
        cooldown: 2
      }
    };
  }

  // Initialize combat session with Pokemon-style mechanics
  initializeCombat(partyMembers, enemies, storyContext) {
    const allCombatants = [...partyMembers, ...enemies];
    
    // Calculate initiative with modifiers
    const initiativeOrder = allCombatants.map(combatant => ({
      ...combatant,
      initiative: this.calculateInitiative(combatant),
      statusEffects: [],
      cooldowns: {},
      lastAction: null,
      turnCount: 0
    })).sort((a, b) => b.initiative - a.initiative);

    return {
      combatants: initiativeOrder,
      currentTurn: 0,
      round: 1,
      phase: 'preparation',
      storyContext: storyContext,
      environmentalFeatures: this.extractEnvironmentalFeatures(storyContext),
      teamUpOpportunities: this.identifyTeamUpOpportunities(partyMembers),
      narrativeElements: this.extractNarrativeElements(storyContext)
    };
  }

  // Calculate initiative with class and status modifiers
  calculateInitiative(combatant) {
    let initiative = Math.floor(Math.random() * 20) + 1;
    
    // Class-based modifiers
    const classModifiers = {
      rogue: 3,
      monk: 2,
      ranger: 1,
      fighter: 0,
      cleric: 0,
      wizard: -1,
      paladin: -1
    };
    
    initiative += classModifiers[combatant.class?.toLowerCase()] || 0;
    
    // Status effect modifiers
    if (combatant.statusEffects?.includes('hasted')) {
      initiative += 5;
    }
    if (combatant.statusEffects?.includes('paralyzed')) {
      initiative -= 3;
    }
    
    return initiative;
  }

  // Extract environmental features from story context
  extractEnvironmentalFeatures(storyContext) {
    const features = [];
    
    const environmentalKeywords = {
      'forest': ['trees', 'cover', 'difficult terrain'],
      'cave': ['darkness', 'echoes', 'tight spaces'],
      'tavern': ['furniture', 'crowds', 'flammable materials'],
      'castle': ['stone walls', 'narrow corridors', 'defensive positions'],
      'dungeon': ['traps', 'darkness', 'confined spaces'],
      'outdoors': ['weather', 'open space', 'natural cover']
    };

    const contextLower = storyContext.toLowerCase();
    
    Object.entries(environmentalKeywords).forEach(([location, featureList]) => {
      if (contextLower.includes(location)) {
        features.push(...featureList);
      }
    });

    return features;
  }

  // Identify team-up opportunities between party members
  identifyTeamUpOpportunities(partyMembers) {
    const opportunities = [];
    
    // Class-based synergies
    const synergies = [
      { classes: ['fighter', 'rogue'], description: 'Fighter distracts while Rogue sneaks in for a backstab' },
      { classes: ['wizard', 'cleric'], description: 'Wizard casts area spell while Cleric protects the party' },
      { classes: ['fighter', 'cleric'], description: 'Fighter tanks while Cleric provides healing support' },
      { classes: ['rogue', 'wizard'], description: 'Rogue scouts while Wizard provides magical backup' }
    ];

    synergies.forEach(synergy => {
      const hasClasses = synergy.classes.every(className => 
        partyMembers.some(member => member.class?.toLowerCase() === className)
      );
      
      if (hasClasses) {
        opportunities.push(synergy);
      }
    });

    return opportunities;
  }

  // Extract narrative elements from story context
  extractNarrativeElements(storyContext) {
    return {
      mood: this.determineCombatMood(storyContext),
      stakes: this.determineStakes(storyContext),
      environmentalHazards: this.identifyHazards(storyContext),
      npcInvolvement: this.extractNPCs(storyContext)
    };
  }

  // Determine combat mood from story context
  determineCombatMood(storyContext) {
    const contextLower = storyContext.toLowerCase();
    
    if (contextLower.includes('desperate') || contextLower.includes('last stand')) {
      return 'desperate';
    } else if (contextLower.includes('training') || contextLower.includes('practice')) {
      return 'casual';
    } else if (contextLower.includes('revenge') || contextLower.includes('vengeance')) {
      return 'vengeful';
    } else if (contextLower.includes('defense') || contextLower.includes('protect')) {
      return 'defensive';
    }
    
    return 'standard';
  }

  // Determine stakes from story context
  determineStakes(storyContext) {
    const contextLower = storyContext.toLowerCase();
    
    if (contextLower.includes('life') || contextLower.includes('death') || contextLower.includes('kill')) {
      return 'life_or_death';
    } else if (contextLower.includes('escape') || contextLower.includes('flee')) {
      return 'escape';
    } else if (contextLower.includes('capture') || contextLower.includes('arrest')) {
      return 'capture';
    } else if (contextLower.includes('treasure') || contextLower.includes('loot')) {
      return 'treasure';
    }
    
    return 'standard';
  }

  // Identify environmental hazards
  identifyHazards(storyContext) {
    const hazards = [];
    const contextLower = storyContext.toLowerCase();
    
    if (contextLower.includes('fire') || contextLower.includes('flame')) {
      hazards.push('fire');
    }
    if (contextLower.includes('water') || contextLower.includes('river') || contextLower.includes('lake')) {
      hazards.push('water');
    }
    if (contextLower.includes('height') || contextLower.includes('cliff') || contextLower.includes('fall')) {
      hazards.push('height');
    }
    if (contextLower.includes('trap') || contextLower.includes('pit')) {
      hazards.push('traps');
    }
    
    return hazards;
  }

  // Extract NPCs from story context
  extractNPCs(storyContext) {
    const npcs = [];
    const npcPatterns = [
      /(\w+)\s+(?:the\s+)?(?:guard|merchant|wizard|knight|rogue|priest)/gi,
      /(?:named|called)\s+(\w+)/gi
    ];
    
    npcPatterns.forEach(pattern => {
      const matches = [...storyContext.matchAll(pattern)];
      matches.forEach(match => {
        npcs.push(match[1]);
      });
    });
    
    return npcs;
  }

  // Execute a combat action with narrative description
  async executeAction(combatSession, combatantId, actionType, targetId, additionalData = {}) {
    const combatant = combatSession.combatants.find(c => c.id === combatantId);
    const target = combatSession.combatants.find(c => c.id === targetId);
    
    if (!combatant || !target) {
      throw new Error('Invalid combatant or target');
    }

    // Check cooldowns
    if (combatant.cooldowns[actionType] > 0) {
      return {
        success: false,
        message: `${combatant.name} cannot use ${actionType} yet (cooldown: ${combatant.cooldowns[actionType]} turns)`
      };
    }

    // Generate narrative description
    const narrative = this.generateActionNarrative(combatant, actionType, target, additionalData);
    
    // Calculate action results
    const results = this.calculateActionResults(combatant, actionType, target, additionalData);
    
    // Apply effects
    this.applyActionEffects(combatSession, combatant, target, results);
    
    // Update cooldowns
    this.updateCooldowns(combatSession, combatant, actionType);
    
    // Check for status effect applications
    const statusEffects = this.checkStatusEffectApplication(combatant, actionType, target, results);
    
    return {
      success: true,
      narrative: narrative,
      results: results,
      statusEffects: statusEffects,
      environmentalImpact: this.calculateEnvironmentalImpact(combatSession, actionType, results)
    };
  }

  // Generate narrative description for an action
  generateActionNarrative(combatant, actionType, target, additionalData) {
    const actionConfig = this.actionTypes[actionType];
    let narrative = actionConfig.narrativeTemplate;
    
    // Replace placeholders
    narrative = narrative.replace('{character}', combatant.name);
    narrative = narrative.replace('{action}', this.getActionVerb(actionType, combatant.class));
    narrative = narrative.replace('{weapon}', additionalData.weapon || 'their weapon');
    narrative = narrative.replace('{spell}', additionalData.spell || 'a spell');
    narrative = narrative.replace('{ability}', additionalData.ability || 'special ability');
    narrative = narrative.replace('{item}', additionalData.item || 'an item');
    narrative = narrative.replace('{environment}', additionalData.environment || 'surroundings');
    narrative = narrative.replace('{ally}', additionalData.ally || 'ally');
    
    // Add class-specific flavor
    const classFlavor = this.getClassFlavor(combatant.class, actionType);
    if (classFlavor) {
      narrative += ` ${classFlavor}`;
    }
    
    return narrative;
  }

  // Get action verb based on class
  getActionVerb(actionType, characterClass) {
    const classVerbs = {
      fighter: {
        attack: 'charges forward with a mighty swing',
        defend: 'raises their shield defensively',
        special: 'unleashes their combat expertise'
      },
      wizard: {
        attack: 'casts a magical bolt',
        spell: 'weaves arcane energy',
        special: 'channels pure magical power'
      },
      rogue: {
        attack: 'strikes from the shadows',
        defend: 'dodges and weaves',
        special: 'executes a perfect sneak attack'
      },
      cleric: {
        attack: 'calls upon divine power',
        spell: 'prays for divine intervention',
        special: 'channels holy energy'
      }
    };
    
    return classVerbs[characterClass?.toLowerCase()]?.[actionType] || 'performs an action';
  }

  // Get class-specific flavor text
  getClassFlavor(characterClass, actionType) {
    const flavorTexts = {
      fighter: {
        attack: 'The force of the blow echoes through the battlefield.',
        defend: 'Their stance is unbreakable.',
        special: 'Years of training show in their precision.'
      },
      wizard: {
        attack: 'Arcane energy crackles in the air.',
        spell: 'The very fabric of reality seems to bend.',
        special: 'Ancient knowledge flows through their mind.'
      },
      rogue: {
        attack: 'The strike is almost too fast to see.',
        defend: 'They seem to flow around the attack.',
        special: 'Perfect timing and deadly precision.'
      },
      cleric: {
        attack: 'Divine light illuminates the area.',
        spell: 'The gods themselves seem to answer.',
        special: 'Holy power radiates from their form.'
      }
    };
    
    return flavorTexts[characterClass?.toLowerCase()]?.[actionType] || '';
  }

  // Calculate action results
  calculateActionResults(combatant, actionType, target, additionalData) {
    const results = {
      damage: 0,
      healing: 0,
      statusEffects: [],
      environmentalEffects: [],
      narrative: ''
    };

    switch (actionType) {
      case 'attack':
        results.damage = this.calculateAttackDamage(combatant, target, additionalData);
        break;
      case 'spell':
        results.damage = this.calculateSpellDamage(combatant, target, additionalData);
        break;
      case 'special':
        results.damage = this.calculateSpecialDamage(combatant, target, additionalData);
        break;
      case 'item':
        results.healing = this.calculateItemEffect(combatant, target, additionalData);
        break;
      case 'defend':
        results.statusEffects.push({ type: 'defensive', duration: 1 });
        break;
      case 'environmental':
        results.environmentalEffects = this.calculateEnvironmentalEffects(combatant, target, additionalData);
        break;
      case 'teamUp':
        results.damage = this.calculateTeamUpDamage(combatant, target, additionalData);
        break;
    }

    return results;
  }

  // Calculate attack damage with enhanced enemy scaling
  calculateAttackDamage(combatant, target, additionalData) {
    const baseDamage = Math.floor(Math.random() * 8) + 1;
    const strengthMod = Math.floor((combatant.strength - 10) / 2);
    const weaponBonus = additionalData.weaponBonus || 0;
    
    // Enhanced scaling for enemies based on level and attributes
    let levelScaling = 1;
    if (combatant.id.startsWith('enemy_')) {
      levelScaling = 1 + (combatant.level - 1) * 0.3; // 30% increase per level
      
      // Attribute scaling for enemies
      const primaryAttribute = this.getEnemyPrimaryAttribute(combatant.class);
      const attributeMod = Math.floor((combatant[primaryAttribute] - 10) / 2);
      
      // Item bonuses for enemies
      const itemBonus = this.calculateEnemyItemBonus(combatant);
      
      let totalDamage = (baseDamage + strengthMod + weaponBonus + attributeMod + itemBonus) * levelScaling;
      
      // Critical hit (natural 20)
      if (Math.floor(Math.random() * 20) + 1 === 20) {
        totalDamage *= 2;
      }
      
      console.log(`Enemy damage calculation for ${combatant.name}:`, {
        baseDamage,
        strengthMod,
        weaponBonus,
        attributeMod,
        itemBonus,
        levelScaling,
        totalDamage: Math.max(1, Math.floor(totalDamage))
      });
      
      return Math.max(1, Math.floor(totalDamage));
    } else {
      // Enhanced player damage calculation
      const dexterityMod = Math.floor((combatant.dexterity - 10) / 2);
      const levelBonus = Math.floor((combatant.level - 1) * 0.5); // +0.5 damage per level
      
      let totalDamage = baseDamage + strengthMod + dexterityMod + weaponBonus + levelBonus;
      
      // Critical hit (natural 20)
      if (Math.floor(Math.random() * 20) + 1 === 20) {
        totalDamage *= 2;
      }
      
      console.log(`Player damage calculation for ${combatant.name}:`, {
        baseDamage,
        strengthMod,
        dexterityMod,
        weaponBonus,
        levelBonus,
        totalDamage: Math.max(1, totalDamage)
      });
      
      return Math.max(1, totalDamage);
    }
  }

  // Get primary attribute for enemy class
  getEnemyPrimaryAttribute(enemyClass) {
    const attributeMap = {
      'Warrior': 'strength',
      'Archer': 'dexterity',
      'Mage': 'intelligence',
      'Cleric': 'wisdom',
      'Rogue': 'dexterity',
      'Paladin': 'strength',
      'Ranger': 'dexterity',
      'Wizard': 'intelligence',
      'Fighter': 'strength'
    };
    
    return attributeMap[enemyClass] || 'strength';
  }

  // Calculate item bonuses for enemies
  calculateEnemyItemBonus(enemy) {
    let bonus = 0;
    
    // Enemy equipment bonuses
    if (enemy.equipment) {
      if (enemy.equipment.weapon) {
        bonus += enemy.equipment.weapon.damageBonus || 0;
      }
      if (enemy.equipment.armor) {
        bonus += enemy.equipment.armor.defenseBonus || 0;
      }
      if (enemy.equipment.accessory) {
        bonus += enemy.equipment.accessory.bonus || 0;
      }
    }
    
    // Level-based item scaling
    if (enemy.level > 3) {
      bonus += Math.floor((enemy.level - 3) / 2); // +1 bonus every 2 levels after level 3
    }
    
    return bonus;
  }

  // Calculate spell damage
  calculateSpellDamage(combatant, target, additionalData) {
    const baseDamage = Math.floor(Math.random() * 6) + 1;
    const intelligenceMod = Math.floor((combatant.intelligence - 10) / 2);
    const spellLevel = additionalData.spellLevel || 1;
    
    // Enhanced scaling for enemy spellcasters
    if (combatant.id.startsWith('enemy_')) {
      const levelScaling = 1 + (combatant.level - 1) * 0.4; // 40% increase per level for spells
      const wisdomMod = Math.floor((combatant.wisdom - 10) / 2);
      const itemBonus = this.calculateEnemyItemBonus(combatant);
      
      let totalDamage = (baseDamage + intelligenceMod + wisdomMod + spellLevel + itemBonus) * levelScaling;
      
      // Critical spell hit (natural 19-20)
      if (Math.floor(Math.random() * 20) + 1 >= 19) {
        totalDamage *= 1.5;
      }
      
      return Math.max(1, Math.floor(totalDamage));
    } else {
      return Math.max(1, baseDamage + intelligenceMod + spellLevel);
    }
  }

  // Calculate special ability damage
  calculateSpecialDamage(combatant, target, additionalData) {
    const classAbility = this.classAbilities[combatant.class?.toLowerCase()];
    if (!classAbility) return 0;
    
    const baseDamage = Math.floor(Math.random() * 10) + 2;
    const classMod = Math.floor((combatant.level || 1) / 2);
    
    return Math.max(1, baseDamage + classMod);
  }

  // Calculate item effects
  calculateItemEffect(combatant, target, additionalData) {
    const itemType = additionalData.itemType || 'potion';
    
    switch (itemType) {
      case 'healing':
        return Math.floor(Math.random() * 8) + 2;
      case 'antidote':
        return 0; // Removes poison
      case 'blessing':
        return 0; // Adds blessing status
      default:
        return Math.floor(Math.random() * 4) + 1;
    }
  }

  // Calculate team-up damage
  calculateTeamUpDamage(combatant, target, additionalData) {
    const baseDamage = Math.floor(Math.random() * 12) + 3;
    const coordinationBonus = 2;
    
    return Math.max(1, baseDamage + coordinationBonus);
  }

  // Apply action effects
  applyActionEffects(combatSession, combatant, target, results) {
    // Apply damage
    if (results.damage > 0) {
      target.hp = Math.max(0, target.hp - results.damage);
    }
    
    // Apply healing
    if (results.healing > 0) {
      target.hp = Math.min(target.maxHp, target.hp + results.healing);
    }
    
    // Apply status effects
    results.statusEffects.forEach(effect => {
      if (!target.statusEffects.includes(effect.type)) {
        target.statusEffects.push({
          type: effect.type,
          duration: effect.duration,
          appliedBy: combatant.id
        });
      }
    });
  }

  // Update cooldowns
  updateCooldowns(combatSession, combatant, actionType) {
    const actionConfig = this.actionTypes[actionType];
    
    // Set cooldown for this action
    combatant.cooldowns[actionType] = actionConfig.cooldown;
    
    // Reduce other cooldowns
    Object.keys(combatant.cooldowns).forEach(key => {
      if (key !== actionType && combatant.cooldowns[key] > 0) {
        combatant.cooldowns[key]--;
      }
    });
  }

  // Check for status effect application
  checkStatusEffectApplication(combatant, actionType, target, results) {
    const statusEffects = [];
    
    // Critical hits might apply status effects
    if (results.damage > 10) {
      const possibleEffects = ['stunned', 'bleeding'];
      const randomEffect = possibleEffects[Math.floor(Math.random() * possibleEffects.length)];
      
      if (!target.statusEffects.some(e => e.type === randomEffect)) {
        statusEffects.push({
          type: randomEffect,
          duration: 1,
          appliedBy: combatant.id
        });
      }
    }
    
    return statusEffects;
  }

  // Calculate environmental impact
  calculateEnvironmentalImpact(combatSession, actionType, results) {
    const impacts = [];
    
    if (actionType === 'spell' && results.damage > 8) {
      impacts.push('The magical energy disturbs the environment');
    }
    
    if (actionType === 'environmental') {
      impacts.push('The environment responds to the action');
    }
    
    return impacts;
  }

  // Process status effects at the start of a turn
  processStatusEffects(combatSession, combatant) {
    const effects = [];
    
    combatant.statusEffects.forEach((effect, index) => {
      effect.duration--;
      
      // Apply effect
      switch (effect.type) {
        case 'poisoned':
          combatant.hp = Math.max(0, combatant.hp - 1);
          effects.push(`${combatant.name} takes 1 poison damage`);
          break;
        case 'burned':
          combatant.hp = Math.max(0, combatant.hp - 2);
          effects.push(`${combatant.name} takes 2 burn damage`);
          break;
        case 'frozen':
          effects.push(`${combatant.name} is frozen and cannot act`);
          break;
        case 'paralyzed':
          if (Math.random() < 0.5) {
            effects.push(`${combatant.name} is paralyzed and cannot act`);
          }
          break;
        case 'blessed':
          effects.push(`${combatant.name} is blessed with divine favor`);
          break;
        case 'hasted':
          effects.push(`${combatant.name} moves with supernatural speed`);
          break;
      }
      
      // Remove expired effects
      if (effect.duration <= 0) {
        combatant.statusEffects.splice(index, 1);
        effects.push(`${combatant.name} is no longer ${effect.type}`);
      }
    });
    
    return effects;
  }

  // Check for combat end conditions
  checkCombatEnd(combatSession) {
    const partyMembers = combatSession.combatants.filter(c => !c.id.startsWith('enemy_'));
    const enemies = combatSession.combatants.filter(c => c.id.startsWith('enemy_'));
    
    const partyAlive = partyMembers.some(member => member.hp > 0);
    const enemiesAlive = enemies.some(enemy => enemy.hp > 0);
    
    if (!partyAlive) {
      return { ended: true, result: 'defeat', narrative: 'The party has been defeated...' };
    }
    
    if (!enemiesAlive) {
      return { ended: true, result: 'victory', narrative: 'The enemies have been defeated!' };
    }
    
    return { ended: false };
  }

  // Generate combat summary
  generateCombatSummary(combatSession, result) {
    const summary = {
      result: result,
      duration: combatSession.round,
      participants: combatSession.combatants.map(c => ({
        name: c.name,
        finalHp: c.hp,
        actions: c.turnCount,
        statusEffects: c.statusEffects.length
      })),
      narrative: this.generateCombatNarrative(combatSession, result)
    };
    
    return summary;
  }

  // Generate narrative summary of the combat
  generateCombatNarrative(combatSession, result) {
    const partyMembers = combatSession.combatants.filter(c => !c.id.startsWith('enemy_'));
    const enemies = combatSession.combatants.filter(c => c.id.startsWith('enemy_'));
    
    if (result === 'victory') {
      return `The party emerges victorious from the battle. ${partyMembers.map(m => m.name).join(', ')} stand triumphant over their fallen foes.`;
    } else if (result === 'defeat') {
      return `The battle ends in defeat. The party has been overwhelmed by their enemies.`;
    } else {
      return `The battle ends in a draw, with both sides withdrawing to regroup.`;
    }
  }

  // Enemy AI decision making
  chooseEnemyAction(enemy, combatSession) {
    const availableActions = this.getEnemyAvailableActions(enemy, combatSession);
    const validTargets = this.getEnemyValidTargets(enemy, combatSession);
    
    if (availableActions.length === 0 || validTargets.length === 0) {
      return { action: 'defend', target: null };
    }
    
    // AI decision logic
    const decision = this.makeEnemyDecision(enemy, availableActions, validTargets, combatSession);
    return decision;
  }

  // Get available actions for enemy
  getEnemyAvailableActions(enemy, combatSession) {
    const actions = [];
    const cooldowns = enemy.cooldowns || {};
    
    // Basic actions
    Object.entries(this.actionTypes).forEach(([actionType, config]) => {
      if (cooldowns[actionType] === 0 || cooldowns[actionType] === undefined) {
        actions.push(actionType);
      }
    });
    
    // Class-specific abilities
    if (enemy.class && this.classAbilities[enemy.class.toLowerCase()]) {
      if (cooldowns.special === 0 || cooldowns.special === undefined) {
        actions.push('special');
      }
    }
    
    return actions;
  }

  // Get valid targets for enemy
  getEnemyValidTargets(enemy, combatSession) {
    return combatSession.combatants.filter(combatant => 
      !combatant.id.startsWith('enemy_') && combatant.hp > 0
    );
  }

  // Make enemy decision based on situation
  makeEnemyDecision(enemy, availableActions, validTargets, combatSession) {
    const target = validTargets[Math.floor(Math.random() * validTargets.length)];
    
    // Health-based decision making
    const healthPercentage = enemy.hp / enemy.maxHp;
    
    // If low health, prioritize healing/defense
    if (healthPercentage < 0.3) {
      if (availableActions.includes('item')) {
        return { action: 'item', target: enemy.id, itemType: 'healing' };
      }
      if (availableActions.includes('defend')) {
        return { action: 'defend', target: null };
      }
    }
    
    // If multiple enemies are low health, use area attacks
    const lowHealthAllies = combatSession.combatants.filter(c => 
      c.id.startsWith('enemy_') && c.hp / c.maxHp < 0.5
    );
    
    if (lowHealthAllies.length > 1 && availableActions.includes('spell')) {
      return { action: 'spell', target: target.id, spellType: 'area' };
    }
    
    // Default to attack
    if (availableActions.includes('attack')) {
      return { action: 'attack', target: target.id };
    }
    
    // Fallback to any available action
    const action = availableActions[Math.floor(Math.random() * availableActions.length)];
    return { action, target: target.id };
  }

  // Execute enemy turn automatically
  async executeEnemyTurn(combatSession, enemy) {
    const decision = this.chooseEnemyAction(enemy, combatSession);
    
    if (decision.target) {
      return await this.executeAction(combatSession, enemy.id, decision.action, decision.target, {
        itemType: decision.itemType,
        spellType: decision.spellType
      });
    } else {
      // Defend action
      return await this.executeAction(combatSession, enemy.id, 'defend', enemy.id);
    }
  }
}

export const combatService = new CombatService(); 