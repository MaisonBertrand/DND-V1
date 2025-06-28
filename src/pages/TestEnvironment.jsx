import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionValidationService } from '../services/actionValidation';
import { DiceRollingService } from '../services/diceRolling';
import ActionValidationDisplay from '../components/ActionValidationDisplay';
import DiceRollDisplay from '../components/DiceRollDisplay';
import MultipleAttemptsDisplay from '../components/MultipleAttemptsDisplay';

const actionValidationService = new ActionValidationService();
const diceRollingService = new DiceRollingService();

export default function TestEnvironment() {
  const navigate = useNavigate();
  const [testInput, setTestInput] = useState('');
  const [storyContext, setStoryContext] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [showActionValidation, setShowActionValidation] = useState(false);
  const [showDiceRoll, setShowDiceRoll] = useState(false);
  const [showMultipleAttempts, setShowMultipleAttempts] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [diceResult, setDiceResult] = useState(null);
  const [multipleAttemptsResult, setMultipleAttemptsResult] = useState(null);
  const [selectedClass, setSelectedClass] = useState('Fighter');

  // Test scenarios
  const testScenarios = [
    {
      name: "Drowned Priest Boss Fight",
      storyContext: "In a dark, misty swamp, a Drowned Priest emerges from the murky water, chanting dark spells. The air is thick with malevolence as undead minions rise from the depths. The water bubbles with dark energy, and the priest's glowing eyes pierce through the fog.",
      suggestedAction: "I charge forward and attack the Drowned Priest with my sword"
    },
    {
      name: "Forest Ambush",
      storyContext: "The party is traveling through a dense forest when suddenly, goblin archers emerge from the trees above. The forest floor is covered in fallen leaves that crunch underfoot, and the canopy blocks most of the sunlight. The goblins are well-hidden in the branches, their green skin blending with the foliage.",
      suggestedAction: "I take cover behind a large tree and cast a fireball at the goblin archers"
    },
    {
      name: "Tavern Brawl",
      storyContext: "A rowdy group of bandits has taken over the local tavern, threatening the patrons. The tavern is filled with overturned tables, broken chairs, and spilled ale. The bandit leader, a scarred warrior with a wicked grin, stands on the bar counter brandishing his sword.",
      suggestedAction: "I leap over a table and tackle the bandit leader to the ground"
    }
  ];

  // Test characters for each class
  const testCharacters = {
    Fighter: {
      id: 'test_fighter_1',
      name: 'Test Fighter',
      level: 5,
      class: 'Fighter',
      strength: 18,
      dexterity: 14,
      constitution: 16,
      intelligence: 10,
      wisdom: 10,
      charisma: 12,
      hp: 45,
      maxHp: 45,
      ac: 16,
      userId: 'test_user',
      initiative: Math.floor(Math.random() * 20) + 1,
      statusEffects: [],
      cooldowns: {},
      lastAction: null,
      turnCount: 0,
      proficiencies: ['attack', 'dodge', 'parry', 'defend'],
      equipment: {
        weapon: { name: 'Longsword', damageBonus: 2 },
        armor: { name: 'Chain Mail', defenseBonus: 4 },
        shield: { name: 'Shield', defenseBonus: 2 }
      }
    },
    Wizard: {
      id: 'test_wizard_1',
      name: 'Test Wizard',
      level: 5,
      class: 'Wizard',
      strength: 8,
      dexterity: 14,
      constitution: 12,
      intelligence: 18,
      wisdom: 12,
      charisma: 10,
      hp: 32,
      maxHp: 32,
      ac: 14,
      userId: 'test_user',
      initiative: Math.floor(Math.random() * 20) + 1,
      statusEffects: [],
      cooldowns: {},
      lastAction: null,
      turnCount: 0,
      proficiencies: ['spell', 'attack', 'defend'],
      equipment: {
        weapon: { name: 'Staff', damageBonus: 0 },
        armor: { name: 'Robe', defenseBonus: 2 },
        focus: { name: 'Arcane Focus', spellBonus: 1 }
      }
    },
    Rogue: {
      id: 'test_rogue_1',
      name: 'Test Rogue',
      level: 5,
      class: 'Rogue',
      strength: 12,
      dexterity: 18,
      constitution: 14,
      intelligence: 12,
      wisdom: 10,
      charisma: 14,
      hp: 38,
      maxHp: 38,
      ac: 16,
      userId: 'test_user',
      initiative: Math.floor(Math.random() * 20) + 1,
      statusEffects: [],
      cooldowns: {},
      lastAction: null,
      turnCount: 0,
      proficiencies: ['attack', 'dodge', 'parry', 'defend'],
      equipment: {
        weapon: { name: 'Daggers', damageBonus: 1 },
        armor: { name: 'Leather Armor', defenseBonus: 2 },
        tools: { name: 'Thieves Tools', utilityBonus: 2 }
      }
    },
    Cleric: {
      id: 'test_cleric_1',
      name: 'Test Cleric',
      level: 5,
      class: 'Cleric',
      strength: 14,
      dexterity: 10,
      constitution: 16,
      intelligence: 12,
      wisdom: 18,
      charisma: 12,
      hp: 42,
      maxHp: 42,
      ac: 16,
      userId: 'test_user',
      initiative: Math.floor(Math.random() * 20) + 1,
      statusEffects: [],
      cooldowns: {},
      lastAction: null,
      turnCount: 0,
      proficiencies: ['spell', 'attack', 'defend'],
      equipment: {
        weapon: { name: 'Mace', damageBonus: 1 },
        armor: { name: 'Scale Mail', defenseBonus: 3 },
        holySymbol: { name: 'Holy Symbol', spellBonus: 1 }
      }
    },
    Ranger: {
      id: 'test_ranger_1',
      name: 'Test Ranger',
      level: 5,
      class: 'Ranger',
      strength: 14,
      dexterity: 16,
      constitution: 14,
      intelligence: 12,
      wisdom: 16,
      charisma: 10,
      hp: 40,
      maxHp: 40,
      ac: 15,
      userId: 'test_user',
      initiative: Math.floor(Math.random() * 20) + 1,
      statusEffects: [],
      cooldowns: {},
      lastAction: null,
      turnCount: 0,
      proficiencies: ['attack', 'dodge', 'parry', 'defend'],
      equipment: {
        weapon: { name: 'Longbow', damageBonus: 1 },
        armor: { name: 'Studded Leather', defenseBonus: 2 },
        companion: { name: 'Wolf Companion', utilityBonus: 1 }
      }
    },
    Paladin: {
      id: 'test_paladin_1',
      name: 'Test Paladin',
      level: 5,
      class: 'Paladin',
      strength: 16,
      dexterity: 10,
      constitution: 16,
      intelligence: 10,
      wisdom: 12,
      charisma: 16,
      hp: 44,
      maxHp: 44,
      ac: 17,
      userId: 'test_user',
      initiative: Math.floor(Math.random() * 20) + 1,
      statusEffects: [],
      cooldowns: {},
      lastAction: null,
      turnCount: 0,
      proficiencies: ['attack', 'spell', 'defend'],
      equipment: {
        weapon: { name: 'Greatsword', damageBonus: 2 },
        armor: { name: 'Plate Mail', defenseBonus: 5 },
        holySymbol: { name: 'Holy Symbol', spellBonus: 1 }
      }
    }
  };

  // Get current test character based on selected class
  const testCharacter = testCharacters[selectedClass];

  // Load test scenario
  const loadTestScenario = (scenario) => {
    setStoryContext(scenario.storyContext);
    setTestInput(scenario.suggestedAction);
  };

  const handleTestMessage = async () => {
    if (!testInput.trim()) return;

    try {
      // Extract context information
      const context = {
        environmentalFeatures: extractEnvironmentalFeatures(storyContext),
        npcs: extractNPCs(storyContext),
        circumstances: extractCircumstances(storyContext)
      };

      // Validate the action
      const validation = actionValidationService.validatePlayerAction(testInput, testCharacter, context);
      setValidationResult(validation);

      // Check for combat detection first
      const combatDetection = detectCombatOpportunity(testInput, storyContext, validation);

      if (combatDetection.shouldInitiate) {
        // Generate enemies for combat
        const enemies = generateTestEnemies(combatDetection.enemyType, combatDetection.specificEnemyName);
        
        console.log('Combat detected, generated enemies:', enemies);
        
        // Show combat initiation message
        setTestResult({
          type: 'combat',
          message: `⚔️ Combat Detected! ${combatDetection.reason === 'action_triggered_combat' ? 
            'Your action has triggered combat with the enemies in the area.' : 
            'The situation has escalated to combat.'}`,
          context: context,
          enemyType: combatDetection.enemyType,
          enemies: enemies,
          storyContext: storyContext
        });
        
        // If there's a dice result, set it for combat actions
        if (validation.valid && validation.diceResult) {
          const filteredActions = (validation.diceResult.actions || []).filter(action => action.type !== undefined);
          if (filteredActions.length > 0) {
            const diceRoll = diceRollingService.performActionSequence(testCharacter, filteredActions, context);
            setDiceResult(diceRoll);
            setShowDiceRoll(true);
          }
        }
      } else if (validation.valid) {
        if (validation.diceResult) {
          // Action requires dice rolling
          const filteredActions = (validation.diceResult.actions || []).filter(action => action.type !== undefined);
          if (filteredActions.length > 0) {
            const diceRoll = diceRollingService.performActionSequence(testCharacter, filteredActions, context);
            setDiceResult(diceRoll);
            setShowDiceRoll(true);
          } else {
            setTestResult({
              type: 'invalid',
              message: 'No valid actions detected. Try a different action or rephrase your input.',
              context: context
            });
          }
        } else {
          // Simple action, no dice needed
          setTestResult({
            type: 'simple',
            message: `The ${testCharacter.name} performs the action successfully.`,
            context: context
          });
        }

        // Generate atmospheric DM response for non-combat actions
        const dmResponse = generateStoryResponse(validation, testCharacter, context);
        setTestResult(prev => ({
          ...prev,
          message: dmResponse
        }));
      } else {
        // Invalid action
        const dmResponse = generateStoryResponse(validation, testCharacter, context);
        setTestResult({
          type: 'invalid',
          message: dmResponse,
          context: context
        });
      }

      setShowActionValidation(true);
    } catch (error) {
      console.error('Error processing test message:', error);
      setTestResult({
        type: 'error',
        message: 'An error occurred while processing your action.'
      });
    }
  };

  // Combat detection for test environment
  const detectCombatOpportunity = (action, context, validationResult) => {
    const combatKeywords = ['attack', 'fight', 'battle', 'combat', 'strike', 'slash', 'stab', 'shoot', 'cast spell', 'fire spell', 'magic'];
    const enemyKeywords = [
      'enemy', 'monster', 'goblin', 'orc', 'troll', 'dragon', 'bandit', 'skeleton', 'zombie',
      'priest', 'boss', 'creature', 'beast', 'fiend', 'demon', 'devil', 'ghost', 'spirit',
      'undead', 'abomination', 'horror', 'terror', 'nightmare', 'phantom', 'specter',
      'wraith', 'lich', 'vampire', 'werewolf', 'shapeshifter', 'elemental', 'construct'
    ];
    
    // Check if action contains combat keywords
    const hasCombatAction = combatKeywords.some(keyword => 
      action.toLowerCase().includes(keyword)
    );
    
    // Check if context contains enemies - enhanced detection
    const contextLower = context.toLowerCase();
    const hasEnemies = enemyKeywords.some(keyword => 
      contextLower.includes(keyword)
    ) || 
    contextLower.includes('hostile') || 
    contextLower.includes('aggressive') ||
    contextLower.includes('snarls') ||
    contextLower.includes('chanting') ||
    contextLower.includes('combat trigger') ||
    contextLower.includes('mini-boss') ||
    contextLower.includes('boss') ||
    // Check for specific patterns that indicate enemies
    /\b(?:the\s+)?(\w+)\s+(?:priest|wizard|mage|sorcerer|warlock|necromancer|lich|vampire|werewolf|ghost|spirit|demon|devil|fiend|beast|creature|monster)\b/i.test(context) ||
    // Check for threatening actions or descriptions
    contextLower.includes('raises') && contextLower.includes('staff') ||
    contextLower.includes('emerges') && contextLower.includes('mist') ||
    contextLower.includes('glowing') && contextLower.includes('eyes');
    
    // Check if action validation detected combat actions
    const hasCombatActions = validationResult?.diceResult?.actions?.some(action => 
      ['attack', 'spell', 'dodge', 'parry', 'cast'].includes(action.action)
    );

    // Determine enemy type from context - enhanced detection
    let enemyType = 'bandit';
    let specificEnemyName = null;
    
    // Check for specific named enemies first
    const specificEnemyMatch = context.match(/\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:priest|wizard|mage|sorcerer|warlock|necromancer|lich|vampire|werewolf|ghost|spirit|demon|devil|fiend|beast|creature|monster|boss)\b/i);
    if (specificEnemyMatch) {
      specificEnemyName = specificEnemyMatch[1];
    }
    
    // Special handling for compound names like "Drowned Priest"
    if (contextLower.includes('drowned priest')) {
      specificEnemyName = 'Drowned Priest';
      enemyType = 'priest';
    }
    
    if (contextLower.includes('goblin')) enemyType = 'goblin';
    else if (contextLower.includes('orc')) enemyType = 'orc';
    else if (contextLower.includes('troll')) enemyType = 'troll';
    else if (contextLower.includes('dragon')) enemyType = 'dragon';
    else if (contextLower.includes('undead') || contextLower.includes('skeleton') || contextLower.includes('zombie')) enemyType = 'skeleton';
    else if (contextLower.includes('priest') || contextLower.includes('cleric') || contextLower.includes('paladin')) enemyType = 'priest';
    else if (contextLower.includes('wizard') || contextLower.includes('mage') || contextLower.includes('sorcerer')) enemyType = 'wizard';
    else if (contextLower.includes('dragon') || contextLower.includes('wyrm') || contextLower.includes('wyvern')) enemyType = 'dragon';
    else if (contextLower.includes('boss') || contextLower.includes('mini-boss')) enemyType = 'boss';
    
    // If we have a specific enemy name but no specific type, treat as boss
    if (specificEnemyName && enemyType === 'bandit') {
      enemyType = 'boss';
    }
    
    return {
      shouldInitiate: (hasCombatAction && hasEnemies) || (hasCombatActions && hasEnemies),
      reason: hasCombatAction ? 'action_triggered_combat' : 'context_triggered_combat',
      enemyType: enemyType,
      specificEnemyName: specificEnemyName
    };
  };

  const generateTestEnemies = (enemyType = 'bandit', specificEnemyName = null) => {
    const enemyTypes = {
      'goblin': { 
        name: 'Goblin', 
        hp: 12, 
        ac: 14, 
        level: 1,
        strength: 8,
        dexterity: 14,
        constitution: 10,
        intelligence: 10,
        wisdom: 8,
        charisma: 8
      },
      'orc': { 
        name: 'Orc', 
        hp: 30, 
        ac: 16, 
        level: 3,
        strength: 16,
        dexterity: 12,
        constitution: 16,
        intelligence: 7,
        wisdom: 11,
        charisma: 10
      },
      'troll': { 
        name: 'Troll', 
        hp: 84, 
        ac: 15, 
        level: 5,
        strength: 18,
        dexterity: 13,
        constitution: 20,
        intelligence: 7,
        wisdom: 9,
        charisma: 7
      },
      'dragon': { 
        name: 'Dragon', 
        hp: 200, 
        ac: 19, 
        level: 10,
        strength: 27,
        dexterity: 14,
        constitution: 25,
        intelligence: 16,
        wisdom: 13,
        charisma: 15
      },
      'bandit': { 
        name: 'Bandit', 
        hp: 16, 
        ac: 12, 
        level: 1,
        strength: 12,
        dexterity: 12,
        constitution: 12,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
      },
      'skeleton': { 
        name: 'Skeleton', 
        hp: 13, 
        ac: 13, 
        level: 1,
        strength: 10,
        dexterity: 14,
        constitution: 15,
        intelligence: 6,
        wisdom: 8,
        charisma: 5
      },
      'zombie': { 
        name: 'Zombie', 
        hp: 22, 
        ac: 8, 
        level: 1,
        strength: 13,
        dexterity: 6,
        constitution: 16,
        intelligence: 3,
        wisdom: 6,
        charisma: 5
      },
      'priest': { 
        name: 'Priest', 
        hp: 45, 
        ac: 16, 
        level: 5,
        strength: 12,
        dexterity: 10,
        constitution: 14,
        intelligence: 12,
        wisdom: 16,
        charisma: 14
      },
      'wizard': { 
        name: 'Wizard', 
        hp: 40, 
        ac: 15, 
        level: 5,
        strength: 9,
        dexterity: 14,
        constitution: 12,
        intelligence: 16,
        wisdom: 12,
        charisma: 10
      },
      'boss': { 
        name: 'Boss', 
        hp: 120, 
        ac: 18, 
        level: 8,
        strength: 18,
        dexterity: 16,
        constitution: 18,
        intelligence: 14,
        wisdom: 16,
        charisma: 16
      },
      'undead': { 
        name: 'Undead', 
        hp: 15, 
        ac: 12, 
        level: 1,
        strength: 12,
        dexterity: 10,
        constitution: 14,
        intelligence: 6,
        wisdom: 8,
        charisma: 5
      }
    };

    const baseEnemy = enemyTypes[enemyType] || enemyTypes['bandit'];
    
    // Determine enemy count and type
    let enemyCount = 1;
    let isBoss = false;
    
    if (specificEnemyName) {
      // If we have a specific enemy name, it's likely a boss or important enemy
      isBoss = true;
      enemyCount = 1;
    } else if (enemyType === 'boss') {
      isBoss = true;
      enemyCount = 1;
    } else {
      // Regular enemies come in groups
      enemyCount = Math.min(3, 4);
    }

    const generatedEnemies = [];
    for (let i = 0; i < enemyCount; i++) {
      let enemyName;
      let enemyHp = baseEnemy.hp;
      let enemyAc = baseEnemy.ac;
      let enemyLevel = baseEnemy.level;
      let enemyClass = enemyType;
      
      if (specificEnemyName) {
        // Use the specific enemy name from context
        enemyName = specificEnemyName;
        // Boss enemies get enhanced stats
        enemyHp = Math.max(baseEnemy.hp * 2, 80);
        enemyAc = baseEnemy.ac + 2;
        enemyLevel = Math.max(baseEnemy.level + 2, 7);
        enemyClass = 'boss'; // Mark as boss for special abilities
      } else if (isBoss) {
        enemyName = 'Drowned Priest'; // Default boss name
        enemyHp = Math.max(baseEnemy.hp * 2, 80);
        enemyAc = baseEnemy.ac + 2;
        enemyLevel = Math.max(baseEnemy.level + 2, 7);
        enemyClass = 'boss';
      } else {
        enemyName = `${baseEnemy.name} ${i + 1}`;
        // Add some randomization to regular enemies
        enemyHp = baseEnemy.hp + Math.floor(Math.random() * 10);
        enemyAc = baseEnemy.ac + Math.floor(Math.random() * 3);
      }
      
      generatedEnemies.push({
        id: `enemy_${i}`,
        name: enemyName,
        type: baseEnemy.name,
        class: enemyClass,
        hp: enemyHp,
        maxHp: enemyHp,
        ac: enemyAc,
        level: enemyLevel,
        // Include all necessary attributes
        strength: baseEnemy.strength,
        dexterity: baseEnemy.dexterity,
        constitution: baseEnemy.constitution,
        intelligence: baseEnemy.intelligence,
        wisdom: baseEnemy.wisdom,
        charisma: baseEnemy.charisma,
        initiative: Math.floor(Math.random() * 20) + 1,
        statusEffects: [],
        cooldowns: {},
        lastAction: null,
        turnCount: 0,
        // Add proficiencies for different action types
        proficiencies: ['attack', 'spell', 'special', 'defend']
      });
    }
    
    // Add undead minions for the Drowned Priest
    if (specificEnemyName === 'Drowned Priest' || (isBoss && enemyType === 'priest')) {
      const minionCount = 2; // Add 2 undead minions
      for (let i = 0; i < minionCount; i++) {
        generatedEnemies.push({
          id: `enemy_minion_${i}`,
          name: `Undead Minion ${i + 1}`,
          type: 'Skeleton',
          class: 'undead',
          hp: 15 + Math.floor(Math.random() * 8),
          maxHp: 15 + Math.floor(Math.random() * 8),
          ac: 12 + Math.floor(Math.random() * 3),
          level: 1,
          // Include all necessary attributes
          strength: 12,
          dexterity: 10,
          constitution: 14,
          intelligence: 6,
          wisdom: 8,
          charisma: 5,
          initiative: Math.floor(Math.random() * 20) + 1,
          statusEffects: [],
          cooldowns: {},
          lastAction: null,
          turnCount: 0,
          proficiencies: ['attack', 'spell', 'defend']
        });
      }
    }

    return generatedEnemies;
  };

  // Generate atmospheric DM response
  const generateStoryResponse = (validationResult, character, context) => {
    const { environmentalFeatures, npcs, circumstances } = context;
    
    // Check if this is a combat scenario
    const isCombatScenario = npcs.some(npc => npc.role === 'enemy') || 
                            environmentalFeatures.some(feature => 
                              ['dangerous', 'hostile', 'threatening', 'eerie', 'creepy'].includes(feature)
                            );
    
    // Base response based on validation
    let response = '';
    
    if (validationResult.valid) {
      if (validationResult.diceResult) {
        // Action requires dice rolling
        const actions = validationResult.diceResult.actions || [];
        const totalActions = actions.length;
        
        if (isCombatScenario) {
          // Combat-focused atmospheric response
          response = `The ${character.name} ${actions.map(a => a.action).join(' and ')} with determination. `;
          
          // Add environmental tension
          if (environmentalFeatures.length > 0) {
            const tenseFeatures = environmentalFeatures.filter(f => 
              ['dark', 'fog', 'mist', 'eerie', 'creepy', 'dangerous'].includes(f)
            );
            if (tenseFeatures.length > 0) {
              response += `The ${tenseFeatures.join(' and ')} ${tenseFeatures.length === 1 ? 'adds' : 'add'} to the tension. `;
            }
          }
          
          // Add enemy reactions
          const enemies = npcs.filter(npc => npc.role === 'enemy');
          if (enemies.length > 0) {
            const enemyNames = enemies.map(npc => npc.name).join(', ');
            response += `${enemyNames} ${enemies.length === 1 ? 'reacts' : 'react'} with ${['hostility', 'anger', 'defiance', 'malice'].sort(() => 0.5 - Math.random())[0]}. `;
          }
          
          if (totalActions > 1) {
            response += `Multiple actions detected - this complex maneuver will require precise timing and coordination. `;
          }
          
          response += `\n\nThe outcome hangs in the balance. Roll the dice to determine your fate.`;
        } else {
          // Non-combat atmospheric response
          response = `The ${character.name} prepares to ${actions.map(a => a.action).join(' and ')}. `;
          
          if (totalActions > 1) {
            response += `Multiple actions detected - this will require careful coordination and may incur fatigue penalties. `;
          }
          
          // Add environmental context
          if (environmentalFeatures.length > 0) {
            response += `The ${environmentalFeatures.join(' and ')} ${environmentalFeatures.length === 1 ? 'affects' : 'affect'} the situation. `;
          }
          
          // Add NPC context
          if (npcs.length > 0) {
            const npcNames = npcs.map(npc => npc.name).join(', ');
            response += `${npcNames} ${npcs.length === 1 ? 'watches' : 'watch'} with interest. `;
          }
          
          // Add circumstance context
          if (circumstances.length > 0) {
            response += `The circumstances (${circumstances.join(', ')}) ${circumstances.length === 1 ? 'adds' : 'add'} complexity to the action. `;
          }
          
          response += `\n\nRoll the dice to determine the outcome of this challenging action.`;
        }
      } else {
        // Simple action, no dice needed
        if (isCombatScenario) {
          response = `${character.name}'s action is straightforward but the situation remains tense. `;
          
          const enemies = npcs.filter(npc => npc.role === 'enemy');
          if (enemies.length > 0) {
            const enemyNames = enemies.map(npc => npc.name).join(', ');
            response += `${enemyNames} ${enemies.length === 1 ? 'maintains' : 'maintain'} a defensive stance. `;
          }
          
          response += `\n\nThe action proceeds, but danger still lurks nearby.`;
        } else {
          response = `${character.name}'s action is straightforward and doesn't require a skill check. `;
          
          if (environmentalFeatures.length > 0) {
            response += `The ${environmentalFeatures.join(' and ')} ${environmentalFeatures.length === 1 ? 'provides' : 'provide'} a suitable backdrop. `;
          }
          
          if (npcs.length > 0) {
            const npcNames = npcs.map(npc => npc.name).join(', ');
            response += `${npcNames} ${npcs.length === 1 ? 'responds' : 'respond'} appropriately to the action. `;
          }
          
          response += `\n\nThe action proceeds smoothly.`;
        }
      }
    } else {
      // Invalid action
      if (isCombatScenario) {
        response = `The proposed action doesn't seem feasible in this dangerous situation. `;
        
        if (validationResult.reason) {
          response += `${validationResult.reason} `;
        }
        
        response += `\n\nIn combat, every action must be precise and deliberate. Consider a different approach.`;
      } else {
        response = `The proposed action doesn't seem feasible. `;
        
        if (validationResult.reason) {
          response += `${validationResult.reason} `;
        }
        
        response += `\n\nTry a different approach or rephrase your action.`;
      }
    }
    
    return response;
  };

  // Extract environmental features from context
  const extractEnvironmentalFeatures = (context) => {
    if (!context) return [];
    
    const contextLower = context.toLowerCase();
    const features = [];
    
    // Environmental features
    if (contextLower.includes('dark') || contextLower.includes('shadow')) features.push('darkness');
    if (contextLower.includes('fog') || contextLower.includes('mist')) features.push('fog');
    if (contextLower.includes('forest') || contextLower.includes('tree')) features.push('forest');
    if (contextLower.includes('cave') || contextLower.includes('cavern')) features.push('cave');
    if (contextLower.includes('tavern') || contextLower.includes('inn')) features.push('tavern');
    if (contextLower.includes('castle') || contextLower.includes('fortress')) features.push('castle');
    if (contextLower.includes('dungeon') || contextLower.includes('underground')) features.push('dungeon');
    if (contextLower.includes('water') || contextLower.includes('swamp')) features.push('water');
    if (contextLower.includes('fire') || contextLower.includes('flame')) features.push('fire');
    if (contextLower.includes('ice') || contextLower.includes('cold')) features.push('ice');
    if (contextLower.includes('wind') || contextLower.includes('storm')) features.push('wind');
    if (contextLower.includes('eerie') || contextLower.includes('creepy')) features.push('eerie');
    if (contextLower.includes('dangerous') || contextLower.includes('hostile')) features.push('dangerous');
    
    return features;
  };

  // Extract NPCs from context
  const extractNPCs = (context) => {
    if (!context) return [];
    
    const npcs = [];
    const contextLower = context.toLowerCase();
    
    // Enemy detection
    if (contextLower.includes('drowned priest')) {
      npcs.push({ name: 'Drowned Priest', role: 'enemy', type: 'boss' });
    }
    if (contextLower.includes('goblin')) {
      npcs.push({ name: 'Goblin Archers', role: 'enemy', type: 'goblin' });
    }
    if (contextLower.includes('bandit')) {
      npcs.push({ name: 'Bandit Leader', role: 'enemy', type: 'bandit' });
    }
    if (contextLower.includes('undead') || contextLower.includes('skeleton') || contextLower.includes('zombie')) {
      npcs.push({ name: 'Undead Minions', role: 'enemy', type: 'undead' });
    }
    
    // Friendly NPCs
    if (contextLower.includes('patron') || contextLower.includes('customer')) {
      npcs.push({ name: 'Tavern Patrons', role: 'friendly', type: 'civilian' });
    }
    if (contextLower.includes('party') || contextLower.includes('companion')) {
      npcs.push({ name: 'Party Members', role: 'ally', type: 'adventurer' });
    }
    
    return npcs;
  };

  // Extract circumstances from context
  const extractCircumstances = (context) => {
    if (!context) return [];
    
    const circumstances = [];
    const contextLower = context.toLowerCase();
    
    if (contextLower.includes('dark') || contextLower.includes('night')) circumstances.push('low visibility');
    if (contextLower.includes('wet') || contextLower.includes('slippery')) circumstances.push('difficult footing');
    if (contextLower.includes('crowded') || contextLower.includes('tight')) circumstances.push('confined space');
    if (contextLower.includes('noisy') || contextLower.includes('loud')) circumstances.push('distracting environment');
    if (contextLower.includes('hurry') || contextLower.includes('rush')) circumstances.push('time pressure');
    if (contextLower.includes('stealth') || contextLower.includes('sneak')) circumstances.push('stealth required');
    
    return circumstances;
  };

  const handleActionValidationClose = () => {
    setShowActionValidation(false);
  };

  const handleDiceRollClose = () => {
    setShowDiceRoll(false);
  };

  const handleActionProceed = async () => {
    // Check if this should trigger combat (either from dice result or direct combat detection)
    if (testResult?.type === 'combat') {
      console.log('Combat detected, preparing to navigate with data:', {
        partyMembers: [testCharacter],
        enemies: testResult.enemies,
        storyContext: testResult.storyContext,
        enemyCount: testResult.enemies?.length
      });
      
      // Navigate to combat page with test data
      navigate('/combat', { 
        state: { 
          isTestCombat: true,
          partyMembers: [testCharacter],
          enemies: testResult.enemies,
          storyContext: testResult.storyContext
        }
      });
    } else if (diceResult) {
      // Show multiple attempts option for complex actions
      if (diceResult.actions && diceResult.actions.length > 1) {
        const multipleAttempts = diceRollingService.performMultipleSkillChecks(
          testCharacter, 
          'attack', 
          3, 
          testResult?.context?.circumstances || []
        );
        setMultipleAttemptsResult(multipleAttempts);
        setShowMultipleAttempts(true);
      }
    }
    setShowDiceRoll(false);
  };

  const handleActionRevise = () => {
    setShowActionValidation(false);
    setShowDiceRoll(false);
    setTestResult(null);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="fantasy-container">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Test Environment</h1>
            <button
              onClick={handleBackToDashboard}
              className="fantasy-button bg-blue-600 hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
          <p className="text-gray-300 mt-2 text-sm sm:text-base">
            Test action validation, dice rolling, and combat detection in a controlled environment.
          </p>
        </div>

        {/* Test Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Character Class Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Character Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="fantasy-input"
              >
                <option value="Fighter">⚔️ Fighter</option>
                <option value="Wizard">🔮 Wizard</option>
                <option value="Rogue">🗡️ Rogue</option>
                <option value="Cleric">⛪ Cleric</option>
                <option value="Ranger">🏹 Ranger</option>
                <option value="Paladin">️ Paladin</option>
              </select>
              
              {/* Character Stats Display */}
              <div className="mt-3 p-3 bg-gray-700 border border-gray-600 rounded-lg">
                <h4 className="font-semibold text-gray-100 mb-2">{testCharacter.name}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong className="text-gray-200">HP:</strong> <span className="text-gray-300">{testCharacter.hp}/{testCharacter.maxHp}</span></div>
                  <div><strong className="text-gray-200">AC:</strong> <span className="text-gray-300">{testCharacter.ac}</span></div>
                  <div><strong className="text-gray-200">STR:</strong> <span className="text-gray-300">{testCharacter.strength}</span></div>
                  <div><strong className="text-gray-200">DEX:</strong> <span className="text-gray-300">{testCharacter.dexterity}</span></div>
                  <div><strong className="text-gray-200">CON:</strong> <span className="text-gray-300">{testCharacter.constitution}</span></div>
                  <div><strong className="text-gray-200">INT:</strong> <span className="text-gray-300">{testCharacter.intelligence}</span></div>
                  <div><strong className="text-gray-200">WIS:</strong> <span className="text-gray-300">{testCharacter.wisdom}</span></div>
                  <div><strong className="text-gray-200">CHA:</strong> <span className="text-gray-300">{testCharacter.charisma}</span></div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  <strong>Equipment:</strong> {testCharacter.equipment.weapon.name}, {testCharacter.equipment.armor.name}
                </div>
              </div>
            </div>

            {/* Test Scenarios */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Quick Test Scenarios
              </label>
              <div className="space-y-2">
                {testScenarios.map((scenario, index) => (
                  <button
                    key={index}
                    onClick={() => loadTestScenario(scenario)}
                    className="w-full p-3 text-left bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <div className="font-medium text-gray-100">{scenario.name}</div>
                    <div className="text-sm text-gray-300 mt-1">
                      {scenario.storyContext.substring(0, 80)}...
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Story Context
              </label>
              <textarea
                value={storyContext}
                onChange={(e) => setStoryContext(e.target.value)}
                placeholder="Describe the environment, NPCs, and circumstances. For example: 'In a dark, misty swamp, a Drowned Priest emerges from the water, chanting dark spells. The air is thick with malevolence.'"
                className="fantasy-input h-32 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Character Action
              </label>
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Describe any action your character would take. The system will analyze it for skill checks, combat actions, or story interactions."
                className="fantasy-input h-24 resize-none"
              />
            </div>

            <button
              onClick={handleTestMessage}
              disabled={!testInput.trim()}
              className="w-full fantasy-button bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Test Action
            </button>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {testResult && (
              <div className="fantasy-card">
                <div className="flex items-center mb-4">
                  {testResult.type === 'combat' && (
                    <span className="text-2xl mr-2">⚔️</span>
                  )}
                  <h3 className="text-lg font-semibold text-gray-100">
                    {testResult.type === 'combat' ? 'Combat Detected' : 
                     testResult.type === 'story' ? 'Story Response' : 
                     testResult.type === 'invalid' ? 'Invalid Action' : 'Test Result'}
                  </h3>
                </div>
                
                <div className="prose max-w-none">
                  <p className="text-gray-300 mb-4">{testResult.message}</p>
                  
                  {testResult.type === 'combat' && (
                    <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                      <h4 className="text-lg font-bold text-red-400">Combat Initiated!</h4>
                      <p className="text-red-300 mb-2">
                        Enemy Type: {testResult.enemyType}
                      </p>
                      <div className="space-y-2">
                        {testResult.enemies.map((enemy, index) => (
                          <div key={index} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                            <span className="font-medium text-gray-100">{enemy.name}</span>
                            <span className="text-sm text-gray-300">
                              HP: {enemy.hp} | AC: {enemy.ac} | Level: {enemy.level}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => navigate('/combat', { 
                          state: { 
                            isTestCombat: true,
                            partyMembers: [testCharacter],
                            enemies: testResult.enemies,
                            storyContext: testResult.storyContext
                          }
                        })}
                        className="mt-3 fantasy-button bg-red-600 hover:bg-red-700"
                      >
                        Enter Combat
                      </button>
                    </div>
                  )}
                  
                  {testResult.context && (
                    <div className="mt-4 space-y-2">
                      <h5 className="font-semibold text-gray-100">Context Analysis:</h5>
                      {testResult.context.environmentalFeatures.length > 0 && (
                        <p className="text-gray-300"><strong>Environment:</strong> {testResult.context.environmentalFeatures.join(', ')}</p>
                      )}
                      {testResult.context.npcs.length > 0 && (
                        <p className="text-gray-300"><strong>NPCs:</strong> {testResult.context.npcs.map(npc => `${npc.name} (${npc.role})`).join(', ')}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {showActionValidation && validationResult && (
          <ActionValidationDisplay
            result={validationResult}
            onClose={handleActionValidationClose}
            onProceed={handleActionProceed}
            onRevise={handleActionRevise}
          />
        )}

        {showDiceRoll && diceResult && (
          <DiceRollDisplay
            result={diceResult}
            onClose={handleDiceRollClose}
            onProceed={handleActionProceed}
            onRevise={handleActionRevise}
          />
        )}

        {showMultipleAttempts && multipleAttemptsResult && (
          <MultipleAttemptsDisplay
            result={multipleAttemptsResult}
            onClose={() => setShowMultipleAttempts(false)}
          />
        )}
      </div>
    </div>
  );
} 