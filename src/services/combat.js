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
      combatState: 'active',
      storyContext: storyContext,
      environmentalFeatures: this.extractEnvironmentalFeatures(storyContext),
      teamUpOpportunities: this.identifyTeamUpOpportunities(partyMembers),
      narrativeElements: this.extractNarrativeElements(storyContext)
    };
  }

  // Centralized combat session creation with existing session check
  async createCombatSession(partyId, partyMembers, enemies, storyContext) {
    try {
      // Import database functions dynamically to avoid circular dependencies
      const { createCombatSession: dbCreateCombatSession } = await import('../firebase/database');
      
      // Check for existing active combat session
      const existingSession = await this.getExistingCombatSession(partyId);
      if (existingSession) {
        console.log('🎯 Found existing combat session:', existingSession.id);
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
        combatants: combatSession.combatants, // Add the full combatants array
        initiative: combatSession.combatants.map(c => ({ id: c.id, name: c.name, initiative: c.initiative })),
        currentTurn: combatSession.currentTurn,
        round: combatSession.round,
        combatState: combatSession.combatState,
        environmentalFeatures: combatSession.environmentalFeatures,
        teamUpOpportunities: combatSession.teamUpOpportunities,
        narrativeElements: combatSession.narrativeElements
      });

      console.log('⚔️ Created new combat session:', dbSession.id);
      return dbSession;
    } catch (error) {
      console.error('❌ Error creating combat session:', error);
      throw error;
    }
  }

  // Check for existing combat session
  async getExistingCombatSession(partyId) {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');
      
      const combatSessionsRef = collection(db, 'combatSessions');
      const q = query(
        combatSessionsRef,
        where('partyId', '==', partyId),
        where('status', '==', 'active')
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const existingSession = querySnapshot.docs[0];
        console.log('🎯 Found existing combat session:', existingSession.id);
        return { id: existingSession.id, ...existingSession.data() };
      }
      return null;
    } catch (error) {
      console.error('Error checking for existing combat session:', error);
      return null;
    }
  }

  // Prepare party members with proper stats
  preparePartyMembers(partyMembers) {
    return partyMembers.map(character => {
      // Calculate HP if not present
      let hp = character.hp;
      let maxHp = character.maxHp;
      
      if (!hp || !maxHp) {
        const hitDieSizes = {
          'Barbarian': 12, 'Fighter': 10, 'Paladin': 10, 'Ranger': 10,
          'Cleric': 8, 'Druid': 8, 'Monk': 8, 'Rogue': 8, 'Bard': 8,
          'Sorcerer': 6, 'Warlock': 8, 'Wizard': 6
        };
        
        const hitDie = hitDieSizes[character.class] || 8;
        const constitution = character.assignedScores?.constitution || 10;
        const constitutionMod = Math.floor((constitution - 10) / 2);
        const calculatedHp = Math.max(1, (hitDie + constitutionMod) * (character.level || 1));
        
        hp = calculatedHp;
        maxHp = calculatedHp;
      }
      
      // Calculate AC if not present
      let ac = character.ac;
      if (!ac) {
        const baseAC = 10;
        const dexterity = character.assignedScores?.dexterity || 10;
        const dexterityMod = Math.floor((dexterity - 10) / 2);
        const classACBonuses = {
          'Barbarian': 3, 'Monk': 2, 'Fighter': 4, 'Paladin': 4, 'Cleric': 4,
          'Ranger': 3, 'Rogue': 2, 'Bard': 2, 'Druid': 2, 'Sorcerer': 0,
          'Warlock': 0, 'Wizard': 0
        };
        const classBonus = classACBonuses[character.class] || 0;
        ac = Math.max(10, baseAC + dexterityMod + classBonus);
      }
      
      return {
        ...character,
        hp: hp,
        maxHp: maxHp,
        ac: ac,
        initiative: Math.floor(Math.random() * 20) + 1,
        // Map assignedScores to direct attributes
        strength: character.assignedScores?.strength || 10,
        dexterity: character.assignedScores?.dexterity || 10,
        constitution: character.assignedScores?.constitution || 10,
        intelligence: character.assignedScores?.intelligence || 10,
        wisdom: character.assignedScores?.wisdom || 10,
        charisma: character.assignedScores?.charisma || 10,
        // Add combat-specific properties
        statusEffects: [],
        cooldowns: {},
        lastAction: null,
        turnCount: 0
      };
    });
  }

  // Prepare enemies with proper stats
  prepareEnemies(enemies) {
    if (!enemies || enemies.length === 0) {
      // Fallback enemy details
      return [
        {
          id: 'enemy_0',
          name: 'Gnoll Pack',
          hp: 20,
          maxHp: 20,
          ac: 12,
          level: 1,
          class: 'enemy',
          race: 'unknown',
          initiative: Math.floor(Math.random() * 20) + 1,
          strength: 12,
          dexterity: 10,
          constitution: 12,
          intelligence: 8,
          wisdom: 8,
          charisma: 6
        },
        {
          id: 'enemy_1',
          name: 'Gnoll Pack-Leader',
          hp: 25,
          maxHp: 25,
          ac: 14,
          level: 2,
          class: 'enemy',
          race: 'unknown',
          initiative: Math.floor(Math.random() * 20) + 1,
          strength: 14,
          dexterity: 12,
          constitution: 14,
          intelligence: 10,
          wisdom: 10,
          charisma: 8
        }
      ];
    }

    return enemies.map((enemy, index) => ({
      id: enemy.id || `enemy_${index}`,
      name: enemy.name || `Enemy ${index + 1}`,
      hp: enemy.hp || 20,
      maxHp: enemy.maxHp || enemy.hp || 20,
      ac: enemy.ac || 12,
      level: enemy.level || 1,
      class: enemy.class || 'enemy',
      race: enemy.race || 'unknown',
      initiative: enemy.initiative || Math.floor(Math.random() * 20) + 1,
      strength: enemy.strength || 12,
      dexterity: enemy.dexterity || 10,
      constitution: enemy.constitution || 12,
      intelligence: enemy.intelligence || 8,
      wisdom: enemy.wisdom || 8,
      charisma: enemy.charisma || 6,
      statusEffects: [],
      cooldowns: {},
      lastAction: null,
      turnCount: 0
    }));
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
    console.log('⚔️ executeAction called with:', {
      combatantId,
      actionType,
      targetId,
      additionalData
    });
    
    const combatant = combatSession.combatants.find(c => c.id === combatantId);
    const target = combatSession.combatants.find(c => c.id === targetId);
    
    console.log('⚔️ Found combatant and target:', {
      combatant: combatant ? { name: combatant.name, hp: combatant.hp, maxHp: combatant.maxHp } : null,
      target: target ? { name: target.name, hp: target.hp, maxHp: target.maxHp } : null
    });
    
    if (!combatant || !target) {
      throw new Error('Invalid combatant or target');
    }

    // Check cooldowns
    if (combatant.cooldowns && combatant.cooldowns[actionType] > 0) {
      return {
        success: false,
        message: `${combatant.name} cannot use ${actionType} yet (cooldown: ${combatant.cooldowns[actionType]} turns)`
      };
    }

    // Generate narrative description
    const narrative = this.generateActionNarrative(combatant, actionType, target, additionalData);
    
    // Calculate action results
    const results = this.calculateActionResults(combatant, actionType, target, additionalData);
    console.log('⚔️ Action results calculated:', results);
    
    // Apply effects
    this.applyActionEffects(combatSession, combatant, target, results);
    
    // Update cooldowns
    this.updateCooldowns(combatSession, combatant, actionType);
    
    // Check for status effect applications
    const statusEffects = this.checkStatusEffectApplication(combatant, actionType, target, results);
    
    // Advance turn counter
    let nextTurnIndex = (combatSession.currentTurn + 1) % combatSession.combatants.length;
    let attempts = 0;
    const maxAttempts = combatSession.combatants.length;
    
    // Find the next alive combatant
    while (attempts < maxAttempts) {
      const nextCombatant = combatSession.combatants[nextTurnIndex];
      if (nextCombatant && nextCombatant.hp > 0) {
        break; // Found an alive combatant
      }
      nextTurnIndex = (nextTurnIndex + 1) % combatSession.combatants.length;
      attempts++;
    }
    
    // If no alive combatants found, keep the current turn
    if (attempts >= maxAttempts) {
      console.log('⚠️ No alive combatants found, keeping current turn');
      nextTurnIndex = combatSession.currentTurn;
    }
    
    const updatedSession = {
      ...combatSession,
      currentTurn: nextTurnIndex
    };
    
    // Update round if we've completed a full cycle
    if (nextTurnIndex === 0) {
      updatedSession.round = updatedSession.round + 1;
    }
    
    console.log('🔄 Turn progression in executeAction:', {
      currentTurn: combatSession.currentTurn,
      nextTurnIndex: nextTurnIndex,
      totalCombatants: combatSession.combatants.length,
      nextCombatant: combatSession.combatants[nextTurnIndex]?.name,
      nextCombatantHp: combatSession.combatants[nextTurnIndex]?.hp,
      round: updatedSession.round,
      attempts: attempts
    });
    
    console.log('⚔️ executeAction returning result with damage:', results.damage);
    console.log('⚔️ Target HP after executeAction:', target.hp);
    console.log('⚔️ Updated session currentTurn:', updatedSession.currentTurn);
    
    return {
      success: true,
      narrative: narrative,
      results: results,
      statusEffects: statusEffects,
      environmentalImpact: this.calculateEnvironmentalImpact(combatSession, actionType, results),
      targetId: targetId,
      updatedSession: updatedSession,
      damage: results.damage,
      healing: results.healing
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
    
    // Add special attack information
    if (additionalData.specialAttack && additionalData.specialAttack !== 'Standard Action') {
      narrative = `${combatant.name} uses ${additionalData.specialAttack}! ` + narrative;
    }
    
    // Add damage type information
    if (additionalData.damageType && additionalData.damageType !== 'physical') {
      narrative += ` The attack deals ${additionalData.damageType} damage.`;
    }
    
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
    const classFlavors = {
      'priest': {
        'attack': 'Divine energy crackles around their weapon.',
        'spell': 'Holy light emanates from their hands.',
        'heal': 'A warm, healing glow surrounds them.'
      },
      'wizard': {
        'attack': 'Arcane energy flows through their weapon.',
        'spell': 'Mystical runes appear in the air.',
        'special': 'Ancient magic surges through them.'
      },
      'warrior': {
        'attack': 'Their combat training shows in every move.',
        'special': 'Years of battle experience guide their strike.',
        'defend': 'They adopt a defensive stance with practiced ease.'
      },
      'rogue': {
        'attack': 'They move with deadly precision.',
        'special': 'Shadow and stealth enhance their attack.',
        'defend': 'They dodge and weave with acrobatic grace.'
      },
      'boss': {
        'attack': 'Their overwhelming presence fills the battlefield.',
        'special': 'Ancient power courses through their veins.',
        'spell': 'Reality itself seems to bend to their will.'
      },
      'undead': {
        'attack': 'Necrotic energy pulses from their form.',
        'spell': 'Death magic swirls around them.',
        'special': 'The very air grows cold with their presence.'
      }
    };
    
    return classFlavors[characterClass?.toLowerCase()]?.[actionType] || '';
  }

  // Calculate action results
  calculateActionResults(combatant, actionType, target, additionalData) {
    const results = {
      damage: 0,
      healing: 0,
      statusEffects: [],
      environmentalEffects: [],
      narrative: '',
      specialAttack: additionalData.specialAttack || 'Standard Action',
      damageType: additionalData.damageType || 'physical',
      attribute: additionalData.attribute || 'strength'
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
    console.log('🎯 calculateAttackDamage called for:', {
      combatant: combatant.name,
      target: target.name,
      combatantClass: combatant.class,
      additionalData
    });
    
    const baseDamage = Math.floor(Math.random() * 8) + 1;
    const strengthMod = Math.floor(((combatant.strength || 10) - 10) / 2);
    const weaponBonus = additionalData.weaponBonus || 0;
    
    console.log('🎯 Base damage calculation:', {
      baseDamage,
      strengthMod,
      weaponBonus,
      combatantStrength: combatant.strength || 10
    });
    
    // Enhanced scaling for enemies based on level and attributes
    let levelScaling = 1;
    let attributeMod = 0;
    
    if (combatant.id.startsWith('enemy_')) {
      levelScaling = 1 + (combatant.level - 1) * 0.3; // 30% increase per level
      
      // Use the specified attribute for damage calculation
      const attribute = additionalData.attribute || 'strength';
      attributeMod = Math.floor(((combatant[attribute] || 10) - 10) / 2);
      
      // Item bonuses for enemies
      const itemBonus = this.calculateEnemyItemBonus(combatant);
      
      // Special attack bonuses
      let specialBonus = 0;
      if (additionalData.specialAttack && additionalData.specialAttack !== 'Standard Attack') {
        specialBonus = Math.floor(Math.random() * 4) + 2; // +2 to +5 bonus for special attacks
      }
      
      // Boss attack bonuses
      if (additionalData.isBossAttack) {
        specialBonus += 5; // Additional +5 for boss attacks
      }
      
      let totalDamage = (baseDamage + strengthMod + weaponBonus + attributeMod + itemBonus + specialBonus) * levelScaling;
      
      // Critical hit (natural 20)
      if (Math.floor(Math.random() * 20) + 1 === 20) {
        totalDamage *= 2;
      }
      
      console.log(`Enhanced enemy damage calculation for ${combatant.name}:`, {
        baseDamage,
        strengthMod,
        weaponBonus,
        attributeMod,
        itemBonus,
        specialBonus,
        levelScaling,
        specialAttack: additionalData.specialAttack,
        damageType: additionalData.damageType,
        attribute: additionalData.attribute,
        totalDamage: Math.max(1, Math.floor(totalDamage))
      });
      
      const finalDamage = Math.max(1, Math.floor(totalDamage));
      console.log(`🎯 Enemy ${combatant.name} final damage: ${finalDamage}`);
      return finalDamage;
    } else {
      // Enhanced player damage calculation
      const dexterityMod = Math.floor(((combatant.dexterity || 10) - 10) / 2);
      const levelBonus = Math.floor((combatant.level - 1) * 0.5); // +0.5 damage per level
      
      let totalDamage = baseDamage + strengthMod + dexterityMod + weaponBonus + levelBonus;
      
      // Critical hit (natural 20)
      if (Math.floor(Math.random() * 20) + 1 === 20) {
        totalDamage *= 2;
      }
      
      const finalDamage = Math.max(1, Math.floor(totalDamage));
      console.log(`🎯 Player ${combatant.name} damage calculation:`, {
        baseDamage,
        strengthMod,
        dexterityMod,
        weaponBonus,
        levelBonus,
        totalDamage: finalDamage
      });
      
      return finalDamage;
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
    console.log('🔧 applyActionEffects called with:', {
      combatant: combatant.name,
      target: target.name,
      results: results,
      targetHpBefore: target.hp
    });
    
    // Apply damage
    if (results.damage > 0) {
      const oldHp = target.hp;
      target.hp = Math.max(0, target.hp - results.damage);
      console.log(`🔧 Damage applied in applyActionEffects: ${combatant.name} deals ${results.damage} damage to ${target.name}. HP: ${oldHp} → ${target.hp}`);
    }
    
    // Apply healing
    if (results.healing > 0) {
      const oldHp = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + results.healing);
      console.log(`🔧 Healing applied in applyActionEffects: ${combatant.name} heals ${target.name} for ${results.healing} HP. HP: ${oldHp} → ${target.hp}`);
    }
    
    // Apply status effects
    if (!target.statusEffects) {
      target.statusEffects = [];
    }
    
    results.statusEffects.forEach(effect => {
      if (!target.statusEffects.some(e => e.type === effect.type)) {
        target.statusEffects.push({
          type: effect.type,
          duration: effect.duration,
          appliedBy: combatant.id
        });
        console.log(`🔧 Status effect applied: ${effect.type} to ${target.name}`);
      }
    });
    
    console.log(`🔧 Final target HP after applyActionEffects: ${target.name} = ${target.hp}`);
  }

  // Update cooldowns
  updateCooldowns(combatSession, combatant, actionType) {
    const actionConfig = this.actionTypes[actionType];
    
    // Initialize cooldowns if not present
    if (!combatant.cooldowns) {
      combatant.cooldowns = {};
    }
    
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
    
    // Initialize statusEffects if not present
    if (!target.statusEffects) {
      target.statusEffects = [];
    }
    
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
    
    if (!combatant.statusEffects) {
      return effects;
    }
    
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

  // Choose enemy action
  chooseEnemyAction(enemy, combatSession) {
    const availableActions = this.getAvailableActions(enemy);
    
    console.log(`Enemy ${enemy.name} available actions:`, availableActions);
    
    // If no available actions, default to defend
    if (availableActions.length === 0) {
      console.log(`No available actions for ${enemy.name}, defaulting to defend`);
      return {
        action: 'defend',
        target: null,
        specialAttack: 'Defensive Stance',
        damageType: 'defense',
        attribute: 'dexterity'
      };
    }
    
    return this.makeEnemyDecision(enemy, availableActions, combatSession);
  }

  // Get available actions for enemy
  getAvailableActions(enemy) {
    const actions = [];
    const cooldowns = enemy.cooldowns || {};
    
    console.log('Getting enemy available actions for:', enemy.name, {
      cooldowns,
      class: enemy.class,
      hasClassAbility: !!this.classAbilities[enemy.class?.toLowerCase()]
    });
    
    // Basic actions - available if no cooldown or cooldown is 0
    Object.entries(this.actionTypes).forEach(([actionType, config]) => {
      if (!cooldowns.hasOwnProperty(actionType) || cooldowns[actionType] <= 0) {
        actions.push(actionType);
      }
    });
    
    // Class-specific abilities
    if (enemy.class && this.classAbilities[enemy.class.toLowerCase()]) {
      if (!cooldowns.hasOwnProperty('special') || cooldowns.special <= 0) {
        actions.push('special');
      }
    }
    
    console.log('Available actions for enemy:', enemy.name, actions);
    return actions;
  }

  // Get valid targets for enemy
  getValidTargets(enemy, actionType, combatSession) {
    const targets = [];
    
    // Get all alive combatants
    const aliveCombatants = combatSession.combatants.filter(c => c.hp > 0);
    
    // If no alive combatants, return empty array
    if (aliveCombatants.length === 0) {
      console.log('No alive combatants found');
      return [];
    }
    
    // Determine valid targets based on action type
    switch (actionType) {
      case 'attack':
      case 'spell':
      case 'special':
        // Can target enemies (opposite team)
        if (enemy.id.startsWith('enemy_')) {
          // Enemy targeting players
          targets.push(...aliveCombatants.filter(c => !c.id.startsWith('enemy_')));
        } else {
          // Player targeting enemies
          targets.push(...aliveCombatants.filter(c => c.id.startsWith('enemy_')));
        }
        break;
        
      case 'heal':
      case 'item':
        // Can target allies (same team)
        if (enemy.id.startsWith('enemy_')) {
          // Enemy targeting other enemies
          targets.push(...aliveCombatants.filter(c => c.id.startsWith('enemy_')));
        } else {
          // Player targeting other players
          targets.push(...aliveCombatants.filter(c => !c.id.startsWith('enemy_')));
        }
        break;
        
      case 'defend':
      case 'environmental':
        // Can target self or no target needed
        targets.push(enemy);
        break;
        
      case 'teamUp':
        // Can target allies for team-up actions
        if (enemy.id.startsWith('enemy_')) {
          targets.push(...aliveCombatants.filter(c => c.id.startsWith('enemy_') && c.id !== enemy.id));
        } else {
          targets.push(...aliveCombatants.filter(c => !c.id.startsWith('enemy_') && c.id !== enemy.id));
        }
        break;
        
      default:
        // Default to all targets
        targets.push(...aliveCombatants);
    }
    
    console.log(`Valid targets for ${enemy.name} (${actionType}):`, targets.map(t => t.name));
    return targets;
  }

  // Make enemy decision based on situation
  makeEnemyDecision(enemy, availableActions, combatSession) {
    // If no available actions, default to defend
    if (availableActions.length === 0) {
      console.log('No available actions for enemy, defaulting to defend');
      return { 
        action: 'defend', 
        target: null,
        specialAttack: 'Defensive Stance',
        damageType: 'defense',
        attribute: 'dexterity'
      };
    }
    
    // Choose a random action from available actions
    const chosenAction = availableActions[Math.floor(Math.random() * availableActions.length)];
    
    // Get valid targets for the chosen action
    const validTargets = this.getValidTargets(enemy, chosenAction, combatSession);
    
    console.log(`Valid targets for ${enemy.name} (${chosenAction}):`, validTargets.map(t => t.name));
    
    // If no valid targets for this action, default to defend
    if (validTargets.length === 0) {
      console.log(`No valid targets for ${enemy.name} with action ${chosenAction}, defaulting to defend`);
      return { 
        action: 'defend', 
        target: null,
        specialAttack: 'Defensive Stance',
        damageType: 'defense',
        attribute: 'dexterity'
      };
    }
    
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
      if (availableActions.includes('spell')) {
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
          target: enemy.id,
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
  async executeEnemyTurn(combatSession, enemy) {
    const decision = this.chooseEnemyAction(enemy, combatSession);
    
    console.log('Enemy decision details:', {
      enemy: enemy.name,
      decision: decision,
      specialAttack: decision.specialAttack,
      damageType: decision.damageType,
      attribute: decision.attribute
    });
    
    if (decision.target) {
      return await this.executeAction(combatSession, enemy.id, decision.action, decision.target, {
        itemType: decision.itemType,
        spellType: decision.spellType,
        specialAttack: decision.specialAttack,
        damageType: decision.damageType,
        attribute: decision.attribute,
        isBossAttack: decision.isBossAttack
      });
    } else {
      // Defend action
      return await this.executeAction(combatSession, enemy.id, 'defend', enemy.id, {
        specialAttack: decision.specialAttack,
        damageType: decision.damageType,
        attribute: decision.attribute
      });
    }
  }
}

export const combatService = new CombatService(); 