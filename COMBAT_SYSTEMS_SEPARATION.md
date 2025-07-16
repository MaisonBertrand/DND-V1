# Combat Systems Separation Documentation

## Overview
This document outlines the complete separation between AI-Assisted Combat and Manual Combat systems in the D&D application. Both systems are fully functional and entirely independent of each other.

## System Architecture

### 1. AI-Assisted Combat System
**Purpose**: Complex, AI-driven combat with narrative generation, enemy AI, and dynamic storytelling
**Location**: `src/services/combat/` folder
**Used by**: AI-assisted campaigns (`campaignType: 'ai-assist'`)

#### Key Components:
- `combatService.js` - Main AI combat service with complex mechanics
- `enemyAI.js` - AI-driven enemy decision making
- `combatCalculations.js` - Advanced combat calculations
- `combatNarrative.js` - AI-generated combat narratives
- `combatData.js` - AI combat data and configurations

#### Features:
- AI-driven enemy actions and decision making
- Complex narrative generation for combat actions
- Environmental features and team-up opportunities
- Status effects and cooldown management
- Pokemon-style combat mechanics
- Dynamic story integration

#### Database Collections:
- `combatSessions` - Stores AI combat session data
- `campaignStories` - AI campaign stories with combat integration

---

### 2. Manual Combat System
**Purpose**: Simple, DM-controlled combat with basic initiative and turn management
**Location**: `src/services/manualCombat.js`
**Used by**: Manual campaigns (`campaignType: 'manual'`)

#### Key Components:
- `manualCombatService` - Main manual combat service
- `manualDiceRoller` - Simple dice rolling functions
- `manualMonsters` - Monster catalog for manual combat
- `manualItems` - Item catalog for manual combat
- `manualSpells` - Spell catalog for manual combat

#### Features:
- Simple initiative rolling and turn management
- Basic monster, item, and spell catalogs
- DM-controlled combat flow
- Real-time combat state updates
- Grid-based combat positioning

#### Database Collections:
- `campaignStories` - Manual campaign stories with combat data

---

## Complete Separation Points

### 1. Service Files
```
AI Combat:     src/services/combat/
├── combatService.js
├── enemyAI.js
├── combatCalculations.js
├── combatNarrative.js
└── combatData.js

Manual Combat: src/services/manualCombat.js
└── (single consolidated file)
```

### 2. Import Structure
```javascript
// AI Combat imports
import { combatService } from './combat/combatService.js';
import { enemyAI } from './combat/enemyAI.js';

// Manual Combat imports
import { manualCombatService } from './manualCombat.js';
```

### 3. Component Usage
```javascript
// AI Combat Components
import Combat from '../pages/Combat.jsx';  // AI combat page

// Manual Combat Components
import DMCombatView from '../components/dm/DMCombatView.jsx';  // Manual combat view
```

### 4. Database Operations
```javascript
// AI Combat - Uses combatSessions collection
await createCombatSession(partyId, combatData);
await updateCombatSession(sessionId, updates);

// Manual Combat - Uses campaignStories.combat field
await updateCampaignStory(storyId, { combat: combatData });
```

---

## Functionality Comparison

### AI-Assisted Combat
- **Complexity**: High - AI-driven decisions, narrative generation
- **Enemy Behavior**: Intelligent AI with class-based actions
- **Narrative**: Rich, AI-generated combat descriptions
- **Mechanics**: Advanced with status effects, cooldowns, environmental features
- **Integration**: Deep story integration with AI-generated content
- **User Control**: Limited - AI handles most decisions

### Manual Combat
- **Complexity**: Low - Simple initiative and turn management
- **Enemy Behavior**: DM-controlled actions
- **Narrative**: Basic turn descriptions
- **Mechanics**: Simple initiative, basic actions
- **Integration**: Basic story integration
- **User Control**: Full DM control over all aspects

---

## Usage Patterns

### AI-Assisted Campaigns
1. AI generates story content
2. Combat triggered by AI story progression
3. AI controls enemy actions
4. Rich narrative generated for each action
5. Complex mechanics with status effects

### Manual Campaigns
1. DM creates story content manually
2. Combat initiated by DM through combat view
3. DM controls all combat aspects
4. Simple turn-based mechanics
5. Basic initiative and action system

---

## Shared Resources

### Safe to Share
- Character management (stats, equipment, spells)
- User authentication and profiles
- Party management (members, roles)
- Basic UI components (character sheets, spell selection)

### Strictly Separated
- Combat mechanics and calculations
- Enemy behavior and AI
- Narrative generation
- Database schemas and operations
- Service architectures

---

## Migration and Compatibility

### No Cross-Contamination
- AI combat services cannot be used in manual campaigns
- Manual combat services cannot be used in AI campaigns
- Database schemas are completely separate
- No shared combat state or mechanics

### Independent Development
- Each system can be developed independently
- Changes to one system do not affect the other
- Separate testing and deployment possible
- Different feature sets and complexity levels

---

## Testing and Validation

### AI Combat Testing
- Test AI enemy decision making
- Validate narrative generation
- Check complex mechanics and calculations
- Verify story integration

### Manual Combat Testing
- Test initiative rolling and turn management
- Validate DM controls and permissions
- Check basic combat flow
- Verify real-time updates

---

## Future Development

### AI Combat Enhancements
- More sophisticated enemy AI
- Enhanced narrative generation
- Additional status effects and mechanics
- Advanced environmental interactions

### Manual Combat Enhancements
- Additional monster types
- More detailed combat grid features
- Enhanced DM tools and controls
- Better player visibility options

---

## Conclusion

The combat systems are completely separated and independent. This architecture allows for:

1. **Clear separation of concerns** - Each system serves its specific purpose
2. **Independent development** - Teams can work on each system separately
3. **Different complexity levels** - AI system for advanced users, manual for traditional D&D
4. **No interference** - Changes to one system don't affect the other
5. **Scalability** - Each system can evolve independently

Both systems are fully functional and ready for use in their respective campaign types. 