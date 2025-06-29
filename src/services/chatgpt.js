// Backend API endpoint - update this URL after deploying to Render
const BACKEND_URL = 'https://dnd-v1-backend.onrender.com';

// Import dice rolling and action validation services
import DiceRollingService from './diceRolling.js';
import ActionValidationService from './actionValidation.js';
import { CombatService } from './combat.js';

// Helper function to call the backend proxy
const callBackendAPI = async (messages, model = 'gpt-4', max_tokens = 1000, temperature = 0.8) => {
  try {
    // Validate messages array to ensure all messages have proper role and content
    const validatedMessages = messages.filter(msg => {
      if (!msg || typeof msg !== 'object') {
        console.warn('Invalid message object:', msg);
        return false;
      }
      if (!msg.role || !msg.content) {
        console.warn('Message missing role or content:', msg);
        return false;
      }
      return true;
    });

    if (validatedMessages.length === 0) {
      throw new Error('No valid messages to send to API');
    }

    const response = await fetch(`${BACKEND_URL}/api/openai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: validatedMessages,
        model,
        max_tokens,
        temperature,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Backend API request failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        // If we can't parse the error response, use the status text
        errorMessage = `${response.status}: ${response.statusText}`;
      }
      
      // Provide more specific error messages based on status code
      if (response.status === 500) {
        errorMessage = `AI service error: ${errorMessage}. This might be due to missing API key, rate limiting, or network issues.`;
      } else if (response.status === 404) {
        errorMessage = 'AI service endpoint not found. Please check the backend configuration.';
      } else if (response.status === 503) {
        errorMessage = 'AI service temporarily unavailable. Please try again later.';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Backend API Error:', error);
    throw new Error(`Failed to communicate with backend: ${error.message}`);
  }
};

export class DungeonMasterService {
  constructor() {
    this.systemPrompt = `You are an experienced Dungeon Master for Dungeons & Dragons 5th Edition. You excel at:
- Creating engaging storylines and plot hooks
- Developing detailed character descriptions and backstories
- Generating multiple story options when specifically requested
- Providing atmospheric descriptions and immersive storytelling
- Balancing combat encounters and managing game mechanics
- Creating memorable NPCs and villains
- Adapting to player choices and creating dynamic narratives
- Maintaining story consistency and character development
- Building upon established relationships and plot threads

IMPORTANT: Only generate multiple options when explicitly requested. When asked to generate a single story introduction, campaign goal, or other content, provide ONLY ONE response.

Always respond in character as a Dungeon Master, providing rich, descriptive content that enhances the gaming experience. Maintain consistency with previous story elements, character relationships, and established plot threads.`;

    // Initialize dice rolling and action validation services
    this.diceService = new DiceRollingService();
    this.actionValidationService = new ActionValidationService();
    this.combatService = new CombatService();
  }

  async generateStoryPlots(partyCharacters, campaignSetting = '', partyInfo = null) {
    try {
      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class} (${char.alignment})`
      ).join(', ');

      // Build party context - use theme instead of name
      let partyContext = '';
      if (partyInfo) {
        partyContext = `\nParty Theme: ${partyInfo.description || 'No theme provided'}`;
      }

      const prompt = `As a Dungeon Master, I need you to generate 3 different story plot options for a D&D campaign.

Party Composition: ${characterDetails}${partyContext}
Campaign Setting: ${campaignSetting || 'Generic fantasy world'}

IMPORTANT: You MUST format your response EXACTLY as follows for each plot option:

**Plot Option 1:**
1. Title: "[Plot Title Here]"
2. Summary: [2-3 sentence summary of the plot]
3. Main Conflict: [The main challenge or conflict the party will face]
4. Story Hooks: [How the party gets involved and what motivates them]
5. Estimated Campaign Length: [short/medium/long]

**Plot Option 2:**
1. Title: "[Plot Title Here]"
2. Summary: [2-3 sentence summary of the plot]
3. Main Conflict: [The main challenge or conflict the party will face]
4. Story Hooks: [How the party gets involved and what motivates them]
5. Estimated Campaign Length: [short/medium/long]

**Plot Option 3:**
1. Title: "[Plot Title Here]"
2. Summary: [2-3 sentence summary of the plot]
3. Main Conflict: [The main challenge or conflict the party will face]
4. Story Hooks: [How the party gets involved and what motivates them]
5. Estimated Campaign Length: [short/medium/long]

Guidelines for the plots:
- Use the party theme to influence the plot lines and atmosphere
- Incorporate themes and elements from the party theme to create a cohesive narrative
- Consider how the party's background and composition might influence the plot
- Make each plot distinct and appealing to different play styles
- Focus on the characters and their individual stories

CRITICAL: Do not deviate from this exact format. Each plot must start with "**Plot Option X:**" and use the numbered format exactly as shown above.`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ], 'gpt-4', 1000, 0.8);

      return response.choices[0].message.content;
    } catch (error) {
      throw new Error(`Failed to generate story plots: ${error.message}`);
    }
  }

  async generateCharacterDetails(character) {
    try {
      const prompt = `As a Dungeon Master, I need you to expand on this character's details and create a rich, detailed description.

Character: ${character.name} - Level ${character.level} ${character.race} ${character.class}
Background: ${character.background}
Alignment: ${character.alignment}
Personality: ${character.personality || 'Not specified'}
Ideals: ${character.ideals || 'Not specified'}
Bonds: ${character.bonds || 'Not specified'}
Flaws: ${character.flaws || 'Not specified'}
Backstory: ${character.backstory || 'Not specified'}

Please provide:
1. A detailed physical description (appearance, mannerisms, distinctive features)
2. An expanded personality profile with quirks and habits
3. A deeper backstory with key events and relationships
4. Character motivations and goals
5. Potential story hooks and plot threads related to this character
6. How this character might interact with the party and world

Make the character feel alive and three-dimensional, with details that could drive story development.`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ], 'gpt-4', 800, 0.7);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating character details:', error);
      throw new Error(`Failed to generate character details: ${error.message}`);
    }
  }

  async generateStorySummary(plotOption, partyCharacters) {
    try {
      const characterDetails = partyCharacters.map(char => 
        `${char.name} (${char.race} ${char.class})`
      ).join(', ');

      const prompt = `As a Dungeon Master, I need you to create a detailed story summary and outline for this campaign plot.

Plot: ${plotOption}
Party: ${characterDetails}

Please provide:
1. A detailed campaign overview (3-4 paragraphs)
2. Key story beats and major events
3. Important NPCs and their roles
4. Potential challenges and obstacles
5. Story themes and motifs
6. How each party member might be personally invested
7. Potential branching paths and player choices
8. Climactic moments and resolution possibilities

Make this feel like a professional campaign module with rich storytelling potential.`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ], 'gpt-4', 1200, 0.7);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating story summary:', error);
      throw new Error(`Failed to generate story summary: ${error.message}`);
    }
  }

  async generateMultipleStoryPlots(partyCharacters, campaignSetting = '', partyInfo = null) {
    try {
      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class} (${char.alignment})`
      ).join(', ');

      // Build party context - use theme instead of name
      let partyContext = '';
      if (partyInfo) {
        partyContext = `\nParty Theme: ${partyInfo.description || 'No theme provided'}`;
      }

      const prompt = `As a Dungeon Master, I need you to generate 5 different story plot options for a D&D campaign, each with a detailed summary.

Party Composition: ${characterDetails}${partyContext}
Campaign Setting: ${campaignSetting || 'Generic fantasy world'}

For each of the 5 plot options, provide:
1. A compelling title
2. A detailed summary (3-4 paragraphs)
3. The main conflict or challenge
4. Key story beats and major events
5. Important NPCs and their roles
6. Potential story hooks for the party
7. Estimated campaign length (short, medium, or long)
8. Themes and motifs
9. How each party member might be personally invested

Important Guidelines:
- Use the party theme to influence the plot lines and atmosphere
- Incorporate themes and elements from the party theme to create a cohesive narrative
- Consider how the party's background and composition might influence the plot
- Make each plot distinct and appealing to different play styles
- Focus on the characters and their individual stories

Make each plot distinct and appealing to different play styles. Consider the party composition when crafting these options. Number each plot clearly (Plot 1, Plot 2, etc.).`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ], 'gpt-4', 1500, 0.8);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating multiple story plots:', error);
      throw new Error(`Failed to generate multiple story plots: ${error.message}`);
    }
  }

  async generateNPC(role, context = '') {
    try {
      const prompt = `As a Dungeon Master, I need you to create a detailed NPC for this role and context.

NPC Role: ${role}
Context: ${context || 'General campaign context'}

Please provide:
1. A detailed physical description
2. Personality traits and mannerisms
3. Background and motivations
4. Current situation and goals
5. How they might interact with the party
6. Potential story hooks or plot threads they could introduce
7. Their relationship to the world and other NPCs
8. Any secrets or hidden aspects of their character

Make this NPC feel like a real person with depth and complexity.`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ], 'gpt-4', 800, 0.7);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating NPC:', error);
      throw new Error(`Failed to generate NPC: ${error.message}`);
    }
  }

  async generateCombatEncounter(partyLevel, partySize, difficulty = 'medium', theme = '') {
    try {
      const prompt = `As a Dungeon Master, I need you to create a detailed combat encounter.

Party Level: ${partyLevel}
Party Size: ${partySize}
Difficulty: ${difficulty}
Theme: ${theme || 'General fantasy'}

Please provide:
1. A detailed description of the encounter location
2. Enemy types and their motivations
3. Tactical considerations and terrain features
4. Potential story elements or plot hooks
5. Non-combat resolution options
6. Consequences of victory or defeat
7. Environmental hazards or advantages
8. How this encounter fits into the larger story

Make this encounter feel meaningful and story-driven, not just a random fight.`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ], 'gpt-4', 800, 0.7);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating combat encounter:', error);
      throw new Error(`Failed to generate combat encounter: ${error.message}`);
    }
  }

  // Enhanced story continuation with comprehensive context and action validation
  async generateStoryContinuation(partyCharacters, storyHistory, playerResponse, storyState = null, responseType = 'individual', partyInfo = null) {
    try {
      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class}`
      ).join(', ');

      // Validate player action if it's an individual response
      let actionValidation = null;
      let diceResult = null;
      let validationMessage = '';

      if (responseType === 'individual') {
        // Find the responding character (assuming the last character in the party is responding)
        const respondingCharacter = partyCharacters[partyCharacters.length - 1];
        
        if (respondingCharacter) {
          // Validate the action
          actionValidation = this.actionValidationService.validatePlayerAction(
            playerResponse, 
            respondingCharacter, 
            { context: 'story', storyState }
          );

          if (actionValidation.valid && actionValidation.diceResult) {
            diceResult = actionValidation.diceResult;
            
            // Generate validation message based on dice results
            if (diceResult.overallSuccess) {
              validationMessage = `\n\nACTION VALIDATION: The action is within your character's capabilities.`;
              if (diceResult.actions) {
                const actionResults = diceResult.actions.map(action => 
                  `${action.action}: ${action.check.isSuccess ? 'Success' : 'Failure'} (Roll: ${action.check.roll}, DC: ${action.check.dc})`
                ).join(', ');
                validationMessage += `\nDice Results: ${actionResults}`;
              }
            } else {
              validationMessage = `\n\nACTION VALIDATION: Some aspects of this action are challenging for your character.`;
              if (diceResult.actions) {
                const failures = diceResult.actions.filter(action => !action.check.isSuccess);
                const failureResults = failures.map(action => 
                  `${action.action}: Failure (Roll: ${action.check.roll}, DC: ${action.check.dc})`
                ).join(', ');
                validationMessage += `\nFailed Actions: ${failureResults}`;
              }
            }
          } else if (!actionValidation.valid) {
            validationMessage = `\n\nACTION VALIDATION: ${actionValidation.response}`;
            if (actionValidation.suggestion) {
              validationMessage += `\nSuggestion: ${actionValidation.suggestion}`;
            }
          }
        }
      }

      // Build conversation history for context
      const conversationHistory = storyHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Build party context - use theme instead of name
      let partyContext = '';
      if (partyInfo) {
        partyContext = `\nParty Theme: ${partyInfo.description || 'No theme provided'}`;
      }

      // Enhanced context with story state
      let enhancedContext = '';
      if (storyState) {
        enhancedContext = `
STORY STATE CONTEXT:
Current Location: ${storyState.currentLocation?.name || 'Unknown'} - ${storyState.currentLocation?.description || ''}
Active NPCs: ${Object.keys(storyState.activeNPCs || {}).join(', ') || 'None'}
Active Plot Threads: ${storyState.activePlotThreads?.map(t => `${t.title} (${Math.round(t.progress * 100)}%)`).join(', ') || 'None'}
Recent Events: ${storyState.worldState?.recentEvents?.slice(-3).map(e => e.event).join(', ') || 'None'}

CHARACTER RELATIONSHIPS:
${partyCharacters.map(char => {
  const arc = storyState.characterArcs?.[char.id] || {};
  const relationships = Object.entries(arc.relationships || {}).map(([npc, rel]) => `${npc} (${rel})`).join(', ');
  return `${char.name}: ${relationships || 'No established relationships'}`;
}).join('\n')}

NPC CONTEXT:
${Object.entries(storyState.activeNPCs || {}).map(([npc, data]) => 
  `${npc}: ${data.disposition} disposition, knowledge: ${data.knowledge?.join(', ') || 'none'}, goal: ${data.currentGoal || 'unknown'}`
).join('\n')}`;
      }

      const prompt = `As a Dungeon Master, continue the story based on the player's response.

Party: ${characterDetails}${partyContext}
Player Response: "${playerResponse}" (Type: ${responseType})
Response Type Context:
- individual: One character's personal action
- team: Group action or decision
- investigate: Looking for clues or information
- combat: Combat-related action
- social: Social interaction or diplomacy${enhancedContext}

Previous Story Context:
${conversationHistory.map(msg => `${msg.role === 'assistant' ? 'DM' : 'Player'}: ${msg.content}`).join('\n')}

CRITICAL CONSISTENCY REQUIREMENTS:
1. Maintain all established NPC relationships and dispositions from the story state
2. Keep current location details consistent with previous descriptions
3. Continue active plot threads naturally without contradictions
4. Reference previous discoveries and character development
5. Build upon established world state and recent events
6. Ensure character actions align with their established motivations and relationships
7. Maintain the established tone and atmosphere
8. Reference specific NPCs that the party has already met
9. Build upon existing plot threads rather than introducing new unrelated elements
10. Consider character relationships when determining NPC reactions

ACTION VALIDATION GUIDELINES:
- If the action validation shows the action is impossible, gently redirect the player while maintaining story flow
- If the action validation shows the action is challenging, incorporate the difficulty into the narrative
- If the action validation shows the action is successful, proceed with the action as described
- Always maintain story coherence and character consistency
- Use the validation results to inform how the action plays out in the story

Please provide a compelling continuation that:
1. Acknowledges the player's action in context of the current situation and location
2. References relevant NPCs and their established relationships with the party
3. Continues or advances active plot threads appropriately
4. Updates character relationships based on the action
5. Maintains location and atmosphere consistency
6. Ends with a clear situation that invites the next player to respond
7. Encourages character interaction and roleplay
8. Provides multiple possible directions for the party to explore
9. Builds upon the established story state and character development
10. Incorporates action validation results naturally into the narrative

Keep your response engaging but concise (2-3 paragraphs maximum). Remember that only one player responds at a time, so end with a situation that gives the next player something meaningful to react to.${validationMessage}`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        ...conversationHistory,
        { role: "user", content: prompt }
      ], 'gpt-4', 800, 0.8);

      return {
        content: response.choices[0].message.content,
        actionValidation,
        diceResult
      };
    } catch (error) {
      console.error('Error generating story continuation:', error);
      throw new Error(`Failed to generate story continuation: ${error.message}`);
    }
  }

  async generatePlotOptions(partyCharacters, partyInfo = null) {
    try {
      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class}. ${char.personality || ''}. ${char.backstory || ''}`
      ).join('\n');

      // Build party context - use theme instead of description
      let partyContext = '';
      if (partyInfo) {
        partyContext = `\nParty Theme: ${partyInfo.description || 'No theme provided'}`;
      }

      const systemMessage = `You are a Dungeon Master for D&D 5e. You MUST generate exactly 3 plot options, no more, no less. Follow the exact format provided. Do not use party names in the plots. Keep summaries brief (1-2 sentences maximum). DO NOT repeat plots or generate duplicates.`;

      const prompt = `Generate exactly 3 distinct campaign plot options for this party. 

REQUIRED FORMAT - Follow this exact structure:

Plot 1: [Title]
[Brief summary - 1-2 sentences maximum]

Plot 2: [Title]  
[Brief summary - 1-2 sentences maximum]

Plot 3: [Title]
[Brief summary - 1-2 sentences maximum]

Party: ${characterDetails}${partyContext}

CRITICAL REQUIREMENTS:
- Generate EXACTLY 3 plots, no more, no less
- Use the party theme to influence the plot lines and atmosphere
- Do NOT use the party name in the plots - focus on the characters and theme
- Each summary must be 1-2 sentences maximum
- Follow the exact format above with "Plot 1:", "Plot 2:", "Plot 3:" labels
- Do not add any additional text, explanations, or formatting
- Do not repeat or duplicate any plots
- Stop after Plot 3 - do not generate more plots

Make each plot distinct and appealing to different play styles.`;

      const response = await callBackendAPI([
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ], 'gpt-4', 600, 0.8);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating plot options:', error);
      throw new Error(`Failed to generate plot options: ${error.message}`);
    }
  }

  async generateStoryIntroduction(partyCharacters, plotContent, selectedPlot, partyInfo = null) {
    try {
      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class}. ${char.personality || ''}. ${char.backstory || ''}`
      ).join('\n');

      // Build party context - use theme instead of name
      let partyContext = '';
      if (partyInfo) {
        partyContext = `\nParty Theme: ${partyInfo.description || 'No theme provided'}`;
      }

      const prompt = `As a Dungeon Master, create an engaging story introduction for the beginning of this campaign.

Party: ${characterDetails}${partyContext}
Selected Plot: ${plotContent}
Plot Number: ${selectedPlot}

IMPORTANT: Generate ONLY ONE story introduction for the selected plot above. Do NOT generate introductions for multiple plots or options.

Create an introduction that includes:
1. A vivid description of the starting town/settlement where the party begins
2. How each character arrives or is already present in this location
3. The initial situation or hook that draws the party together
4. A sense of atmosphere and setting that matches the chosen plot
5. An opening scene that gives the party their first decision or action to take

Important Guidelines:
- Use the party theme to influence the atmosphere and context
- Incorporate themes and elements from the party theme to create atmosphere and context
- Consider how the party's background and composition might influence the starting situation
- Focus on the characters and their individual stories
- The story should feel cohesive with the established theme
- Generate ONLY ONE introduction for the selected plot

Make this feel like the opening of an epic adventure. Set the tone, establish the setting, and give the party a clear starting point. End with a situation that requires the party to make a choice or take action.

Keep the introduction engaging but concise (3-4 paragraphs maximum).`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ], 'gpt-4', 800, 0.8);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating story introduction:', error);
      throw new Error(`Failed to generate story introduction: ${error.message}`);
    }
  }

  // Enhanced structured story response with story state integration
  async generateStructuredStoryResponse(partyCharacters, storyHistory, playerResponse, currentPhase, discoveredObjectives, storyState = null, partyInfo = null) {
    try {
      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class}`
      ).join(', ');

      // Validate and filter conversation history to ensure all messages have proper role and content
      const conversationHistory = storyHistory
        .filter(msg => msg && typeof msg === 'object' && msg.role && msg.content)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      let partyContext = '';
      if (partyInfo) {
        partyContext = `\nParty Theme: ${partyInfo.description || 'No theme provided'}`;
      }

      // Build objective context
      const objectiveContext = discoveredObjectives.length > 0 
        ? `\nDiscovered Objectives: ${discoveredObjectives.map(obj => obj.title).join(', ')}`
        : '';

      // Enhanced context with story state
      let enhancedContext = '';
      if (storyState) {
        enhancedContext = `
STORY STATE CONTEXT:
Current Location: ${storyState.currentLocation?.name || 'Unknown'} - ${storyState.currentLocation?.description || ''}
Active NPCs: ${Object.keys(storyState.activeNPCs || {}).join(', ') || 'None'}
Active Plot Threads: ${storyState.activePlotThreads?.map(t => `${t.title} (${Math.round(t.progress * 100)}%)`).join(', ') || 'None'}
Character Relationships: ${Object.entries(storyState.characterArcs || {}).map(([charId, arc]) => {
  const char = partyCharacters.find(c => c.id === charId);
  return `${char?.name}: ${Object.entries(arc.relationships || {}).map(([npc, rel]) => `${npc} (${rel})`).join(', ') || 'No relationships'}`;
}).join('; ')}`;
      }

      const prompt = `As a Dungeon Master, continue the story based on the player's response, considering the current story phase and discovered objectives.

Party: ${characterDetails}${partyContext}
Current Phase: ${currentPhase}
Player Response: "${playerResponse}"${objectiveContext}${enhancedContext}

Story Phases:
- Investigation: Focus on discovery, clues, and gathering information
- Conflict: Focus on tension, threats, and potential combat
- Resolution: Focus on choices, consequences, and story conclusion

CRITICAL CONSISTENCY REQUIREMENTS:
1. Maintain all established NPC relationships and dispositions from the story state
2. Keep current location details consistent with previous descriptions
3. Continue active plot threads naturally without contradictions
4. Reference previous discoveries and character development
5. Build upon established world state and recent events
6. Ensure character actions align with their established motivations and relationships
7. Maintain the established tone and atmosphere
8. Reference specific NPCs that the party has already met
9. Build upon existing plot threads rather than introducing new unrelated elements
10. Consider character relationships when determining NPC reactions

ENEMY INFORMATION REQUIREMENTS (when in Conflict phase):
If the story involves combat or enemies, provide detailed enemy information in the following format:

**ENEMY_DETAILS:**
[For each enemy present, provide:]
Name: [Enemy name if humanoid, or descriptive name like "Alpha Wolf"]
Type: [Enemy type: humanoid, beast, undead, etc.]
Level: [Enemy level relative to party]
HP: [Hit points]
AC: [Armor class]
Basic Attack: [Description of basic attack and damage]
Special Ability: [Description of special ability or attack]
Stats: [Brief description of key stats like "Strong and aggressive" or "Quick and stealthy"]

IMPORTANT: You MUST format your response EXACTLY as follows:

**STORY_CONTENT:**
[Your main story continuation here - 2-3 paragraphs that acknowledge the player's action, continue the plot, and set up the next situation]

**CURRENT_LOCATION:**
[Updated location description or "No change" if location remains the same]

**ACTIVE_NPCS:**
[List of NPCs currently present or relevant to the scene, separated by commas]

**PLOT_DEVELOPMENTS:**
[Key plot developments or revelations from this response]

**CHARACTER_REACTIONS:**
[How NPCs react to the player's action, if applicable]

**NEXT_ACTIONS:**
[2-3 clear options or directions the party can take next]

**STORY_TONE:**
[The current mood/atmosphere: tense, mysterious, hopeful, dangerous, etc.]

**PHASE_STATUS:**
[Current story phase: investigation, conflict, or resolution]

**ENEMY_DETAILS:** (only include if enemies are present)
[Detailed enemy information as specified above]

Keep your response engaging but concise. Remember that only one player responds at a time, so end with a situation that gives the next player something meaningful to react to.`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        ...conversationHistory,
        { role: "user", content: prompt }
      ], 'gpt-4', 1000, 0.8);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating structured story response:', error);
      throw new Error(`Failed to generate structured story response: ${error.message}`);
    }
  }

  async generatePhaseTransition(partyCharacters, currentPhase, storyProgress, partyInfo = null) {
    try {
      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class}`
      ).join(', ');

      let partyContext = '';
      if (partyInfo) {
        partyContext = `\nParty Theme: ${partyInfo.description || 'No theme provided'}`;
      }

      const prompt = `As a Dungeon Master, create a phase transition message for the story.

Party: ${characterDetails}${partyContext}
Current Phase: ${currentPhase}
Story Progress: ${storyProgress}

Create a transition that:
1. Acknowledges the progress made so far
2. Signals the shift to the new phase
3. Sets up the new challenges and opportunities
4. Maintains the established tone and atmosphere
5. Gives the party clear direction for the next phase

Make this feel like a natural progression in the story.`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ], 'gpt-4', 600, 0.7);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating phase transition:', error);
      throw new Error(`Failed to generate phase transition: ${error.message}`);
    }
  }

  async generateObjectiveCompletion(partyCharacters, completedObjective, storyContext, partyInfo = null) {
    try {
      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class}`
      ).join(', ');

      let partyContext = '';
      if (partyInfo) {
        partyContext = `\nParty Theme: ${partyInfo.description || 'No theme provided'}`;
      }

      const prompt = `As a Dungeon Master, create a completion message for an objective.

Party: ${characterDetails}${partyContext}
Completed Objective: ${completedObjective.title}
Story Context: ${storyContext}

Create a completion message that:
1. Celebrates the achievement
2. Provides closure for this objective
3. Sets up the next challenge or objective
4. Maintains story momentum
5. Acknowledges the party's efforts

Make this feel rewarding and meaningful.`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ], 'gpt-4', 600, 0.7);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating objective completion:', error);
      throw new Error(`Failed to generate objective completion: ${error.message}`);
    }
  }

  async generateCampaignContinuation(partyCharacters, campaignMetadata, storyHistory, playerResponse, partyInfo = null) {
    try {
      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class}`
      ).join(', ');

      // Validate and filter conversation history to ensure all messages have proper role and content
      const conversationHistory = storyHistory
        .filter(msg => msg && typeof msg === 'object' && msg.role && msg.content)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      let partyContext = '';
      if (partyInfo) {
        partyContext = `\nParty Theme: ${partyInfo.description || 'No theme provided'}`;
      }

      const prompt = `As a Dungeon Master, continue the ongoing campaign story.

Party: ${characterDetails}${partyContext}
Campaign Goal: ${campaignMetadata.mainGoal || 'No specific goal'}
Campaign Progress: ${campaignMetadata.campaignProgress || 'Beginning'}
Player Response: "${playerResponse}"

Previous Story Context:
${conversationHistory.map(msg => `${msg.role === 'assistant' ? 'DM' : 'Player'}: ${msg.content}`).join('\n')}

Continue the story while:
1. Building toward the main campaign goal
2. Maintaining consistency with previous events
3. Developing character relationships and arcs
4. Creating meaningful choices and consequences
5. Advancing the overall plot

Keep your response engaging but concise (2-3 paragraphs maximum).`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        ...conversationHistory,
        { role: "user", content: prompt }
      ], 'gpt-4', 800, 0.8);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating campaign continuation:', error);
      throw new Error(`Failed to generate campaign continuation: ${error.message}`);
    }
  }

  async generateCampaignGoal(partyCharacters, plotContent, partyInfo = null) {
    try {
      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class}`
      ).join(', ');

      let partyContext = '';
      if (partyInfo) {
        partyContext = `\nParty Theme: ${partyInfo.description || 'No theme provided'}`;
      }

      const prompt = `As a Dungeon Master, create a clear campaign goal based on the selected plot.

Party: ${characterDetails}${partyContext}
Selected Plot: ${plotContent}

IMPORTANT: Generate ONLY ONE campaign goal for the selected plot above. Do NOT generate multiple goals or options.

Create a campaign goal that:
1. Is clear and achievable
2. Provides direction for the entire campaign
3. Involves all party members
4. Has multiple possible paths to completion
5. Creates meaningful stakes and consequences
6. Is specific to the selected plot only

Make this goal compelling and motivating for the party. Generate ONLY ONE goal.`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ], 'gpt-4', 600, 0.7);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating campaign goal:', error);
      throw new Error(`Failed to generate campaign goal: ${error.message}`);
    }
  }

  async generateSessionSummary(campaignMetadata, storyMessages, objectives, partyCharacters, partyInfo = null) {
    try {
      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class}`
      ).join(', ');

      let partyContext = '';
      if (partyInfo) {
        partyContext = `\nParty Theme: ${partyInfo.description || 'No theme provided'}`;
      }

      const prompt = `As a Dungeon Master, create a session summary for this campaign session.

Party: ${characterDetails}${partyContext}
Campaign Goal: ${campaignMetadata.mainGoal || 'No specific goal'}
Objectives: ${objectives.map(obj => obj.title).join(', ')}
Story Messages: ${storyMessages.length} total messages

Create a summary that:
1. Recaps the major events of the session
2. Highlights character development and relationships
3. Notes progress toward objectives
4. Sets up expectations for the next session
5. Maintains the established tone and atmosphere

Make this summary engaging and informative.`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ], 'gpt-4', 800, 0.7);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating session summary:', error);
      throw new Error(`Failed to generate session summary: ${error.message}`);
    }
  }
}

export const dungeonMasterService = new DungeonMasterService(); 