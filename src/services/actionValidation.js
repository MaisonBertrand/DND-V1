// Action Validation Service
// Handles validation of player actions and maintains story coherence

import DiceRollingService from './diceRolling.js';

export class ActionValidationService {
  constructor() {
    this.diceService = new DiceRollingService();
    
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
        return `Some of those actions are challenging for you. ${diceResult.suggestion}`;
      }
    }
    
    return "Your planned actions are within your capabilities. Proceed with confidence!";
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
}

export default ActionValidationService; 