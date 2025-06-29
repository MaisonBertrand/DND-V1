// Story State Management Service
// Handles comprehensive story context, character development, NPC relationships, and plot threads

export class StoryStateService {
  constructor() {
    this.defaultState = {
      currentLocation: {
        name: '',
        description: '',
        npcs: [],
        features: [],
        atmosphere: '',
        exits: []
      },
      activeNPCs: {},
      activePlotThreads: [],
      characterArcs: {},
      worldState: {
        timeOfDay: 'day',
        weather: 'clear',
        recentEvents: [],
        factionRelations: {},
        discoveredLocations: [],
        completedObjectives: []
      },
      storyMetadata: {
        sessionStartTime: null,
        totalMessages: 0,
        currentPhase: 'introduction',
        campaignMood: 'neutral',
        tensionLevel: 0 // 0-10 scale
      }
    };
  }

  // Initialize story state for a new campaign
  initializeStoryState(partyCharacters, plotContent, partyInfo = null) {
    const initialState = { ...this.defaultState };
    
    // Initialize character arcs
    partyCharacters.forEach(char => {
      initialState.characterArcs[char.id] = {
        relationships: {},
        discoveries: [],
        motivations: [char.ideals || 'adventure'],
        characterGrowth: [],
        currentGoals: [],
        personalityTraits: char.personality ? char.personality.split(',').map(t => t.trim()) : [],
        backstoryElements: char.backstory ? this.extractBackstoryElements(char.backstory) : []
      };
    });

    // Set initial location based on plot
    initialState.currentLocation = this.extractInitialLocation(plotContent);
    
    // Initialize party theme influence
    if (partyInfo && partyInfo.description) {
      initialState.storyMetadata.campaignMood = this.determineMoodFromTheme(partyInfo.description);
    }

    return initialState;
  }

  // Extract story elements from AI response
  extractStoryElements(aiResponse) {
    const extracted = {
      npcInteractions: [],
      plotAdvancement: null,
      locationChanges: null,
      newDiscoveries: [],
      characterDevelopment: {},
      worldStateUpdates: {}
    };

    // Extract NPC interactions
    const npcPatterns = [
      /(\w+)\s+(?:becomes?|grows?|seems?)\s+(friendly|hostile|neutral|suspicious|trusting)/gi,
      /(\w+)\s+(?:reacts?|responds?)\s+(?:with|in)\s+(joy|anger|fear|surprise|curiosity)/gi,
      /(\w+)\s+(?:shows?|displays?)\s+(gratitude|distrust|interest|concern)/gi
    ];

    npcPatterns.forEach(pattern => {
      const matches = [...aiResponse.matchAll(pattern)];
      matches.forEach(match => {
        extracted.npcInteractions.push({
          npc: match[1],
          newDisposition: match[2],
          context: match[0]
        });
      });
    });

    // Extract plot advancement
    const plotPatterns = [
      /(?:discovers?|finds?|learns?)\s+(?:that\s+)?(.+?)(?:\.|!)/gi,
      /(?:new\s+)?(?:clue|evidence|information)\s+(?:about|regarding)\s+(.+?)(?:\.|!)/gi,
      /(?:progress|advance)\s+(?:in|on)\s+(.+?)(?:\.|!)/gi
    ];

    plotPatterns.forEach(pattern => {
      const matches = [...aiResponse.matchAll(pattern)];
      if (matches.length > 0) {
        extracted.plotAdvancement = {
          discovery: matches[0][1],
          progress: 0.1 // Default progress increment
        };
      }
    });

    // Extract location changes
    const locationPatterns = [
      /(?:moves?|goes?|travels?)\s+(?:to|towards?)\s+(.+?)(?:\.|!)/gi,
      /(?:enters?|approaches?)\s+(.+?)(?:\.|!)/gi,
      /(?:arrives?|reaches?)\s+(?:at|in)\s+(.+?)(?:\.|!)/gi
    ];

    locationPatterns.forEach(pattern => {
      const matches = [...aiResponse.matchAll(pattern)];
      if (matches.length > 0) {
        extracted.locationChanges = {
          newLocation: matches[0][1],
          transition: matches[0][0]
        };
      }
    });

    return extracted;
  }

  // Update story state based on AI response and player action
  updateStoryState(currentState, aiResponse, playerResponse, characterId) {
    // Ensure we have a valid current state with all required properties
    const newState = { 
      ...this.defaultState, 
      ...currentState,
      activePlotThreads: currentState?.activePlotThreads || [],
      activeNPCs: currentState?.activeNPCs || {},
      characterArcs: currentState?.characterArcs || {},
      worldState: { ...this.defaultState.worldState, ...currentState?.worldState },
      storyMetadata: { ...this.defaultState.storyMetadata, ...currentState?.storyMetadata }
    };
    
    const extractedInfo = this.extractStoryElements(aiResponse);
    
    // Update NPC relationships and dispositions
    if (extractedInfo.npcInteractions.length > 0) {
      extractedInfo.npcInteractions.forEach(interaction => {
        if (!newState.activeNPCs[interaction.npc]) {
          newState.activeNPCs[interaction.npc] = {
            disposition: 'neutral',
            knowledge: [],
            relationships: {},
            currentGoal: '',
            firstAppearance: new Date().toISOString()
          };
        }
        
        newState.activeNPCs[interaction.npc].disposition = interaction.newDisposition;
        newState.activeNPCs[interaction.npc].lastInteraction = new Date().toISOString();
      });
    }

    // Update plot thread progress
    if (extractedInfo.plotAdvancement) {
      const existingThread = newState.activePlotThreads.find(t => 
        t.id === this.generateThreadId(extractedInfo.plotAdvancement.discovery)
      );
      
      if (existingThread) {
        existingThread.progress = Math.min(1.0, existingThread.progress + extractedInfo.plotAdvancement.progress);
        existingThread.lastUpdated = new Date().toISOString();
      } else {
        newState.activePlotThreads.push({
          id: this.generateThreadId(extractedInfo.plotAdvancement.discovery),
          title: extractedInfo.plotAdvancement.discovery,
          status: 'active',
          progress: extractedInfo.plotAdvancement.progress,
          discoveredAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          involvedNPCs: [],
          clues: []
        });
      }
    }

    // Update character development
    if (characterId && newState.characterArcs && newState.characterArcs[characterId]) {
      const characterArc = newState.characterArcs[characterId];
      
      // Extract character development from player response
      const development = this.extractCharacterDevelopment(playerResponse, aiResponse);
      
      // Update relationships
      if (development.relationships) {
        characterArc.relationships = { ...characterArc.relationships, ...development.relationships };
      }
      
      // Update discoveries
      if (development.discoveries) {
        characterArc.discoveries = [...new Set([...characterArc.discoveries, ...development.discoveries])];
      }
      
      // Update motivations
      if (development.motivations) {
        characterArc.motivations = [...new Set([...characterArc.motivations, ...development.motivations])];
      }
      
      // Update character growth
      if (development.growth) {
        characterArc.characterGrowth = [...new Set([...characterArc.characterGrowth, ...development.growth])];
      }
    }

    // Update location if changed
    if (extractedInfo.locationChanges) {
      newState.currentLocation = {
        ...newState.currentLocation,
        name: extractedInfo.locationChanges.newLocation,
        description: this.generateLocationDescription(extractedInfo.locationChanges.newLocation),
        lastUpdated: new Date().toISOString()
      };
    }

    // Update world state
    if (!newState.worldState) {
      newState.worldState = { ...this.defaultState.worldState };
    }
    if (!newState.worldState.recentEvents) {
      newState.worldState.recentEvents = [];
    }
    
    newState.worldState.recentEvents = [
      ...newState.worldState.recentEvents.slice(-4), // Keep last 5 events
      {
        event: playerResponse.substring(0, 100) + '...',
        timestamp: new Date().toISOString(),
        characterId: characterId
      }
    ];

    // Update story metadata
    newState.storyMetadata.totalMessages += 1;
    newState.storyMetadata.lastUpdated = new Date().toISOString();

    return newState;
  }

  // Extract character development from player response and AI response
  extractCharacterDevelopment(playerResponse, aiResponse) {
    const development = {
      relationships: {},
      discoveries: [],
      motivations: [],
      growth: []
    };

    // Extract relationship changes
    const relationshipPatterns = [
      /(?:trusts?|likes?|respects?)\s+(\w+)/gi,
      /(?:distrusts?|dislikes?|fears?)\s+(\w+)/gi,
      /(?:befriends?|allies?\s+with)\s+(\w+)/gi
    ];

    relationshipPatterns.forEach(pattern => {
      const matches = [...playerResponse.matchAll(pattern)];
      matches.forEach(match => {
        const npc = match[1];
        const action = match[0].toLowerCase();
        
        if (action.includes('trust') || action.includes('like') || action.includes('respect')) {
          development.relationships[npc] = 'positive';
        } else if (action.includes('distrust') || action.includes('dislike') || action.includes('fear')) {
          development.relationships[npc] = 'negative';
        } else if (action.includes('friend') || action.includes('ally')) {
          development.relationships[npc] = 'allied';
        }
      });
    });

    // Extract discoveries
    const discoveryPatterns = [
      /(?:discovers?|finds?|learns?)\s+(.+?)(?:\.|!)/gi,
      /(?:realizes?|understands?)\s+(.+?)(?:\.|!)/gi
    ];

    discoveryPatterns.forEach(pattern => {
      const matches = [...playerResponse.matchAll(pattern)];
      matches.forEach(match => {
        development.discoveries.push(match[1].trim());
      });
    });

    // Extract motivations
    const motivationPatterns = [
      /(?:wants?|desires?|seeks?)\s+(?:to\s+)?(.+?)(?:\.|!)/gi,
      /(?:motivated\s+by|driven\s+by)\s+(.+?)(?:\.|!)/gi
    ];

    motivationPatterns.forEach(pattern => {
      const matches = [...playerResponse.matchAll(pattern)];
      matches.forEach(match => {
        development.motivations.push(match[1].trim());
      });
    });

    return development;
  }

  // Generate comprehensive context for AI prompts
  generateContextPrompt(storyState, partyCharacters, storyHistory, playerResponse) {
    const context = {
      currentLocation: storyState.currentLocation,
      activeNPCs: storyState.activeNPCs,
      activePlotThreads: storyState.activePlotThreads,
      characterArcs: storyState.characterArcs,
      worldState: storyState.worldState,
      storyMetadata: storyState.storyMetadata
    };

    const contextPrompt = `
STORY STATE SUMMARY:
Current Location: ${context.currentLocation.name} - ${context.currentLocation.description}
Atmosphere: ${context.currentLocation.atmosphere}
Active NPCs: ${Object.keys(context.activeNPCs).join(', ') || 'None'}
Active Plot Threads: ${context.activePlotThreads.map(t => `${t.title} (${Math.round(t.progress * 100)}%)`).join(', ') || 'None'}
Recent Events: ${context.worldState.recentEvents.slice(-3).map(e => e.event).join(', ') || 'None'}

CHARACTER CONTEXT:
${partyCharacters.map(char => {
  const arc = context.characterArcs[char.id] || {};
  const relationships = Object.entries(arc.relationships || {}).map(([npc, rel]) => `${npc} (${rel})`).join(', ');
  const discoveries = arc.discoveries ? arc.discoveries.slice(-3).join(', ') : '';
  return `${char.name}: Relationships: ${relationships || 'None'}. Recent discoveries: ${discoveries || 'None'}`;
}).join('\n')}

NPC RELATIONSHIPS:
${Object.entries(context.activeNPCs).map(([npc, data]) => 
  `${npc}: ${data.disposition} disposition, ${data.knowledge.length} pieces of knowledge, goal: ${data.currentGoal || 'unknown'}`
).join('\n')}

STORY HISTORY (Last 5 messages):
${storyHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

PLAYER RESPONSE: "${playerResponse}"

CRITICAL CONSISTENCY RULES:
1. Maintain all established NPC relationships and dispositions
2. Keep current location details consistent with previous descriptions
3. Continue active plot threads naturally without contradictions
4. Reference previous discoveries and character development
5. Build upon established world state and recent events
6. Ensure character actions align with their established motivations and relationships
7. Maintain the established tone and atmosphere
8. Reference specific NPCs that the party has already met
9. Build upon existing plot threads rather than introducing new unrelated elements
10. Consider character relationships when determining NPC reactions

RESPONSE REQUIREMENTS:
- Acknowledge the player's action in context of the current situation and location
- Reference relevant NPCs and their established relationships with the party
- Continue or advance active plot threads appropriately
- Update character relationships based on the action
- Maintain location and atmosphere consistency
- End with a clear situation that invites the next player response
- Keep the story flowing naturally without jarring transitions
`;

    return contextPrompt;
  }

  // Helper methods
  extractInitialLocation(plotContent) {
    // Extract location from plot content
    const locationPatterns = [
      /(?:in|at|near)\s+(.+?)(?:\.|,|!)/gi,
      /(?:town|city|village|castle|tower|dungeon|forest|mountain)\s+(?:of|in|near)\s+(.+?)(?:\.|,|!)/gi
    ];

    for (const pattern of locationPatterns) {
      const matches = [...plotContent.matchAll(pattern)];
      if (matches.length > 0) {
        return {
          name: matches[0][1].trim(),
          description: `A location mentioned in the plot`,
          npcs: [],
          features: [],
          atmosphere: 'mysterious',
          exits: []
        };
      }
    }

    return {
      name: 'Starting Location',
      description: 'Where the adventure begins',
      npcs: [],
      features: [],
      atmosphere: 'neutral',
      exits: []
    };
  }

  extractBackstoryElements(backstory) {
    // Extract key elements from character backstory
    const elements = [];
    
    // Look for key backstory elements
    const patterns = [
      /(?:family|parents?|siblings?)\s+(.+?)(?:\.|,)/gi,
      /(?:trained|learned|studied)\s+(.+?)(?:\.|,)/gi,
      /(?:worked|served|lived)\s+(?:as|in)\s+(.+?)(?:\.|,)/gi
    ];

    patterns.forEach(pattern => {
      const matches = [...backstory.matchAll(pattern)];
      matches.forEach(match => {
        elements.push(match[1].trim());
      });
    });

    return elements;
  }

  determineMoodFromTheme(theme) {
    const themeLower = theme.toLowerCase();
    
    if (themeLower.includes('dark') || themeLower.includes('gothic') || themeLower.includes('horror')) {
      return 'dark';
    } else if (themeLower.includes('light') || themeLower.includes('happy') || themeLower.includes('cheerful')) {
      return 'light';
    } else if (themeLower.includes('mysterious') || themeLower.includes('enigmatic')) {
      return 'mysterious';
    } else if (themeLower.includes('epic') || themeLower.includes('grand')) {
      return 'epic';
    }
    
    return 'neutral';
  }

  generateThreadId(discovery) {
    return discovery.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
  }

  generateLocationDescription(locationName) {
    // Generate a basic description for a new location
    const descriptions = [
      'A place of mystery and adventure',
      'An area with its own unique character',
      'A location that holds many secrets',
      'A place where stories unfold',
      'An area rich with history and possibility'
    ];
    
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }
}

export const storyStateService = new StoryStateService(); 