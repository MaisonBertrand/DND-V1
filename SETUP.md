# ChatGPT API Setup Guide

This D&D Campaign Manager now includes an AI Dungeon Master powered by ChatGPT! Here's how to set it up:

## Prerequisites

1. An OpenAI API key (get one at https://platform.openai.com/api-keys)
2. A Vite-based React project (this one!)

## Setup Instructions

### 1. Install Dependencies

The OpenAI package has been added to `package.json`. Run:

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in your project root with your OpenAI API key:

```env
VITE_OPENAI_API_KEY=your_actual_openai_api_key_here
```

**Important:** Replace `your_actual_openai_api_key_here` with your real OpenAI API key.

### 3. Security Note

⚠️ **Important Security Warning:** This implementation uses `dangerouslyAllowBrowser: true` which exposes your API key to the client-side. For production applications, you should:

1. Create a backend API that proxies requests to OpenAI
2. Store your API key securely on the server
3. Never expose API keys in client-side code

For development and personal use, this setup is fine, but be aware of the security implications.

## Features

The AI Dungeon Master can:

### 📖 Generate Story Plots
- Creates 3 different campaign plot options
- Considers your party composition
- Includes campaign setting customization
- Provides plot summaries and story hooks

### 👤 Expand Character Details
- Generates detailed character descriptions
- Creates rich backstories and motivations
- Suggests story hooks for each character
- Provides personality quirks and mannerisms

### 🏰 Create NPCs
- Generates detailed NPCs with roles and motivations
- Includes personality traits and backstories
- Suggests plot hooks and quest opportunities
- Provides interaction guidelines

### ⚔️ Design Combat Encounters
- Creates balanced encounters for your party
- Includes terrain and environmental factors
- Suggests tactical considerations
- Provides alternative resolution methods

## Usage

1. Navigate to your campaign management page
2. Click on the "🤖 AI Dungeon Master" tab
3. Choose the type of content you want to generate
4. Fill in the required information
5. Click the generate button
6. Copy and use the generated content in your campaign!

## Troubleshooting

### "Failed to generate content" error
- Check that your API key is correct
- Ensure you have sufficient OpenAI credits
- Verify your internet connection

### "Setup Required" warning
- Make sure you've created the `.env` file
- Ensure the environment variable name is exactly `VITE_OPENAI_API_KEY`
- Restart your development server after adding the environment variable

### API Rate Limits
- OpenAI has rate limits on API calls
- If you hit limits, wait a moment and try again
- Consider upgrading your OpenAI plan for higher limits

## Cost Considerations

- Each API call costs money based on OpenAI's pricing
- GPT-4 is more expensive but provides better quality
- Monitor your usage at https://platform.openai.com/usage
- Consider using GPT-3.5-turbo for cost savings (modify the model in `src/services/chatgpt.js`)

## Customization

You can customize the AI Dungeon Master by editing `src/services/chatgpt.js`:

- Change the system prompt for different DM styles
- Adjust temperature for more/less creative responses
- Modify token limits for longer/shorter responses
- Add new generation functions for other content types

Happy adventuring! 🎲 