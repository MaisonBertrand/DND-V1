// Action Validation Service
// Handles validation of player actions and maintains story coherence

import { manualDiceRoller } from './manualCombat.js';

export class ActionValidationService {
  constructor() {
    this.diceService = manualDiceRoller;
    
    // Story coherence rules
    this.storyRules = {
      // Actions that should be gently redirected
      redirectPatterns: [
        {
          pattern: /\b(?:i\s+)?(?:do|perform|execute)\s+\d+\s+(?:backflips?|somersaults?|cartwheels?)\b/gi,
          response: "While impressive acrobatics are possible, let's focus on actions that advance the story. What's your main goal here?",
          suggestion: "Try describing a more focused action that helps with the current situation."
        },
        {
          pattern: /\b(?:i\s+)?(?:fly|levitate|float)\s+(?:to|up|over|across)\b/gi,
          response: "Flight isn't currently possible in this situation. What are you trying to achieve?",
          suggestion: "Consider climbing, jumping, or finding another way to reach your destination."
        },
        {
          pattern: /\b(?:i\s+)?(?:grab|take|steal)\s+(?:the\s+)?(?:quest\s+item|treasure|artifact)\s+(?:from\s+)?(?:nowhere|thin\s+air)\b/gi,
          response: "The quest item isn't just lying around. You'll need to find it through exploration and investigation.",
          suggestion: "Try searching the area, asking NPCs, or following clues to locate the item."
        },
        {
          pattern: /\b(?:i\s+)?(?:attack|kill|destroy)\s+(?:everyone|all|each)\s+(?:enemy|person|creature)\b/gi,
          response: "While combat is possible, attacking everyone at once isn't practical. Let's focus on the immediate threat.",
          suggestion: "Choose a specific target or describe a more strategic approach."
        }
      ],
      
      // Actions that should be expanded upon
      expandPatterns: [
        {
          pattern: /\b(?:i\s+)?(?:search|look|examine)\b/gi,
          response: "What specifically are you searching for or looking at?",
          suggestion: "Be more specific about what you're searching for or examining."
        },
        {
          pattern: /\b(?:i\s+)?(?:talk|speak|ask)\b/gi,
          response: "Who would you like to talk to, and what would you like to discuss?",
          suggestion: "Specify the person and topic of conversation."
        },
        {
          pattern: /\b(?:i\s+)?(?:go|move|walk)\b/gi,
          response: "Where would you like to go?",
          suggestion: "Specify your destination or direction."
        }
      ],
      
      // Actions that should be encouraged
      encouragePatterns: [
        {
          pattern: /\b(?:i\s+)?(?:investigate|explore|examine)\b/gi,
          response: "Great! Investigation and exploration are key to advancing the story.",
          suggestion: "What specific aspect would you like to investigate?"
        },
        {
          pattern: /\b(?:i\s+)?(?:help|assist|aid)\b/gi,
          response: "Helping others is always a noble choice. Who would you like to help?",
          suggestion: "Specify who needs help and how you can assist them."
        },
        {
          pattern: /\b(?:i\s+)?(?:negotiate|diplomacy|peace)\b/gi,
          response: "Diplomacy can often achieve more than violence. Good thinking!",
          suggestion: "How would you like to approach the negotiation?"
        }
      ]
    };

    // Context-aware responses
    this.contextResponses = {
      combat: {
        impossible: "That action isn't possible in combat. Focus on your available combat options.",
        difficult: "That's a challenging action in combat. Are you sure you want to attempt it?",
        strategic: "That's a good strategic choice. How do you want to execute it?"
      },
      exploration: {
        impossible: "That action doesn't make sense in this environment. What are you trying to achieve?",
        difficult: "That will be challenging given the current circumstances.",
        strategic: "That's a good approach to exploration. Let's see how it goes."
      },
      social: {
        impossible: "That action isn't appropriate in this social situation.",
        difficult: "That's a bold social move. Are you prepared for the consequences?",
        strategic: "That's a good approach to the situation. How do you want to proceed?"
      }
    };
  }

  // Validate a player action
  validatePlayerAction(actionDescription, character, context = {}) {
    const description = actionDescription.toLowerCase();
    
    // First, check for impossible actions
    const impossibleCheck = this.checkImpossibleActions(description);
    if (!impossibleCheck.possible) {
      return {
        valid: false,
        type: 'impossible',
        response: impossibleCheck.response,
        suggestion: impossibleCheck.suggestion,
        diceResult: null
      };
    }

    // Check for actions that need redirection
    const redirectCheck = this.checkRedirectPatterns(description);
    if (redirectCheck.needsRedirect) {
      return {
        valid: false,
        type: 'redirect',
        response: redirectCheck.response,
        suggestion: redirectCheck.suggestion,
        diceResult: null
      };
    }

    // Check for actions that need expansion
    const expandCheck = this.checkExpandPatterns(description);
    if (expandCheck.needsExpansion) {
      return {
        valid: false,
        type: 'expand',
        response: expandCheck.response,
        suggestion: expandCheck.suggestion,
        diceResult: null
      };
    }

    // If action is valid, perform dice checks
    const diceResult = this.diceService.validateAction(actionDescription, character, context);
    
    return {
      valid: true,
      type: 'valid',
      response: this.generateValidationResponse(diceResult, character, context),
      suggestion: diceResult.suggestion,
      diceResult: diceResult
    };
  }

  // Check for impossible actions
  checkImpossibleActions(description) {
    for (const pattern of this.diceService.impossibleActionPatterns) {
      if (pattern.test(description)) {
        return {
          possible: false,
          response: "That action is beyond the realm of possibility in this world.",
          suggestion: "Try a more realistic approach that fits within the story and your character's abilities."
        };
      }
    }
    
    return { possible: true };
  }

  // Check for actions that need redirection
  checkRedirectPatterns(description) {
    for (const rule of this.storyRules.redirectPatterns) {
      if (rule.pattern.test(description)) {
        return {
          needsRedirect: true,
          response: rule.response,
          suggestion: rule.suggestion
        };
      }
    }
    
    return { needsRedirect: false };
  }

  // Check for actions that need expansion
  checkExpandPatterns(description) {
    for (const rule of this.storyRules.expandPatterns) {
      if (rule.pattern.test(description)) {
        return {
          needsExpansion: true,
          response: rule.response,
          suggestion: rule.suggestion
        };
      }
    }
    
    return { needsExpansion: false };
  }

  // Generate validation response
  generateValidationResponse(diceResult, character, context) {
    if (!diceResult.overallSuccess) {
      const failures = diceResult.actions.filter(action => !action.check.isSuccess);
      const criticalFailures = failures.filter(action => action.check.degree === 'critical failure');
      
      if (criticalFailures.length > 0) {
        return `The actions you described are beyond your current capabilities. ${diceResult.suggestion}`;
      } else {
        return `The actions you described are challenging but possible. ${diceResult.suggestion}`;
      }
    }
    
    // Generate atmospheric response
    const atmosphericResponse = this.generateAtmosphericResponse(diceResult, character, context);
    
    // Extract entities from the response
    const extractedEntities = this.extractEntities(atmosphericResponse, context);
    
    return {
      story: atmosphericResponse,
      entities: extractedEntities
    };
  }

  // Generate atmospheric, story-driven response
  generateAtmosphericResponse(diceResult, character, context) {
    const { actions, overallSuccess, hasCriticalFailures } = diceResult;
    const customContext = context?.customContext;
    
    // Base atmospheric elements
    let atmosphere = this.getAtmosphericElements(customContext);
    let tension = this.calculateTensionLevel(actions, hasCriticalFailures);
    
    // Generate narrative response
    let response = '';
    
    if (actions.length === 1) {
      response = this.generateSingleActionResponse(actions[0], character, atmosphere, tension);
    } else {
      response = this.generateMultiActionResponse(actions, character, atmosphere, tension);
    }
    
    // Add environmental details
    if (customContext && customContext.environmentalFeatures) {
      response += this.addEnvironmentalDetails(customContext.environmentalFeatures, tension);
    }
    
    // Add NPC reactions if present
    if (customContext && customContext.npcs) {
      response += this.addNPCReactions(customContext.npcs, actions, overallSuccess);
    }
    
    // Add story progression hook
    response += this.addStoryProgressionHook(actions, tension, customContext);
    
    return response;
  }

  // Get atmospheric elements from context
  getAtmosphericElements(customContext) {
    const atmosphere = {
      lighting: 'dim',
      weather: 'calm',
      mood: 'neutral',
      tension: 'low'
    };
    
    if (!customContext) return atmosphere;
    
    const context = customContext.description.toLowerCase();
    
    // Lighting
    if (context.includes('dark') || context.includes('shadow')) atmosphere.lighting = 'dark';
    if (context.includes('bright') || context.includes('sunlight')) atmosphere.lighting = 'bright';
    if (context.includes('dim') || context.includes('flickering')) atmosphere.lighting = 'dim';
    
    // Weather
    if (context.includes('storm') || context.includes('rain')) atmosphere.weather = 'stormy';
    if (context.includes('fog') || context.includes('mist')) atmosphere.weather = 'foggy';
    if (context.includes('wind')) atmosphere.weather = 'windy';
    
    // Mood
    if (context.includes('tension') || context.includes('danger')) atmosphere.mood = 'tense';
    if (context.includes('peaceful') || context.includes('calm')) atmosphere.mood = 'peaceful';
    if (context.includes('eerie') || context.includes('creepy')) atmosphere.mood = 'eerie';
    
    return atmosphere;
  }

  // Calculate tension level based on actions and results
  calculateTensionLevel(actions, hasCriticalFailures) {
    let tension = 'low';
    
    // Combat actions increase tension
    const combatActions = actions.filter(action => 
      ['attack', 'spell', 'dodge', 'parry'].includes(action.action)
    );
    
    if (combatActions.length > 0) tension = 'medium';
    if (combatActions.length > 2) tension = 'high';
    if (hasCriticalFailures) tension = 'critical';
    
    return tension;
  }

  // Generate response for single action
  generateSingleActionResponse(action, character, atmosphere, tension) {
    const { action: actionType, check, keyword } = action;
    const isSuccess = check.isSuccess;
    const degree = check.degree;
    
    const responses = {
      attack: {
        success: {
          low: `${character.name} strikes true, the blow landing with satisfying impact.`,
          medium: `${character.name}'s weapon finds its mark, the strike ringing out in the ${atmosphere.lighting} light.`,
          high: `${character.name} delivers a devastating blow, the force of the attack echoing through the ${atmosphere.weather} air.`,
          critical: `${character.name} executes a perfect strike, the precision of the attack leaving no room for error.`
        },
        failure: {
          low: `${character.name} swings wide, the attack missing its intended target.`,
          medium: `${character.name}'s strike goes awry, the weapon clattering against stone or wood.`,
          high: `${character.name} completely misses, the failed attack leaving them momentarily vulnerable.`,
          critical: `${character.name} stumbles in their attack, the botched strike nearly causing them to fall.`
        }
      },
      backflip: {
        success: {
          low: `${character.name} executes a graceful backflip, landing softly on their feet.`,
          medium: `${character.name} performs an impressive backflip, the acrobatic feat drawing attention.`,
          high: `${character.name} completes a spectacular backflip, the display of agility leaving onlookers amazed.`,
          critical: `${character.name} achieves a flawless backflip, the perfect form and landing drawing gasps of admiration.`
        },
        failure: {
          low: `${character.name} attempts a backflip but loses balance, stumbling slightly.`,
          medium: `${character.name} fails the backflip, landing awkwardly and looking embarrassed.`,
          high: `${character.name} completely botches the backflip, falling hard to the ground.`,
          critical: `${character.name} crashes spectacularly during the backflip, potentially injuring themselves.`
        }
      },
      search: {
        success: {
          low: `${character.name} searches carefully, their trained eyes picking up subtle details.`,
          medium: `${character.name} conducts a thorough search, methodically examining every corner.`,
          high: `${character.name} performs an exhaustive search, their attention to detail revealing hidden secrets.`,
          critical: `${character.name} discovers something extraordinary, their keen observation uncovering a crucial clue.`
        },
        failure: {
          low: `${character.name} looks around but finds nothing of interest.`,
          medium: `${character.name} searches but misses several obvious details.`,
          high: `${character.name} fails to notice important clues, their search proving fruitless.`,
          critical: `${character.name} overlooks critical information, their poor search skills costing them dearly.`
        }
      },
      persuade: {
        success: {
          low: `${character.name} makes a reasonable argument, their words carrying some weight.`,
          medium: `${character.name} presents a compelling case, their charisma swaying the listener.`,
          high: `${character.name} delivers a masterful persuasion, their words impossible to ignore.`,
          critical: `${character.name} achieves the impossible, their silver tongue turning enemies into allies.`
        },
        failure: {
          low: `${character.name} tries to persuade but fails to make a convincing argument.`,
          medium: `${character.name}'s attempt at persuasion falls flat, their words lacking impact.`,
          high: `${character.name} completely fails to persuade, their poor communication skills evident.`,
          critical: `${character.name} not only fails to persuade but manages to offend the listener.`
        }
      }
    };
    
    const actionResponses = responses[actionType] || responses.attack;
    const successLevel = isSuccess ? 'success' : 'failure';
    const tensionLevel = tension === 'critical' ? 'high' : tension;
    
    return actionResponses[successLevel][tensionLevel];
  }

  // Generate response for multiple actions
  generateMultiActionResponse(actions, character, atmosphere, tension) {
    const actionCount = actions.length;
    const successCount = actions.filter(a => a.check.isSuccess).length;
    const failureCount = actionCount - successCount;
    
    if (successCount === actionCount) {
      return `${character.name} executes a flawless sequence of actions, each movement flowing seamlessly into the next. The display of skill and coordination is impressive to behold.`;
    } else if (successCount > failureCount) {
      return `${character.name} performs admirably, with most actions succeeding despite the challenging circumstances. A few missteps don't diminish the overall effectiveness.`;
    } else if (failureCount > successCount) {
      return `${character.name} struggles with the complex sequence, many actions failing to achieve their intended results. The difficulty of the task proves overwhelming.`;
    } else {
      return `${character.name} has mixed results, with some actions succeeding while others fail. The outcome remains uncertain.`;
    }
  }

  // Add environmental details to response
  addEnvironmentalDetails(features, tension) {
    if (features.length === 0) return '';
    
    const environmentalResponses = {
      dark: {
        low: ' The darkness seems to swallow sound, making every movement feel more significant.',
        medium: ' Shadows dance in the darkness, creating an atmosphere of uncertainty.',
        high: ' The oppressive darkness makes every action feel more dangerous and urgent.',
        critical: ' The pitch-black environment amplifies every sound, every movement potentially deadly.'
      },
      stormy: {
        low: ' Rain patters against surfaces, adding a rhythmic backdrop to the scene.',
        medium: ' The storm intensifies, wind and rain making movement more challenging.',
        high: ' The raging storm creates a chaotic environment where every action is a gamble.',
        critical: ' The violent storm threatens to overwhelm all but the most determined efforts.'
      },
      foggy: {
        low: ' Mist swirls gently, obscuring distant details.',
        medium: ' The fog thickens, reducing visibility and creating an eerie atmosphere.',
        high: ' Dense fog makes navigation difficult and every shadow a potential threat.',
        critical: ' The impenetrable fog isolates you completely, each step into the unknown.'
      }
    };
    
    let response = '';
    features.forEach(feature => {
      if (environmentalResponses[feature]) {
        response += environmentalResponses[feature][tension] || '';
      }
    });
    
    return response;
  }

  // Add NPC reactions
  addNPCReactions(npcs, actions, overallSuccess) {
    if (npcs.length === 0) return '';
    
    const npcNames = npcs.map(npc => npc.name).join(' and ');
    
    if (overallSuccess) {
      return ` ${npcNames} watch with growing interest, clearly impressed by your actions.`;
    } else {
      return ` ${npcNames} exchange concerned glances, their confidence in your abilities wavering.`;
    }
  }

  // Add story progression hook
  addStoryProgressionHook(actions, tension, customContext) {
    const hasCombatActions = actions.some(a => ['attack', 'spell', 'dodge', 'parry'].includes(a.action));
    const hasExplorationActions = actions.some(a => ['search', 'climb', 'jump'].includes(a.action));
    const hasSocialActions = actions.some(a => ['persuade', 'intimidate', 'deceive'].includes(a.action));
    
    if (hasCombatActions && tension === 'high') {
      return ' The tension in the air is palpable. Something is about to happen...';
    } else if (hasExplorationActions) {
      return ' Your investigation reveals new possibilities. What will you discover next?';
    } else if (hasSocialActions) {
      return ' The social dynamics shift with your words. How will others respond?';
    } else {
      return ' The situation continues to unfold. What will you do next?';
    }
  }

  // Generate story-appropriate response
  generateStoryResponse(actionDescription, character, context = {}) {
    const validation = this.validatePlayerAction(actionDescription, character, context);
    
    if (!validation.valid) {
      return {
        response: validation.response,
        suggestion: validation.suggestion,
        shouldProceed: false,
        diceResult: null
      };
    }

    // Generate narrative for successful actions
    const narratives = [];
    if (validation.diceResult.actions) {
      validation.diceResult.actions.forEach(action => {
        const narrative = this.diceService.generateActionNarrative(action.check, character);
        narratives.push(narrative);
      });
    }

    return {
      response: narratives.join(' '),
      suggestion: validation.suggestion,
      shouldProceed: true,
      diceResult: validation.diceResult
    };
  }

  // Handle complex action sequences
  handleComplexAction(actionDescription, character, context = {}) {
    const actions = this.diceService.extractActionsFromDescription(actionDescription.toLowerCase());
    
    if (actions.length === 0) {
      return {
        response: "I understand your intent. Let's see how this plays out in the story.",
        shouldProceed: true,
        type: 'narrative'
      };
    }

    if (actions.length === 1) {
      return this.generateStoryResponse(actionDescription, character, context);
    }

    // Handle multiple actions
    const sequenceResult = this.diceService.performActionSequence(character, actions, context);
    
    if (sequenceResult.overallSuccess) {
      const narratives = sequenceResult.actions.map(action => 
        this.diceService.generateActionNarrative(action.check, character)
      );
      
      return {
        response: narratives.join(' '),
        shouldProceed: true,
        type: 'sequence',
        diceResult: sequenceResult
      };
    } else {
      const failures = sequenceResult.actions.filter(action => !action.check.isSuccess);
      const criticalFailures = failures.filter(action => action.check.degree === 'critical failure');
      
      if (criticalFailures.length > 0) {
        return {
          response: "The sequence of actions you described is too complex for your current abilities. Try breaking it down into simpler steps.",
          shouldProceed: false,
          type: 'sequence_failure',
          diceResult: sequenceResult
        };
      } else {
        return {
          response: "Some parts of your action sequence are challenging. You might want to simplify your approach.",
          shouldProceed: false,
          type: 'sequence_partial',
          diceResult: sequenceResult
        };
      }
    }
  }

  // Provide alternative suggestions
  provideAlternatives(actionDescription, character, context = {}) {
    const description = actionDescription.toLowerCase();
    const alternatives = [];

    // Check for common action patterns and suggest alternatives
    if (description.includes('backflip') || description.includes('somersault')) {
      alternatives.push({
        action: 'dodge',
        description: 'Try dodging or evading instead of acrobatics',
        difficulty: 'easier'
      });
    }

    if (description.includes('fly') || description.includes('levitate')) {
      alternatives.push({
        action: 'climb',
        description: 'Try climbing or finding another way up',
        difficulty: 'realistic'
      });
    }

    if (description.includes('attack everyone')) {
      alternatives.push({
        action: 'focus',
        description: 'Focus on one target at a time for better effectiveness',
        difficulty: 'strategic'
      });
    }

    if (description.includes('grab quest item')) {
      alternatives.push({
        action: 'search',
        description: 'Search the area thoroughly to find the item',
        difficulty: 'appropriate'
      });
    }

    return alternatives;
  }

  // Maintain story coherence
  maintainStoryCoherence(actionDescription, currentStoryState, character) {
    const coherenceChecks = {
      // Check if action fits current story phase
      storyPhase: this.checkStoryPhase(actionDescription, currentStoryState),
      
      // Check if action respects established facts
      establishedFacts: this.checkEstablishedFacts(actionDescription, currentStoryState),
      
      // Check if action advances the plot
      plotAdvancement: this.checkPlotAdvancement(actionDescription, currentStoryState),
      
      // Check if action respects character development
      characterDevelopment: this.checkCharacterDevelopment(actionDescription, character)
    };

    const issues = Object.entries(coherenceChecks)
      .filter(([key, check]) => !check.valid)
      .map(([key, check]) => check.issue);

    return {
      coherent: issues.length === 0,
      issues,
      suggestions: this.generateCoherenceSuggestions(issues, currentStoryState)
    };
  }

  // Check if action fits current story phase
  checkStoryPhase(actionDescription, storyState) {
    const phase = storyState.phase || 'exploration';
    const description = actionDescription.toLowerCase();

    const phaseInappropriateActions = {
      'introduction': ['attack', 'kill', 'destroy'],
      'exploration': ['end quest', 'skip to boss'],
      'combat': ['negotiate peace', 'run away'],
      'resolution': ['start new quest', 'begin adventure']
    };

    const inappropriate = phaseInappropriateActions[phase] || [];
    const hasInappropriate = inappropriate.some(action => description.includes(action));

    return {
      valid: !hasInappropriate,
      issue: hasInappropriate ? `This action doesn't fit the current story phase (${phase})` : null
    };
  }

  // Check if action respects established facts
  checkEstablishedFacts(actionDescription, storyState) {
    const facts = storyState.establishedFacts || [];
    const description = actionDescription.toLowerCase();

    for (const fact of facts) {
      if (fact.contradicts && fact.contradicts.some(pattern => 
        description.includes(pattern.toLowerCase())
      )) {
        return {
          valid: false,
          issue: `This action contradicts established story facts: ${fact.description}`
        };
      }
    }

    return { valid: true };
  }

  // Check if action advances the plot
  checkPlotAdvancement(actionDescription, storyState) {
    const plotPoints = storyState.plotPoints || [];
    const description = actionDescription.toLowerCase();

    // Check if action addresses current plot point
    const currentPlotPoint = plotPoints.find(point => point.active);
    if (currentPlotPoint && currentPlotPoint.keywords) {
      const addressesPlot = currentPlotPoint.keywords.some(keyword => 
        description.includes(keyword.toLowerCase())
      );

      if (!addressesPlot) {
        return {
          valid: false,
          issue: "This action doesn't address the current plot point"
        };
      }
    }

    return { valid: true };
  }

  // Check if action respects character development
  checkCharacterDevelopment(actionDescription, character) {
    const alignment = character.alignment || 'Neutral';
    const description = actionDescription.toLowerCase();

    const alignmentInappropriateActions = {
      'Lawful Good': ['steal', 'deceive', 'harm innocent'],
      'Chaotic Evil': ['help others', 'follow rules', 'show mercy'],
      'Neutral Good': ['harm innocent', 'betray allies'],
      'Lawful Evil': ['break laws', 'show mercy', 'help weak'],
      'Chaotic Good': ['follow strict rules', 'harm innocent'],
      'True Neutral': ['take extreme actions', 'show strong emotions'],
      'Lawful Neutral': ['break laws', 'show mercy', 'act chaotically'],
      'Neutral Evil': ['help others', 'follow laws', 'show mercy'],
      'Chaotic Neutral': ['follow strict rules', 'show strong loyalty']
    };

    const inappropriate = alignmentInappropriateActions[alignment] || [];
    const hasInappropriate = inappropriate.some(action => description.includes(action));

    return {
      valid: !hasInappropriate,
      issue: hasInappropriate ? `This action doesn't align with your character's alignment (${alignment})` : null
    };
  }

  // Generate coherence suggestions
  generateCoherenceSuggestions(issues, storyState) {
    const suggestions = [];

    issues.forEach(issue => {
      if (issue.includes('story phase')) {
        suggestions.push("Consider actions that fit the current phase of the story.");
      } else if (issue.includes('established facts')) {
        suggestions.push("Remember what has already been established in the story.");
      } else if (issue.includes('plot point')) {
        suggestions.push("Focus on actions that advance the current plot.");
      } else if (issue.includes('alignment')) {
        suggestions.push("Consider actions that align with your character's moral compass.");
      }
    });

    return suggestions;
  }

  // Extract entities from DM response
  extractEntities(response, context = {}) {
    const entities = {
      enemies: [],
      items: [],
      locations: [],
      statusEffects: [],
      questHooks: [],
      npcs: []
    };

    const responseLower = response.toLowerCase();
    
    // Extract enemies
    const enemyPatterns = [
      // Named enemies with titles
      /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:the\s+)?(?:priest|wizard|mage|sorcerer|warlock|necromancer|lich|vampire|werewolf|ghost|spirit|demon|devil|fiend|beast|creature|monster|boss|mini-boss)/gi,
      // Generic enemy types
      /\b(goblin|orc|troll|dragon|bandit|skeleton|zombie|ghost|spirit|demon|devil|fiend|beast|creature|monster)\b/gi,
      // Boss patterns
      /(?:mini-boss|boss)\s*[–-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      // Combat trigger patterns
      /\[Combat\s+Trigger[^]]*[–-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\]/gi
    ];

    enemyPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const name = match[1] || match[0];
        if (name && !entities.enemies.some(e => e.name.toLowerCase() === name.toLowerCase())) {
          entities.enemies.push({
            name: name,
            type: 'enemy',
            subtype: this.determineEnemySubtype(name, response),
            status: this.determineEnemyStatus(name, response)
          });
        }
      }
    });

    // Extract items
    const itemPatterns = [
      // Magical items
      /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:of\s+[A-Z][a-z]+)/gi,
      // Weapons and equipment
      /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:sword|dagger|staff|wand|scroll|potion|ring|amulet|crown|robe|armor|shield)/gi,
      // Cursed items
      /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:cursed|forbidden|ancient|legendary)/gi
    ];

    itemPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const name = match[1] || match[0];
        if (name && !entities.items.some(i => i.name.toLowerCase() === name.toLowerCase())) {
          entities.items.push({
            name: name,
            type: 'item',
            subtype: this.determineItemSubtype(name, response),
            status: this.determineItemStatus(name, response)
          });
        }
      }
    });

    // Extract locations
    const locationPatterns = [
      // Named locations
      /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:shrine|temple|castle|tower|dungeon|cave|tunnel|chamber|room|hall|garden|forest|mountain|river|lake|ocean|tavern|inn)/gi,
      // Geographic features
      /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:cliffs|beach|island|valley|peak|summit|depths|heights)/gi
    ];

    locationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const name = match[1] || match[0];
        if (name && !entities.locations.some(l => l.name.toLowerCase() === name.toLowerCase())) {
          entities.locations.push({
            name: name,
            type: 'location',
            subtype: this.determineLocationSubtype(name, response),
            tags: this.determineLocationTags(name, response)
          });
        }
      }
    });

    // Extract status effects
    const statusPatterns = [
      // Curses and magical effects
      /(?:cursed|blessed|enchanted|poisoned|paralyzed|charmed|frightened|invisible|ethereal|ethereal|flying|levitating)/gi,
      // Environmental effects
      /(?:in\s+darkness|in\s+bright\s+light|under\s+pressure|in\s+a\s+hurry|carefully|stealthily|aggressively|defensively)/gi
    ];

    statusPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const effect = match[0];
        if (effect && !entities.statusEffects.some(s => s.name.toLowerCase() === effect.toLowerCase())) {
          entities.statusEffects.push({
            name: effect,
            type: 'status_effect',
            effect: this.determineStatusEffect(effect, response)
          });
        }
      }
    });

    // Extract quest hooks
    const questPatterns = [
      // Primary objectives
      /(?:break|destroy|find|retrieve|defeat|save|protect|escort|investigate|explore)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      // Quest keywords
      /(?:quest|mission|objective|goal|task|duty|responsibility)/gi
    ];

    questPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const hook = match[1] || match[0];
        if (hook && !entities.questHooks.some(q => q.name.toLowerCase() === hook.toLowerCase())) {
          entities.questHooks.push({
            name: hook,
            type: 'quest_hook',
            objective: this.determineQuestObjective(hook, response)
          });
        }
      }
    });

    // Extract NPCs (non-enemy)
    const npcPatterns = [
      // Friendly NPCs
      /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:merchant|trader|noble|lord|lady|king|queen|prince|princess|mayor|priest|shaman|hunter|fisherman|farmer)/gi,
      // Quest givers
      /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:quest\s+giver|guide|mentor|teacher|master)/gi
    ];

    npcPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const name = match[1] || match[0];
        if (name && !entities.npcs.some(n => n.name.toLowerCase() === name.toLowerCase())) {
          entities.npcs.push({
            name: name,
            type: 'npc',
            role: this.determineNPCRole(name, response),
            disposition: 'friendly'
          });
        }
      }
    });

    return entities;
  }

  // Helper methods for determining entity properties
  determineEnemySubtype(name, response) {
    const responseLower = response.toLowerCase();
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('boss') || nameLower.includes('mini-boss')) return 'boss';
    if (nameLower.includes('priest') || nameLower.includes('cleric')) return 'priest';
    if (nameLower.includes('wizard') || nameLower.includes('mage')) return 'wizard';
    if (nameLower.includes('dragon')) return 'dragon';
    if (nameLower.includes('undead') || nameLower.includes('skeleton') || nameLower.includes('zombie')) return 'undead';
    if (nameLower.includes('goblin') || nameLower.includes('orc') || nameLower.includes('troll')) return 'monster';
    
    return 'enemy';
  }

  determineEnemyStatus(name, response) {
    const responseLower = response.toLowerCase();
    
    if (responseLower.includes('snarls') || responseLower.includes('aggressive')) return 'hostile';
    if (responseLower.includes('defensive') || responseLower.includes('cautious')) return 'defensive';
    if (responseLower.includes('chanting') || responseLower.includes('casting')) return 'casting';
    
    return 'active';
  }

  determineItemSubtype(name, response) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('sword') || nameLower.includes('dagger') || nameLower.includes('staff')) return 'weapon';
    if (nameLower.includes('potion') || nameLower.includes('scroll')) return 'consumable';
    if (nameLower.includes('ring') || nameLower.includes('amulet') || nameLower.includes('crown')) return 'accessory';
    if (nameLower.includes('armor') || nameLower.includes('robe') || nameLower.includes('shield')) return 'armor';
    
    return 'item';
  }

  determineItemStatus(name, response) {
    const responseLower = response.toLowerCase();
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('cursed') || responseLower.includes('cursed')) return 'cursed';
    if (nameLower.includes('forbidden') || responseLower.includes('forbidden')) return 'forbidden';
    if (nameLower.includes('ancient') || responseLower.includes('ancient')) return 'ancient';
    if (nameLower.includes('legendary') || responseLower.includes('legendary')) return 'legendary';
    if (responseLower.includes('magical') || responseLower.includes('enchanted')) return 'magical';
    
    return 'normal';
  }

  determineLocationSubtype(name, response) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('shrine') || nameLower.includes('temple')) return 'religious';
    if (nameLower.includes('castle') || nameLower.includes('tower')) return 'fortification';
    if (nameLower.includes('cave') || nameLower.includes('tunnel')) return 'underground';
    if (nameLower.includes('forest') || nameLower.includes('garden')) return 'natural';
    if (nameLower.includes('tavern') || nameLower.includes('inn')) return 'settlement';
    
    return 'location';
  }

  determineLocationTags(name, response) {
    const tags = [];
    const responseLower = response.toLowerCase();
    
    if (responseLower.includes('ancient') || responseLower.includes('old')) tags.push('ancient');
    if (responseLower.includes('dangerous') || responseLower.includes('hostile')) tags.push('dangerous');
    if (responseLower.includes('sacred') || responseLower.includes('holy')) tags.push('sacred');
    if (responseLower.includes('cursed') || responseLower.includes('evil')) tags.push('cursed');
    if (responseLower.includes('coastal') || responseLower.includes('ocean')) tags.push('coastal');
    if (responseLower.includes('mountain') || responseLower.includes('high')) tags.push('mountainous');
    
    return tags;
  }

  determineStatusEffect(effect, response) {
    const effectLower = effect.toLowerCase();
    
    if (effectLower.includes('cursed')) return 'disables healing';
    if (effectLower.includes('poisoned')) return 'damage over time';
    if (effectLower.includes('paralyzed')) return 'prevents movement';
    if (effectLower.includes('charmed')) return 'mind control';
    if (effectLower.includes('invisible')) return 'stealth bonus';
    if (effectLower.includes('flying')) return 'flight ability';
    
    return 'unknown effect';
  }

  determineQuestObjective(hook, response) {
    const hookLower = hook.toLowerCase();
    
    if (hookLower.includes('break') || hookLower.includes('destroy')) return 'destruction';
    if (hookLower.includes('find') || hookLower.includes('retrieve')) return 'retrieval';
    if (hookLower.includes('defeat') || hookLower.includes('kill')) return 'combat';
    if (hookLower.includes('save') || hookLower.includes('protect')) return 'protection';
    if (hookLower.includes('escort')) return 'escort';
    if (hookLower.includes('investigate') || hookLower.includes('explore')) return 'exploration';
    
    return 'objective';
  }

  determineNPCRole(name, response) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('merchant') || nameLower.includes('trader')) return 'merchant';
    if (nameLower.includes('noble') || nameLower.includes('lord') || nameLower.includes('lady')) return 'noble';
    if (nameLower.includes('king') || nameLower.includes('queen')) return 'royalty';
    if (nameLower.includes('priest') || nameLower.includes('shaman')) return 'religious';
    if (nameLower.includes('quest giver') || nameLower.includes('guide')) return 'quest_giver';
    
    return 'npc';
  }
}

export default ActionValidationService;

// Export singleton instance
export const actionValidationService = new ActionValidationService(); 