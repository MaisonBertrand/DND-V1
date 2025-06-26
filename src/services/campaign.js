// Campaign Continuity Service
// Manages long-term campaign progression, goals, and story continuity

// Campaign phases
export const CAMPAIGN_PHASES = {
  SETUP: 'setup',
  INTRODUCTION: 'introduction', 
  RISING_ACTION: 'rising_action',
  CLIMAX: 'climax',
  RESOLUTION: 'resolution',
  COMPLETED: 'completed'
};

// Campaign goal types
export const GOAL_TYPES = {
  MAIN_QUEST: 'main_quest',
  SIDE_QUEST: 'side_quest',
  CHARACTER_ARC: 'character_arc',
  WORLD_BUILDING: 'world_building',
  RELATIONSHIP: 'relationship'
};

// Campaign metadata structure
export const createCampaignMetadata = (partyInfo, selectedPlot) => {
  return {
    campaignId: `campaign_${Date.now()}`,
    sessionNumber: 1,
    totalSessions: 0,
    campaignStartDate: new Date(),
    lastSessionDate: new Date(),
    campaignStatus: 'active', // active, paused, completed
    campaignPhase: CAMPAIGN_PHASES.SETUP,
    campaignProgress: 0, // 0-100 percentage
    mainGoal: null,
    subGoals: [],
    completedObjectives: [],
    activeObjectives: [],
    campaignNotes: [],
    importantNPCs: [],
    keyLocations: [],
    majorEvents: [],
    partyDecisions: [],
    storyContext: {
      currentLocation: null,
      currentSituation: null,
      activeThreats: [],
      availableResources: [],
      partyReputation: {},
      worldState: {}
    },
    plotDetails: selectedPlot,
    partyTheme: partyInfo?.description || '',
    sessionHistory: []
  };
};

// Extract campaign context from story messages
export const extractCampaignContext = (storyMessages, partyCharacters) => {
  const context = {
    importantNPCs: [],
    keyLocations: [],
    majorEvents: [],
    partyDecisions: [],
    currentSituation: null,
    activeThreats: [],
    availableResources: []
  };

  // Analyze recent messages for context
  const recentMessages = storyMessages.slice(-10); // Last 10 messages
  
  recentMessages.forEach(message => {
    if (message.role === 'assistant') {
      const content = message.content.toLowerCase();
      
      // Extract NPCs (names mentioned with titles/descriptions)
      const npcMatches = content.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:the\s+)?([a-z\s]+)/g);
      if (npcMatches) {
        npcMatches.forEach(match => {
          if (!context.importantNPCs.find(npc => npc.name === match)) {
            context.importantNPCs.push({
              name: match,
              firstMentioned: message.timestamp,
              role: 'unknown'
            });
          }
        });
      }
      
      // Extract locations
      const locationKeywords = ['town', 'city', 'village', 'castle', 'temple', 'dungeon', 'forest', 'mountain'];
      locationKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          const locationMatch = content.match(new RegExp(`([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\\s+${keyword})`, 'i'));
          if (locationMatch && !context.keyLocations.find(loc => loc.name === locationMatch[1])) {
            context.keyLocations.push({
              name: locationMatch[1],
              type: keyword,
              firstMentioned: message.timestamp
            });
          }
        }
      });
      
      // Extract threats
      const threatKeywords = ['danger', 'threat', 'enemy', 'monster', 'evil', 'dark', 'cursed'];
      threatKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          context.activeThreats.push({
            type: keyword,
            mentioned: message.timestamp,
            description: content.substring(Math.max(0, content.indexOf(keyword) - 50), content.indexOf(keyword) + 50)
          });
        }
      });
    }
  });

  // Set current situation from the most recent message
  if (storyMessages.length > 0) {
    const latestMessage = storyMessages[storyMessages.length - 1];
    if (latestMessage.role === 'assistant') {
      context.currentSituation = latestMessage.content;
    }
  }

  return context;
};

// Generate campaign continuation context
export const generateCampaignContext = (campaignMetadata, storyMessages, partyCharacters) => {
  // Add safety checks for undefined campaignMetadata
  if (!campaignMetadata) {
    console.warn('Campaign metadata is undefined, using fallback values');
    campaignMetadata = {
      campaignPhase: CAMPAIGN_PHASES.SETUP,
      mainGoal: null,
      activeObjectives: [],
      completedObjectives: [],
      importantNPCs: [],
      keyLocations: [],
      partyDecisions: [],
      storyContext: {
        currentSituation: null,
        worldState: {}
      },
      sessionNumber: 1,
      campaignProgress: 0
    };
  }

  // Add safety checks for storyContext
  if (!campaignMetadata.storyContext) {
    campaignMetadata.storyContext = {
      currentSituation: null,
      worldState: {}
    };
  }

  const context = {
    campaignPhase: campaignMetadata.campaignPhase || CAMPAIGN_PHASES.SETUP,
    mainGoal: campaignMetadata.mainGoal || null,
    activeObjectives: campaignMetadata.activeObjectives || [],
    completedObjectives: campaignMetadata.completedObjectives || [],
    importantNPCs: campaignMetadata.importantNPCs || [],
    keyLocations: campaignMetadata.keyLocations || [],
    currentSituation: campaignMetadata.storyContext?.currentSituation || null,
    partyDecisions: campaignMetadata.partyDecisions || [],
    worldState: campaignMetadata.storyContext?.worldState || {},
    sessionNumber: campaignMetadata.sessionNumber || 1,
    campaignProgress: campaignMetadata.campaignProgress || 0
  };

  // Add recent story context
  const recentContext = extractCampaignContext(storyMessages, partyCharacters);
  
  return {
    ...context,
    recentNPCs: recentContext.importantNPCs,
    recentLocations: recentContext.keyLocations,
    recentThreats: recentContext.activeThreats,
    currentSituation: recentContext.currentSituation || context.currentSituation
  };
};

// Update campaign progress based on story development
export const updateCampaignProgress = (campaignMetadata, storyMessages, objectives) => {
  let progress = 0;
  
  // Base progress on story phase
  const phaseProgress = {
    [CAMPAIGN_PHASES.SETUP]: 0,
    [CAMPAIGN_PHASES.INTRODUCTION]: 10,
    [CAMPAIGN_PHASES.RISING_ACTION]: 30,
    [CAMPAIGN_PHASES.CLIMAX]: 70,
    [CAMPAIGN_PHASES.RESOLUTION]: 90,
    [CAMPAIGN_PHASES.COMPLETED]: 100
  };
  
  progress += phaseProgress[campaignMetadata.campaignPhase] || 0;
  
  // Add progress for completed objectives
  const completedObjectives = objectives.filter(obj => obj.state === 'completed');
  const objectiveProgress = (completedObjectives.length / Math.max(objectives.length, 1)) * 30;
  progress += objectiveProgress;
  
  // Add progress for story length (up to 20%)
  const messageCount = storyMessages.length;
  const storyProgress = Math.min((messageCount / 50) * 20, 20); // Max 20% for story length
  progress += storyProgress;
  
  return Math.min(Math.round(progress), 100);
};

// Determine if campaign phase should transition
export const checkPhaseTransition = (campaignMetadata, storyMessages, objectives) => {
  const messageCount = storyMessages.length;
  const completedObjectives = objectives.filter(obj => obj.state === 'completed');
  
  let newPhase = campaignMetadata.campaignPhase;
  
  // Phase transition logic
  if (campaignMetadata.campaignPhase === CAMPAIGN_PHASES.SETUP && messageCount > 0) {
    newPhase = CAMPAIGN_PHASES.INTRODUCTION;
  } else if (campaignMetadata.campaignPhase === CAMPAIGN_PHASES.INTRODUCTION && messageCount >= 5) {
    newPhase = CAMPAIGN_PHASES.RISING_ACTION;
  } else if (campaignMetadata.campaignPhase === CAMPAIGN_PHASES.RISING_ACTION && 
             (messageCount >= 15 || completedObjectives.length >= 2)) {
    newPhase = CAMPAIGN_PHASES.CLIMAX;
  } else if (campaignMetadata.campaignPhase === CAMPAIGN_PHASES.CLIMAX && 
             (messageCount >= 25 || completedObjectives.length >= 3)) {
    newPhase = CAMPAIGN_PHASES.RESOLUTION;
  } else if (campaignMetadata.campaignPhase === CAMPAIGN_PHASES.RESOLUTION && 
             (messageCount >= 30 || completedObjectives.length >= 4)) {
    newPhase = CAMPAIGN_PHASES.COMPLETED;
  }
  
  return newPhase !== campaignMetadata.campaignPhase ? newPhase : null;
};

// Generate campaign summary for AI context
export const generateCampaignSummary = (campaignMetadata, storyMessages, partyCharacters) => {
  const summary = {
    campaignPhase: campaignMetadata.campaignPhase,
    mainGoal: campaignMetadata.mainGoal,
    sessionNumber: campaignMetadata.sessionNumber,
    campaignProgress: campaignMetadata.campaignProgress,
    keyNPCs: campaignMetadata.importantNPCs.slice(-5), // Last 5 NPCs
    keyLocations: campaignMetadata.keyLocations.slice(-3), // Last 3 locations
    recentEvents: campaignMetadata.majorEvents.slice(-3), // Last 3 events
    partyDecisions: campaignMetadata.partyDecisions.slice(-5), // Last 5 decisions
    currentSituation: campaignMetadata.storyContext.currentSituation,
    activeObjectives: campaignMetadata.activeObjectives,
    completedObjectives: campaignMetadata.completedObjectives
  };

  return summary;
};

// Save campaign session data
export const saveCampaignSession = (campaignMetadata, storyMessages, objectives, sessionEndTime) => {
  const sessionData = {
    sessionNumber: campaignMetadata.sessionNumber,
    startTime: campaignMetadata.lastSessionDate,
    endTime: sessionEndTime,
    messageCount: storyMessages.length,
    objectivesCompleted: objectives.filter(obj => obj.state === 'completed').length,
    campaignPhase: campaignMetadata.campaignPhase,
    campaignProgress: campaignMetadata.campaignProgress,
    keyEvents: extractCampaignContext(storyMessages, []).majorEvents,
    partyDecisions: campaignMetadata.partyDecisions.slice(-5) // Last 5 decisions
  };

  return {
    ...campaignMetadata,
    sessionHistory: [...campaignMetadata.sessionHistory, sessionData],
    sessionNumber: campaignMetadata.sessionNumber + 1,
    lastSessionDate: sessionEndTime,
    totalSessions: campaignMetadata.totalSessions + 1
  };
}; 