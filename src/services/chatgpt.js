// Backend API endpoint - update this URL after deploying to Render
const BACKEND_URL = 'https://dnd-v1-backend.onrender.com';

// Helper function to call the backend proxy
const callBackendAPI = async (messages, model = 'gpt-4', max_tokens = 1000, temperature = 0.8) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/openai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model,
        max_tokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Backend API request failed');
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
- Generating multiple story options and summarizing them
- Providing atmospheric descriptions and immersive storytelling
- Balancing combat encounters and managing game mechanics
- Creating memorable NPCs and villains
- Adapting to player choices and creating dynamic narratives

Always respond in character as a Dungeon Master, providing rich, descriptive content that enhances the gaming experience.`;
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

For each plot option, provide:
1. A compelling title
2. A brief summary (2-3 sentences)
3. The main conflict or challenge
4. Potential story hooks for the party
5. Estimated campaign length (short, medium, or long)

Important Guidelines:
- Use the party theme to influence the plot lines and atmosphere
- Incorporate themes and elements from the party theme to create a cohesive narrative
- Consider how the party's background and composition might influence the plot
- Make each plot distinct and appealing to different play styles
- Focus on the characters and their individual stories

Make each plot distinct and appealing to different play styles. Consider the party composition when crafting these options.`;

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
      ], 'gpt-4', 1200, 0.8);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating multiple story plots:', error);
      throw new Error(`Failed to generate multiple story plots: ${error.message}`);
    }
  }

  async generateNPC(role, context = '') {
    try {
      const prompt = `As a Dungeon Master, I need you to create a detailed NPC for my campaign.

Role: ${role}
Context: ${context || 'General campaign use'}

Please provide:
1. Name and basic description
2. Personality and mannerisms
3. Background and motivations
4. Role in the story
5. How they might interact with the party
6. Potential plot hooks or quests they could offer
7. Any secrets or hidden agendas
8. Physical description and distinctive features

Make this NPC memorable and useful for advancing the story.`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ], 'gpt-4', 600, 0.8);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating NPC:', error);
      throw new Error(`Failed to generate NPC: ${error.message}`);
    }
  }

  async generateCombatEncounter(partyLevel, partySize, difficulty = 'medium', theme = '') {
    try {
      const prompt = `As a Dungeon Master, I need you to design a combat encounter for my party.

Party Level: ${partyLevel}
Party Size: ${partySize} players
Difficulty: ${difficulty}
Theme: ${theme || 'General fantasy'}

Please provide:
1. Encounter description and setup
2. Enemy composition and stats overview
3. Terrain and environmental factors
4. Tactical considerations
5. Potential complications or reinforcements
6. Rewards and loot suggestions
7. Story integration and aftermath
8. Alternative resolution methods (non-combat options)

Make this encounter balanced, engaging, and story-relevant.`;

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

  async generateStoryContinuation(partyCharacters, storyHistory, playerResponse, responseType = 'individual', partyInfo = null) {
    try {
      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class}`
      ).join(', ');

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

      const prompt = `As a Dungeon Master, continue the story based on the player's response.

Party: ${characterDetails}${partyContext}
Player Response: "${playerResponse}" (Type: ${responseType})
Response Type Context:
- individual: One character's personal action
- team: Group action or decision
- investigate: Looking for clues or information
- combat: Combat-related action
- social: Social interaction or diplomacy

Previous Story Context:
${conversationHistory.map(msg => `${msg.role === 'assistant' ? 'DM' : 'Player'}: ${msg.content}`).join('\n')}

Important Guidelines:
- Use the party theme to influence the atmosphere and tone of the story
- Incorporate themes and elements from the party theme to maintain narrative consistency
- Consider how the party's background and composition might influence NPC reactions and story developments
- Focus on the characters and their individual stories
- The story should feel cohesive with the established theme

Please provide a compelling continuation that:
1. Acknowledges the player's action and its consequences
2. Advances the story naturally and creates new opportunities
3. Maintains the campaign's tone and pacing
4. Considers the response type and party composition
5. Ends with a clear situation that invites the next player to respond
6. Encourages character interaction and roleplay
7. Provides multiple possible directions for the party to explore

Keep your response engaging but concise (2-3 paragraphs maximum). Remember that only one player responds at a time, so end with a situation that gives the next player something meaningful to react to.`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        ...conversationHistory,
        { role: "user", content: prompt }
      ], 'gpt-4', 800, 0.8);

      return response.choices[0].message.content;
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
Selected Plot: Plot ${selectedPlot}
Plot Details: ${plotContent}

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

  async generateStructuredStoryResponse(partyCharacters, storyHistory, playerResponse, currentPhase, discoveredObjectives, partyInfo = null) {
    try {
      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class}`
      ).join(', ');

      const conversationHistory = storyHistory.map(msg => ({
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

      const prompt = `As a Dungeon Master, continue the story based on the player's response, considering the current story phase and discovered objectives.

Party: ${characterDetails}${partyContext}
Current Phase: ${currentPhase}
Player Response: "${playerResponse}"${objectiveContext}

Story Phases:
- Investigation: Focus on discovery, clues, and gathering information
- Conflict: Focus on tension, threats, and potential combat
- Resolution: Focus on choices, consequences, and story conclusion

Previous Story Context:
${conversationHistory.map(msg => `${msg.role === 'assistant' ? 'DM' : 'Player'}: ${msg.content}`).join('\n')}

Guidelines for ${currentPhase} Phase:
${currentPhase === 'Investigation' ? 
  '- Encourage exploration and discovery\n- Provide subtle clues and hints\n- Create opportunities for investigation\n- Build mystery and intrigue' :
  currentPhase === 'Conflict' ?
  '- Increase tension and stakes\n- Present clear threats or challenges\n- Create opportunities for combat or diplomacy\n- Force difficult choices' :
  '- Provide clear resolution paths\n- Show consequences of previous choices\n- Allow for meaningful conclusions\n- Tie up loose ends'
}

Important Guidelines:
- Use the party theme to influence the atmosphere and tone
- Consider discovered objectives when crafting responses
- Maintain story coherence and logical progression
- Provide multiple possible directions for the party
- End with a situation that invites the next player to respond
- Keep responses engaging but concise (2-3 paragraphs maximum)

Remember that objectives are discovered organically through player actions, not explicitly mentioned.`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        ...conversationHistory,
        { role: "user", content: prompt }
      ], 'gpt-4', 800, 0.8);

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

      const nextPhase = currentPhase === 'Investigation' ? 'Conflict' : 'Resolution';

      const prompt = `As a Dungeon Master, create a natural transition from the ${currentPhase} phase to the ${nextPhase} phase of the story.

Party: ${characterDetails}${partyContext}
Current Phase: ${currentPhase}
Next Phase: ${nextPhase}
Story Progress: ${storyProgress}

Create a transition that:
1. Acknowledges the party's progress and discoveries
2. Naturally escalates or resolves the situation
3. Introduces new challenges or opportunities appropriate to the ${nextPhase} phase
4. Maintains the story's momentum and engagement
5. Provides clear direction for the party's next actions

Phase Transition Guidelines:
${nextPhase === 'Conflict' ? 
  '- Escalate the situation with a clear threat or challenge\n- Introduce enemies, obstacles, or time pressure\n- Create urgency and stakes\n- Provide opportunities for combat or diplomacy' :
  '- Present clear resolution paths based on previous choices\n- Show consequences of the party\'s actions\n- Allow for meaningful conclusions\n- Provide closure to the current story arc'
}

Important Guidelines:
- Use the party theme to influence the transition's tone
- Make the transition feel natural and earned
- Maintain story coherence and logical progression
- Provide multiple possible directions for the party
- Keep the transition engaging but concise (2-3 paragraphs maximum)`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ], 'gpt-4', 600, 0.8);

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

      const prompt = `As a Dungeon Master, acknowledge the completion of an objective and show its impact on the story.

Party: ${characterDetails}${partyContext}
Completed Objective: ${completedObjective.title}
Objective Type: ${completedObjective.type}
Story Context: ${storyContext}

Create a response that:
1. Acknowledges the party's success in completing the objective
2. Shows the immediate consequences and impact
3. Reveals new information or opportunities
4. Maintains story momentum and engagement
5. Provides direction for the party's next actions

Objective Completion Guidelines:
- Show how the completed objective affects the story
- Reveal new information, NPCs, or opportunities
- Maintain the story's tone and atmosphere
- Provide clear next steps for the party
- Keep the response engaging but concise (2-3 paragraphs maximum)

Important Guidelines:
- Use the party theme to influence the completion's tone
- Make the completion feel meaningful and impactful
- Maintain story coherence and logical progression
- Provide multiple possible directions for the party
- Don't explicitly mention "objectives" - make it feel natural`;

      const response = await callBackendAPI([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ], 'gpt-4', 600, 0.8);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating objective completion:', error);
      throw new Error(`Failed to generate objective completion: ${error.message}`);
    }
  }
}

export const dungeonMasterService = new DungeonMasterService(); 