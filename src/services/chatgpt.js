import OpenAI from 'openai';

// Don't initialize OpenAI client immediately - do it lazily when needed
let openai = null;

const getOpenAIClient = () => {
  if (!openai) {
    openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'dummy-key',
      dangerouslyAllowBrowser: true // Note: In production, you should use a backend proxy
    });
  }
  return openai;
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

  async generateStoryPlots(partyCharacters, campaignSetting = '') {
    try {
      if (!import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
      }

      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class} (${char.alignment})`
      ).join(', ');

      const prompt = `As a Dungeon Master, I need you to generate 3 different story plot options for a D&D campaign.

Party Composition: ${characterDetails}
Campaign Setting: ${campaignSetting || 'Generic fantasy world'}

For each plot option, provide:
1. A compelling title
2. A brief summary (2-3 sentences)
3. The main conflict or challenge
4. Potential story hooks for the party
5. Estimated campaign length (short, medium, or long)

Make each plot distinct and appealing to different play styles. Consider the party composition when crafting these options.`;

      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.8
      });

      return response.choices[0].message.content;
    } catch (error) {
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
      }
      throw new Error('Failed to generate story plots. Please check your API key and try again.');
    }
  }

  async generateCharacterDetails(character) {
    try {
      if (!import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
      }

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

      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating character details:', error);
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
      }
      throw new Error('Failed to generate character details. Please check your API key and try again.');
    }
  }

  async generateStorySummary(plotOption, partyCharacters) {
    try {
      // Check if API key is properly configured
      if (!import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
      }

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

      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 1200,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating story summary:', error);
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
      }
      throw new Error('Failed to generate story summary. Please check your API key and try again.');
    }
  }

  async generateMultipleStoryPlots(partyCharacters, campaignSetting = '') {
    try {
      // Check if API key is properly configured
      if (!import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
      }

      const characterDetails = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class} (${char.alignment})`
      ).join(', ');

      const prompt = `As a Dungeon Master, I need you to generate 5 different story plot options for a D&D campaign, each with a detailed summary.

Party Composition: ${characterDetails}
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

Make each plot distinct and appealing to different play styles. Consider the party composition when crafting these options. Number each plot clearly (Plot 1, Plot 2, etc.).`;

      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.8
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating multiple story plots:', error);
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
      }
      throw new Error('Failed to generate multiple story plots. Please check your API key and try again.');
    }
  }

  async generateNPC(role, context = '') {
    try {
      // Check if API key is properly configured
      if (!import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
      }

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

      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 600,
        temperature: 0.8
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating NPC:', error);
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
      }
      throw new Error('Failed to generate NPC. Please check your API key and try again.');
    }
  }

  async generateCombatEncounter(partyLevel, partySize, difficulty = 'medium', theme = '') {
    try {
      // Check if API key is properly configured
      if (!import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
      }

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

      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating combat encounter:', error);
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
      }
      throw new Error('Failed to generate combat encounter. Please check your API key and try again.');
    }
  }
}

export const dungeonMasterService = new DungeonMasterService(); 