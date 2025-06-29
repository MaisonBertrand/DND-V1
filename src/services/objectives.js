// Hidden Objectives Service
// Manages story objectives that are discovered organically through gameplay

// Objective types
export const OBJECTIVE_TYPES = {
  INVESTIGATION: 'investigation',
  COMBAT: 'combat', 
  PERSUASION: 'persuasion',
  EXPLORATION: 'exploration',
  SOCIAL: 'social'
};

// Objective states
export const OBJECTIVE_STATES = {
  HIDDEN: 'hidden',
  DISCOVERED: 'discovered',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Generate hidden objectives based on party theme
export const generateHiddenObjectives = (partyTheme) => {
  const baseObjectives = [
    {
      id: 'investigate_area',
      type: OBJECTIVE_TYPES.INVESTIGATION,
      title: 'Investigate the Area',
      description: 'Search for clues and gather information about the situation',
      keywords: ['search', 'investigate', 'examine', 'look around', 'check', 'explore'],
      state: OBJECTIVE_STATES.HIDDEN,
      discoveredAt: null,
      completedAt: null
    },
    {
      id: 'resolve_conflict',
      type: OBJECTIVE_TYPES.COMBAT,
      title: 'Resolve the Conflict',
      description: 'Engage in combat to overcome the threat',
      keywords: ['fight', 'attack', 'defend', 'combat', 'battle'],
      state: OBJECTIVE_STATES.HIDDEN,
      discoveredAt: null,
      completedAt: null
    },
    {
      id: 'negotiate_peace',
      type: OBJECTIVE_TYPES.PERSUASION,
      title: 'Negotiate Peace',
      description: 'Use diplomacy and persuasion to resolve the situation peacefully',
      keywords: ['talk', 'negotiate', 'persuade', 'convince', 'diplomacy', 'peace'],
      state: OBJECTIVE_STATES.HIDDEN,
      discoveredAt: null,
      completedAt: null
    }
  ];

  // Add theme-specific objectives
  const themeObjectives = [];
  
  if (partyTheme.toLowerCase().includes('thief') || partyTheme.toLowerCase().includes('stealth')) {
    themeObjectives.push({
      id: 'stealth_approach',
      type: OBJECTIVE_TYPES.EXPLORATION,
      title: 'Stealth Approach',
      description: 'Use stealth to avoid detection and gather information',
      keywords: ['sneak', 'stealth', 'hide', 'silent', 'unnoticed'],
      state: OBJECTIVE_STATES.HIDDEN,
      discoveredAt: null,
      completedAt: null
    });
  }
  
  if (partyTheme.toLowerCase().includes('merchant') || partyTheme.toLowerCase().includes('trade')) {
    themeObjectives.push({
      id: 'establish_trade',
      type: OBJECTIVE_TYPES.SOCIAL,
      title: 'Establish Trade Relations',
      description: 'Build economic relationships with the locals',
      keywords: ['trade', 'bargain', 'deal', 'commerce', 'business'],
      state: OBJECTIVE_STATES.HIDDEN,
      discoveredAt: null,
      completedAt: null
    });
  }
  
  if (partyTheme.toLowerCase().includes('scholar') || partyTheme.toLowerCase().includes('knowledge')) {
    themeObjectives.push({
      id: 'gather_knowledge',
      type: OBJECTIVE_TYPES.INVESTIGATION,
      title: 'Gather Ancient Knowledge',
      description: 'Discover and preserve valuable information',
      keywords: ['research', 'study', 'learn', 'knowledge', 'ancient', 'lore'],
      state: OBJECTIVE_STATES.HIDDEN,
      discoveredAt: null,
      completedAt: null
    });
  }

  return [...baseObjectives, ...themeObjectives];
};

// Check if player actions reveal hidden objectives
export const checkObjectiveDiscovery = (playerAction, objectives) => {
  const discoveredObjectives = [];
  
  objectives.forEach(objective => {
    if (objective.state === OBJECTIVE_STATES.HIDDEN) {
      const actionLower = playerAction.toLowerCase();
      const hasMatchingKeyword = objective.keywords.some(keyword => 
        actionLower.includes(keyword.toLowerCase())
      );
      
      if (hasMatchingKeyword) {
        discoveredObjectives.push({
          ...objective,
          state: OBJECTIVE_STATES.DISCOVERED,
          discoveredAt: new Date()
        });
      }
    }
  });
  
  return discoveredObjectives;
};

// Update objective state based on story progression
export const updateObjectiveState = (objectiveId, newState, objectives) => {
  return objectives.map(obj => 
    obj.id === objectiveId 
      ? { 
          ...obj, 
          state: newState,
          completedAt: newState === OBJECTIVE_STATES.COMPLETED ? new Date() : obj.completedAt
        }
      : obj
  );
};

// Get objectives by state
export const getObjectivesByState = (objectives, state) => {
  return objectives.filter(obj => obj.state === state);
};

// Get discovered objectives for UI display
export const getDiscoveredObjectives = (objectives) => {
  return objectives.filter(obj => 
    obj.state === OBJECTIVE_STATES.DISCOVERED || 
    obj.state === OBJECTIVE_STATES.IN_PROGRESS ||
    obj.state === OBJECTIVE_STATES.COMPLETED
  );
};

// Check if all main objectives are completed
export const areMainObjectivesComplete = (objectives) => {
  const mainObjectiveIds = ['investigate_area', 'resolve_conflict', 'negotiate_peace'];
  const mainObjectives = objectives.filter(obj => mainObjectiveIds.includes(obj.id));
  
  return mainObjectives.every(obj => obj.state === OBJECTIVE_STATES.COMPLETED);
};

// Generate subtle hints for hidden objectives
export const generateObjectiveHints = (objectives, storyContext) => {
  const hiddenObjectives = getObjectivesByState(objectives, OBJECTIVE_STATES.HIDDEN);
  const hints = [];
  
  hiddenObjectives.forEach(objective => {
    // Generate contextual hints based on story
    const contextLower = storyContext.toLowerCase();
    
    if (objective.type === OBJECTIVE_TYPES.INVESTIGATION && 
        (contextLower.includes('mystery') || contextLower.includes('unknown'))) {
      hints.push({
        hint: "There might be more to discover here...",
        expectedResponse: "Try searching, investigating, or examining the area for clues"
      });
    }
    
    if (objective.type === OBJECTIVE_TYPES.PERSUASION && 
        (contextLower.includes('tension') || contextLower.includes('conflict'))) {
      hints.push({
        hint: "Perhaps words could resolve this...",
        expectedResponse: "Try talking, negotiating, or using diplomacy to find a peaceful solution"
      });
    }
    
    if (objective.type === OBJECTIVE_TYPES.COMBAT && 
        (contextLower.includes('threat') || contextLower.includes('danger'))) {
      hints.push({
        hint: "The situation seems dangerous...",
        expectedResponse: "Consider fighting, attacking, or defending against the threat"
      });
    }
    
    if (objective.type === OBJECTIVE_TYPES.EXPLORATION && 
        (contextLower.includes('hidden') || contextLower.includes('secret'))) {
      hints.push({
        hint: "There might be hidden paths or secrets...",
        expectedResponse: "Try exploring, searching for hidden areas, or looking for secret passages"
      });
    }
    
    if (objective.type === OBJECTIVE_TYPES.SOCIAL && 
        (contextLower.includes('people') || contextLower.includes('community'))) {
      hints.push({
        hint: "The locals might have valuable information...",
        expectedResponse: "Try talking to NPCs, building relationships, or gathering information from the community"
      });
    }
  });
  
  return hints;
}; 