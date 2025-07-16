# Campaign Separation Documentation

## Overview
This document outlines the complete separation between Manual Campaigns and AI-Assisted Campaigns in the D&D application. Both systems are fully intact and entirely separated to ensure no cross-contamination.

## Campaign Types

### 1. AI-Assisted Campaigns (`campaignType: 'ai-assist'`)
- **Purpose**: AI-powered storytelling with dynamic encounters, NPCs, and story generation
- **Features**: Ready-up phase, AI story generation, voting phases, dynamic storytelling
- **Status Flow**: `ready_up` → `voting` → `storytelling` → `paused` → `completed`

### 2. Manual Campaigns (`campaignType: 'manual'`)
- **Purpose**: Traditional D&D experience with manual story creation
- **Features**: Direct DM control, map editor, scene management, manual combat
- **Status Flow**: `active` → `paused` → `completed` (no ready-up phase)

## Complete Separation Architecture

### Database Functions
- **AI Campaigns**: `createAICampaignStory()` - Creates stories with `status: 'ready_up'`
- **Manual Campaigns**: `createManualCampaignStory()` - Creates stories with `status: 'active'`
- **Shared**: `getCampaignStory()`, `updateCampaignStory()` - Work with both types

### Routing
- **AI Campaigns**: `/campaign/${partyId}` → `CampaignStory` component
- **Manual Campaigns**: 
  - DM: `/manual-campaign-dm/${partyId}` → `ManualCampaignDM` component
  - Players: `/manual-campaign/${partyId}` → `ManualCampaign` component

### Services
- **AI Campaigns**: 
  - `useCampaignStory` hook
  - `dungeonMasterService` (chatgpt.js)
  - `actionValidationService`
- **Manual Campaigns**:
  - `manualCampaignService`
  - `dmToolsService`
- **Shared**: `combatService` (consistent combat mechanics)

### Components
- **AI Campaigns**:
  - `CampaignStory.jsx`
  - `ReadyUpPhase.jsx`
  - `VotingPhase.jsx`
  - `StorytellingPhase.jsx`
  - `LoadingPhases.jsx`
- **Manual Campaigns**:
  - `ManualCampaign.jsx`
  - `ManualCampaignDM.jsx`
  - `DMMapEditor.jsx`
  - `DMInitiativeTracker.jsx`
  - `DMCatalogs.jsx`
- **Shared**: `PlayerCharacterSheet.jsx`, `SpellSelectionModal.jsx` (utility components)

### Database Schema Differences

#### AI Campaign Stories
```javascript
{
  partyId: string,
  type: 'ai-assist',
  status: 'ready_up' | 'voting' | 'storytelling' | 'paused' | 'completed',
  currentPlot: object,
  storyMessages: array,
  votingSession: object,
  readyPlayers: array,
  // ... AI-specific fields
}
```

#### Manual Campaign Stories
```javascript
{
  partyId: string,
  type: 'manual',
  status: 'active' | 'paused' | 'completed',
  currentScene: string,
  storyHistory: array,
  playerViewMode: string,
  campaignMap: object,
  // ... Manual-specific fields
}
```

## Key Separation Points

### 1. Campaign Creation
- **AI**: Uses `createAICampaignStory()` with ready-up phase
- **Manual**: Uses `createManualCampaignStory()` with active status

### 2. User Flow
- **AI**: Dashboard → Character Creation → Campaign Story (ready-up) → Story Generation
- **Manual**: Dashboard → Character Creation → Direct to Campaign Interface

### 3. Story Management
- **AI**: AI generates story content, players vote on plots
- **Manual**: DM manually creates scenes, manages objectives

### 4. Combat Integration
- **AI**: Combat triggered by AI story progression
- **Manual**: Combat manually initiated by DM

### 5. Player Experience
- **AI**: Players see AI-generated content, participate in voting
- **Manual**: Players see DM-controlled content, follow DM's lead

## Shared Resources

### Safe to Share
- Character management (creation, stats, equipment)
- Combat mechanics (turn-based, initiative, actions)
- User authentication and profiles
- Party management (members, roles)
- Utility components (character sheets, spell selection)

### Strictly Separated
- Campaign story creation and management
- Story content generation
- Player ready-up systems
- Voting and plot selection
- Scene and objective management

## Validation

### Campaign Type Validation
```javascript
const validTypes = ['ai-assist', 'manual'];
```

### Routing Validation
- Dashboard checks `party.campaignType` before routing
- Character creation redirects DMs of manual campaigns to DM interface
- Lobby handles both types appropriately

## Testing Checklist

### AI Campaign Flow
- [ ] Create AI-assisted party
- [ ] Navigate to campaign story
- [ ] Ready-up phase appears
- [ ] All players ready up
- [ ] DM starts story generation
- [ ] Voting phase works
- [ ] Storytelling phase works
- [ ] Combat integration works

### Manual Campaign Flow
- [ ] Create manual party
- [ ] Navigate directly to campaign interface
- [ ] No ready-up phase appears
- [ ] DM can create scenes
- [ ] Map editor works
- [ ] Player view controls work
- [ ] Manual combat works

### Separation Verification
- [ ] AI campaigns never show manual components
- [ ] Manual campaigns never show AI components
- [ ] No cross-contamination of story data
- [ ] Proper routing based on campaign type
- [ ] Shared components work for both types

## Maintenance

### Adding New Features
1. Determine if feature is campaign-specific or shared
2. Use appropriate service/hook for the campaign type
3. Update routing logic if needed
4. Test both campaign types

### Database Changes
1. Consider impact on both campaign types
2. Update both creation functions if needed
3. Maintain backward compatibility
4. Test data migration if required

## Conclusion

The manual and AI-assisted campaigns are completely separated systems that share only essential utilities. Each maintains its own:
- Database creation functions
- Service layers
- Component hierarchies
- User flows
- Story management approaches

This separation ensures that changes to one system do not affect the other, while maintaining consistency in shared areas like character management and combat mechanics. 