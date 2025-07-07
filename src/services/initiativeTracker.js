import { 
  getCampaignStory, 
  updateCampaignStory
} from '../firebase/database';

export class InitiativeTrackerService {
  constructor() {
    this.initiativeOrder = [];
    this.currentTurn = 0;
    this.round = 1;
    this.combatActive = false;
  }

  // Roll initiative for all participants
  async rollInitiative(partyId, participants) {
    try {
      const initiativeResults = participants.map(participant => {
        const roll = Math.floor(Math.random() * 20) + 1;
        const modifier = participant.initiativeModifier || 0;
        const total = roll + modifier;
        
        return {
          id: participant.id,
          name: participant.name,
          type: participant.type, // 'player' or 'enemy'
          roll: roll,
          modifier: modifier,
          total: total,
          initiative: total
        };
      });

      // Sort by initiative (highest first)
      initiativeResults.sort((a, b) => b.initiative - a.initiative);

      // Save to campaign story
      const campaignStory = await getCampaignStory(partyId);
      const updatedStory = {
        ...campaignStory,
        combat: {
          ...campaignStory?.combat,
          initiativeOrder: initiativeResults,
          currentTurn: 0,
          round: 1,
          active: true,
          startedAt: new Date()
        }
      };

      await updateCampaignStory(partyId, updatedStory);
      return initiativeResults;
    } catch (error) {
      console.error('Error rolling initiative:', error);
      throw error;
    }
  }

  // Get current initiative order
  async getInitiativeOrder(partyId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      return campaignStory?.combat?.initiativeOrder || [];
    } catch (error) {
      console.error('Error getting initiative order:', error);
      throw error;
    }
  }

  // Advance to next turn
  async nextTurn(partyId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      const combat = campaignStory?.combat;
      
      if (!combat || !combat.active) {
        throw new Error('No active combat');
      }

      let newTurn = combat.currentTurn + 1;
      let newRound = combat.round;

      // If we've gone through all participants, start new round
      if (newTurn >= combat.initiativeOrder.length) {
        newTurn = 0;
        newRound = combat.round + 1;
      }

      const updatedStory = {
        ...campaignStory,
        combat: {
          ...combat,
          currentTurn: newTurn,
          round: newRound
        }
      };

      await updateCampaignStory(partyId, updatedStory);
      return {
        currentTurn: newTurn,
        round: newRound,
        currentParticipant: combat.initiativeOrder[newTurn]
      };
    } catch (error) {
      console.error('Error advancing turn:', error);
      throw error;
    }
  }

  // End combat
  async endCombat(partyId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      const updatedStory = {
        ...campaignStory,
        combat: {
          ...campaignStory?.combat,
          active: false,
          endedAt: new Date()
        }
      };

      await updateCampaignStory(partyId, updatedStory);
      return true;
    } catch (error) {
      console.error('Error ending combat:', error);
      throw error;
    }
  }

  // Get current combat state
  async getCombatState(partyId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      return campaignStory?.combat || null;
    } catch (error) {
      console.error('Error getting combat state:', error);
      throw error;
    }
  }

  // Add participant to combat
  async addParticipant(partyId, participant) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      const combat = campaignStory?.combat;
      
      if (!combat || !combat.active) {
        throw new Error('No active combat');
      }

      const roll = Math.floor(Math.random() * 20) + 1;
      const modifier = participant.initiativeModifier || 0;
      const total = roll + modifier;

      const newParticipant = {
        id: participant.id,
        name: participant.name,
        type: participant.type,
        roll: roll,
        modifier: modifier,
        total: total,
        initiative: total
      };

      const updatedInitiativeOrder = [...combat.initiativeOrder, newParticipant];
      updatedInitiativeOrder.sort((a, b) => b.initiative - a.initiative);

      const updatedStory = {
        ...campaignStory,
        combat: {
          ...combat,
          initiativeOrder: updatedInitiativeOrder
        }
      };

      await updateCampaignStory(partyId, updatedStory);
      return newParticipant;
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  }

  // Remove participant from combat
  async removeParticipant(partyId, participantId) {
    try {
      const campaignStory = await getCampaignStory(partyId);
      const combat = campaignStory?.combat;
      
      if (!combat || !combat.active) {
        throw new Error('No active combat');
      }

      const updatedInitiativeOrder = combat.initiativeOrder.filter(p => p.id !== participantId);
      
      // Adjust current turn if necessary
      let newTurn = combat.currentTurn;
      if (combat.currentTurn >= updatedInitiativeOrder.length) {
        newTurn = 0;
      }

      const updatedStory = {
        ...campaignStory,
        combat: {
          ...combat,
          initiativeOrder: updatedInitiativeOrder,
          currentTurn: newTurn
        }
      };

      await updateCampaignStory(partyId, updatedStory);
      return true;
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }
}

export const initiativeTrackerService = new InitiativeTrackerService(); 