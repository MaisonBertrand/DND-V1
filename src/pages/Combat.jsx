import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { 
  getCombatSession, 
  updateCombatSession, 
  updateCombatSessionWithNarrative,
  subscribeToCombatSession,
  updateCampaignStory,
  getPartyCharacters
} from '../firebase/database';
import { combatService } from '../services/combat';
import DiceRollingService from '../services/diceRolling';
import ActionValidationService from '../services/actionValidation';
import DiceRollDisplay from '../components/DiceRollDisplay';
import ActionValidationDisplay from '../components/ActionValidationDisplay';

export default function Combat() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [combatSession, setCombatSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partyCharacters, setPartyCharacters] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [narrativeDescription, setNarrativeDescription] = useState('');
  const [availableActions, setAvailableActions] = useState([]);
  const [environmentalFeatures, setEnvironmentalFeatures] = useState([]);
  const [teamUpOpportunities, setTeamUpOpportunities] = useState([]);
  const [isEnemyTurn, setIsEnemyTurn] = useState(false);
  const [enemyTurnMessage, setEnemyTurnMessage] = useState('');
  const [enemyTurnNarrative, setEnemyTurnNarrative] = useState('');
  const [processingTurn, setProcessingTurn] = useState(false);
  const [playerDied, setPlayerDied] = useState(false);
  const [deadPlayer, setDeadPlayer] = useState(null);
  const [lastProcessedTurn, setLastProcessedTurn] = useState(-1);
  
  // Dice rolling and action validation state
  const [diceService] = useState(() => new DiceRollingService());
  const [actionValidationService] = useState(() => new ActionValidationService());
  const [showDiceRoll, setShowDiceRoll] = useState(false);
  const [showActionValidation, setShowActionValidation] = useState(false);
  const [currentDiceResult, setCurrentDiceResult] = useState(null);
  const [currentValidation, setCurrentValidation] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [customActionInput, setCustomActionInput] = useState('');
  const [showCustomActionInput, setShowCustomActionInput] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user && partyId) {
      loadCombatData();
    }
  }, [user, partyId]);

  useEffect(() => {
    if (partyId) {
      const unsubscribe = subscribeToCombatSession(partyId, (session) => {
        setCombatSession(session);
        setLoading(false);
        
        if (session) {
          // Update available actions based on current combatant
          updateAvailableActions(session);
          setEnvironmentalFeatures(session.environmentalFeatures || []);
          setTeamUpOpportunities(session.teamUpOpportunities || []);
          
          // Check for player death
          checkPlayerDeath();
          
          // Check if current turn is an enemy turn and auto-process
          // Only process if we haven't already processed this turn and it's not currently processing
          const currentCombatant = session.combatants?.[session.currentTurn];
          if (currentCombatant && 
              currentCombatant.id.startsWith('enemy_') && 
              session.combatState === 'active' &&
              session.currentTurn !== lastProcessedTurn &&
              !processingTurn &&
              !isEnemyTurn) {
            
            console.log('Auto-processing enemy turn for:', currentCombatant.name, 'turn:', session.currentTurn);
            setLastProcessedTurn(session.currentTurn);
            
            // Delay to allow UI to update first
            setTimeout(() => {
              processEnemyTurn();
            }, 1000);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [partyId, lastProcessedTurn, processingTurn, isEnemyTurn]);

  const loadCombatData = async () => {
    try {
      setLoading(true);
      const session = await getCombatSession(partyId);
      
      // Check if this is a test combat session
      const isTestCombat = partyId === 'test-combat-party';
      
      if (!session) {
        // No active combat session
        if (isTestCombat) {
          // For test combat, redirect to dashboard if no session
          console.log('No test combat session found, redirecting to dashboard');
          navigate('/dashboard');
        } else {
          // For regular combat, redirect back to story
          console.log('No combat session found, navigating to story with partyId:', partyId);
          try {
            navigate(`/campaign-story/${partyId}`);
          } catch (error) {
            console.error('Navigation error in loadCombatData:', error);
            navigate('/dashboard');
          }
        }
        return;
      }
      
      // For test combat, skip loading party characters and campaign story
      if (!isTestCombat) {
        const characters = await getPartyCharacters(partyId);
        setPartyCharacters(characters);
      } else {
        // For test combat, use the party members from the session
        setPartyCharacters(session.partyMembers || []);
      }
      
      // Check if there are enemies to fight
      if (session.enemies && session.enemies.length === 0) {
        // No enemies to fight, show message and redirect
        setCombatSession({ ...session, status: 'no_enemies' });
        return;
      }
      
      setCombatSession(session);
      updateAvailableActions(session);
      setEnvironmentalFeatures(session.environmentalFeatures || []);
      setTeamUpOpportunities(session.teamUpOpportunities || []);
    } catch (error) {
      console.error('Error loading combat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAvailableActions = (session) => {
    const currentCombatant = getCurrentCombatant(session);
    if (!currentCombatant) return;

    const actions = [];
    const cooldowns = currentCombatant.cooldowns || {};

    // Add basic actions
    Object.entries(combatService.actionTypes).forEach(([actionType, config]) => {
      if (cooldowns[actionType] === 0 || cooldowns[actionType] === undefined) {
        actions.push({
          type: actionType,
          name: config.name,
          description: config.description,
          priority: config.priority,
          narrativeTemplate: config.narrativeTemplate
        });
      }
    });

    // Add class-specific abilities
    const classAbility = combatService.classAbilities[currentCombatant.class?.toLowerCase()];
    if (classAbility && (cooldowns.special === 0 || cooldowns.special === undefined)) {
      actions.push({
        type: 'special',
        name: classAbility.name,
        description: classAbility.description,
        priority: 'high',
        narrativeTemplate: '{character} uses their {ability}!'
      });
    }

    // Add environmental actions if available
    if (environmentalFeatures.length > 0) {
      actions.push({
        type: 'environmental',
        name: 'Use Environment',
        description: 'Use the environment to your advantage',
        priority: 'normal',
        narrativeTemplate: '{character} uses the {environment} to their advantage!'
      });
    }

    // Add team-up actions if available
    if (teamUpOpportunities.length > 0) {
      actions.push({
        type: 'teamUp',
        name: 'Team Up',
        description: 'Coordinate with another party member',
        priority: 'high',
        narrativeTemplate: '{character} coordinates with {ally} for a powerful combination!'
      });
    }

    setAvailableActions(actions);
  };

  const startCombat = async () => {
    if (!combatSession) return;
    
    // Initialize combat with Pokemon-style mechanics
    const initializedCombat = combatService.initializeCombat(
      combatSession.partyMembers,
      combatSession.enemies,
      combatSession.storyContext
    );
    
    // Extract party members and enemies from the combatants array for backward compatibility
    const updatedPartyMembers = initializedCombat.combatants.filter(c => !c.id.startsWith('enemy_'));
    const updatedEnemies = initializedCombat.combatants.filter(c => c.id.startsWith('enemy_'));
    
    await updateCombatSessionWithNarrative(combatSession.id, {
      ...initializedCombat,
      partyMembers: updatedPartyMembers,
      enemies: updatedEnemies,
      combatState: 'active'
    });
  };

  const nextTurn = async () => {
    await advanceTurn();
  };

  const previousTurn = async () => {
    if (!combatSession) return;
    const newTurn = (combatSession.currentTurn - 1 + combatSession.combatants.length) % combatSession.combatants.length;
    await updateCombatSessionWithNarrative(combatSession.id, {
      currentTurn: newTurn
    });
    setSelectedAction(null);
    setSelectedTarget(null);
    setActionMessage('');
    setNarrativeDescription('');
  };

  const endCombat = async () => {
    if (!combatSession) return;
    
    // Check if this is a test combat session
    const isTestCombat = partyId === 'test-combat-party';
    
    // Generate combat summary
    const summary = combatService.generateCombatSummary(combatSession, 'victory');
    
    // Mark combat session as ended
    await updateCombatSessionWithNarrative(combatSession.id, {
      status: 'ended',
      combatState: 'ended',
      summary: summary
    });
    
    if (!isTestCombat) {
      // For regular combat, return story to active state
      await updateCampaignStory(partyId, {
        status: 'storytelling',
        currentCombat: null
      });
      
      // Navigate back to story
      try {
        console.log('Ending combat, navigating to story with partyId:', partyId);
        navigate(`/campaign-story/${partyId}`);
      } catch (error) {
        console.error('Navigation error in endCombat:', error);
        navigate('/dashboard');
      }
    } else {
      // For test combat, navigate back to dashboard
      console.log('Ending test combat, navigating to dashboard');
      navigate('/dashboard');
    }
  };

  const updateHp = async (combatantId, newHp) => {
    if (!combatSession) return;
    
    const clampedHp = Math.max(0, newHp);
    
    if (combatantId.startsWith('enemy_')) {
      const updatedEnemies = combatSession.enemies.map(enemy => 
        enemy.id === combatantId ? { ...enemy, hp: clampedHp } : enemy
      );
      const updatedCombatants = combatSession.combatants.map(combatant => 
        combatant.id === combatantId ? { ...combatant, hp: clampedHp } : combatant
      );
      await updateCombatSessionWithNarrative(combatSession.id, {
        enemies: updatedEnemies,
        combatants: updatedCombatants
      });
      
      // Update local state immediately
      setCombatSession(prevSession => ({
        ...prevSession,
        enemies: updatedEnemies,
        combatants: updatedCombatants
      }));
    } else {
      const updatedPartyMembers = combatSession.partyMembers.map(member => 
        member.id === combatantId ? { ...member, hp: clampedHp } : member
      );
      const updatedCombatants = combatSession.combatants.map(combatant => 
        combatant.id === combatantId ? { ...combatant, hp: clampedHp } : combatant
      );
      await updateCombatSessionWithNarrative(combatSession.id, {
        partyMembers: updatedPartyMembers,
        combatants: updatedCombatants
      });
      
      // Update local state immediately
      setCombatSession(prevSession => ({
        ...prevSession,
        partyMembers: updatedPartyMembers,
        combatants: updatedCombatants
      }));
    }
  };

  const getCurrentCombatant = (session = combatSession) => {
    if (!session?.combatants || session.currentTurn === undefined) return null;
    return session.combatants[session.currentTurn];
  };

  const isCurrentUserTurn = () => {
    const currentCombatant = getCurrentCombatant();
    return currentCombatant && currentCombatant.userId === user?.uid;
  };

  const getCurrentUserCharacter = () => {
    return partyCharacters.find(char => char.userId === user?.uid);
  };

  // Enhanced executeAction for player turns
  const executeAction = async (actionType, targetId, additionalData = {}) => {
    if (!combatSession || !actionType || !targetId || processingTurn) return;
    
    const currentChar = getCurrentUserCharacter();
    if (!currentChar) return;

    try {
      setProcessingTurn(true);
      
      // Execute action using combat service
      const result = await combatService.executeAction(
        combatSession,
        currentChar.id,
        actionType,
        targetId,
        additionalData
      );

      if (result.success) {
        // Extract updated party members and enemies from the combatants array
        const updatedPartyMembers = combatSession.combatants.filter(c => !c.id.startsWith('enemy_'));
        const updatedEnemies = combatSession.combatants.filter(c => c.id.startsWith('enemy_'));
        
        // Update the combat session in the database with the modified data
        await updateCombatSessionWithNarrative(combatSession.id, {
          combatants: combatSession.combatants,
          partyMembers: updatedPartyMembers,
          enemies: updatedEnemies
        });

        // Update local state to reflect the changes immediately
        setCombatSession(prevSession => ({
          ...prevSession,
          combatants: [...combatSession.combatants], // Create a new array to trigger re-render
          partyMembers: updatedPartyMembers,
          enemies: updatedEnemies
        }));

        setActionMessage(result.results.damage > 0 ? 
          `Dealt ${result.results.damage} damage!` : 
          result.results.healing > 0 ? 
          `Healed ${result.results.healing} HP!` : 
          'Action completed!'
        );
        setNarrativeDescription(result.narrative);
        
        // Process status effects
        if (result.statusEffects.length > 0) {
          const statusMessage = result.statusEffects.map(effect => 
            `${effect.type} applied to target!`
          ).join(', ');
          setActionMessage(prev => prev + ' ' + statusMessage);
        }
        
        // Show environmental impact
        if (result.environmentalImpact.length > 0) {
          setActionMessage(prev => prev + ' ' + result.environmentalImpact.join(', '));
        }
        
        // Check for enemy death
        const targetEnemy = updatedEnemies.find(e => e.id === targetId);
        if (targetEnemy && targetEnemy.hp <= 0) {
          setActionMessage(prev => prev + ` ${targetEnemy.name} has been defeated!`);
        }
        
        // Auto-advance turn after delay
        setTimeout(() => {
          advanceTurn();
        }, 3000);
      } else {
        setActionMessage(result.message);
      }
    } catch (error) {
      console.error('Error executing action:', error);
      setActionMessage('Failed to execute action');
    } finally {
      setProcessingTurn(false);
    }
  };

  // Process enemy turn automatically
  const processEnemyTurn = async () => {
    if (!combatSession || isEnemyTurn || processingTurn) {
      console.log('Enemy turn blocked - already processing or enemy turn active');
      return;
    }
    
    const currentCombatant = getCurrentCombatant();
    if (!currentCombatant || !currentCombatant.id.startsWith('enemy_')) {
      console.log('Enemy turn blocked - not an enemy turn');
      return;
    }
    
    // Check if we've already processed this turn
    if (lastProcessedTurn === combatSession.currentTurn) {
      console.log('Enemy turn blocked - already processed turn:', combatSession.currentTurn);
      return;
    }
    
    console.log('Starting enemy turn for:', currentCombatant.name);
    setIsEnemyTurn(true);
    setProcessingTurn(true);
    setLastProcessedTurn(combatSession.currentTurn);
    
    try {
      // Show enemy thinking message
      setEnemyTurnMessage(`${currentCombatant.name} is thinking...`);
      setEnemyTurnNarrative('');
      
      // Delay for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Execute enemy action
      const result = await combatService.executeEnemyTurn(combatSession, currentCombatant);
      
      if (result.success) {
        // Extract updated party members and enemies from the combatants array
        const updatedPartyMembers = combatSession.combatants.filter(c => !c.id.startsWith('enemy_'));
        const updatedEnemies = combatSession.combatants.filter(c => c.id.startsWith('enemy_'));
        
        // Update the combat session in the database with the modified data
        await updateCombatSessionWithNarrative(combatSession.id, {
          combatants: combatSession.combatants,
          partyMembers: updatedPartyMembers,
          enemies: updatedEnemies
        });

        // Update local state to reflect the changes immediately
        setCombatSession(prevSession => ({
          ...prevSession,
          combatants: [...combatSession.combatants], // Create a new array to trigger re-render
          partyMembers: updatedPartyMembers,
          enemies: updatedEnemies
        }));

        // Show enemy action with animation
        setEnemyTurnMessage(
          result.results.damage > 0 ? 
            `${currentCombatant.name} deals ${result.results.damage} damage!` : 
            result.results.healing > 0 ? 
            `${currentCombatant.name} heals ${result.results.healing} HP!` : 
            `${currentCombatant.name} takes action!`
        );
        setEnemyTurnNarrative(result.narrative);
        
        // Show status effects
        if (result.statusEffects.length > 0) {
          const statusMessage = result.statusEffects.map(effect => 
            `${effect.type} applied!`
          ).join(', ');
          setEnemyTurnMessage(prev => prev + ' ' + statusMessage);
        }
        
        // Show environmental impact
        if (result.environmentalImpact.length > 0) {
          setEnemyTurnMessage(prev => prev + ' ' + result.environmentalImpact.join(', '));
        }
        
        // Check for player death
        const targetPlayer = updatedPartyMembers.find(p => p.id === result.targetId);
        if (targetPlayer && targetPlayer.hp <= 0) {
          setEnemyTurnMessage(prev => prev + ` ${targetPlayer.name} has fallen!`);
        }
        
        // Delay before advancing turn
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Advance to next turn without recursion
        await advanceTurn();
      } else {
        setEnemyTurnMessage(result.message);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await advanceTurn();
      }
    } catch (error) {
      console.error('Error processing enemy turn:', error);
      setEnemyTurnMessage('Enemy turn failed');
      await new Promise(resolve => setTimeout(resolve, 2000));
      await advanceTurn();
    } finally {
      setIsEnemyTurn(false);
      setProcessingTurn(false);
      setEnemyTurnMessage('');
      setEnemyTurnNarrative('');
    }
  };

  // Separate function to advance turn without recursion
  const advanceTurn = async () => {
    if (!combatSession || processingTurn) return;
    
    const newTurn = (combatSession.currentTurn + 1) % combatSession.combatants.length;
    const nextCombatant = combatSession.combatants[newTurn];
    
    console.log('Advancing turn:', {
      currentTurn: combatSession.currentTurn,
      newTurn,
      nextCombatant: nextCombatant?.name,
      isEnemy: nextCombatant?.id.startsWith('enemy_'),
      totalCombatants: combatSession.combatants.length
    });
    
    // Update the combat session with new turn
    await updateCombatSessionWithNarrative(combatSession.id, {
      currentTurn: newTurn
    });
    
    // Update local state immediately
    setCombatSession(prevSession => ({
      ...prevSession,
      currentTurn: newTurn
    }));
    
    // Reset turn processing state
    setLastProcessedTurn(-1);
    
    // Clear UI state
    setSelectedAction(null);
    setSelectedTarget(null);
    setActionMessage('');
    setNarrativeDescription('');
    
    // Check for combat end conditions
    const endCondition = combatService.checkCombatEnd(combatSession);
    if (endCondition.ended) {
      console.log('Combat ended:', endCondition);
      setActionMessage(endCondition.narrative);
      setTimeout(() => {
        endCombat();
      }, 3000);
      return;
    }
    
    // Check if next turn is an enemy turn
    if (nextCombatant && nextCombatant.id.startsWith('enemy_')) {
      console.log('Next turn is enemy turn, scheduling processEnemyTurn');
      // Process enemy turn after a short delay
      setTimeout(() => {
        processEnemyTurn();
      }, 1000);
    } else {
      console.log('Next turn is player turn');
    }
  };

  // Process status effects at the start of turn
  const processStatusEffects = (combatant) => {
    if (!combatant.statusEffects || combatant.statusEffects.length === 0) return;
    
    const effects = combatService.processStatusEffects(combatSession, combatant);
    if (effects.length > 0) {
      setActionMessage(effects.join(', '));
    }
  };

  // Check if current player is dead
  const checkPlayerDeath = () => {
    if (!combatSession || !user) return;
    
    // Check both partyMembers and combatants arrays for consistency
    const currentPlayer = combatSession.partyMembers.find(p => p.userId === user.uid) ||
                         combatSession.combatants.find(c => c.userId === user.uid && !c.id.startsWith('enemy_'));
    if (currentPlayer && currentPlayer.hp <= 0) {
      setPlayerDied(true);
      setDeadPlayer(currentPlayer);
    }
  };

  // Handle player death
  const handlePlayerDeath = () => {
    if (partyId === 'test-combat-party') {
      // For test combat, return to dashboard
      navigate('/dashboard');
    } else {
      // For regular combat, return to character creation
      navigate(`/character-creation/${partyId}`);
    }
  };

  // Dice rolling and action validation functions
  const handleCustomAction = async (actionDescription) => {
    if (!actionDescription.trim()) return;

    const currentChar = getCurrentUserCharacter();
    if (!currentChar) return;

    // Validate the action
    const validation = actionValidationService.validatePlayerAction(
      actionDescription, 
      currentChar, 
      { context: 'combat', combatSession }
    );

    setCurrentValidation(validation);
    setShowActionValidation(true);
    setPendingAction(actionDescription);
  };

  const handleActionProceed = async () => {
    if (!pendingAction) return;

    const currentChar = getCurrentUserCharacter();
    if (!currentChar) return;

    // Perform dice checks for the action
    const diceResult = diceService.validateAction(pendingAction, currentChar, { context: 'combat' });
    setCurrentDiceResult(diceResult);
    setShowDiceRoll(true);
    setShowActionValidation(false);
  };

  const handleActionRevise = () => {
    setShowActionValidation(false);
    setShowCustomActionInput(true);
  };

  const handleDiceRollClose = () => {
    setShowDiceRoll(false);
    setCurrentDiceResult(null);
    setPendingAction(null);
  };

  const handleActionValidationClose = () => {
    setShowActionValidation(false);
    setCurrentValidation(null);
    setPendingAction(null);
  };

  const handleCustomActionSubmit = () => {
    if (customActionInput.trim()) {
      handleCustomAction(customActionInput);
      setCustomActionInput('');
      setShowCustomActionInput(false);
    }
  };

  const performSkillCheck = (actionType, circumstances = []) => {
    const currentChar = getCurrentUserCharacter();
    if (!currentChar) return null;

    return diceService.performSkillCheck(currentChar, actionType, circumstances);
  };

  const rollWithAdvantage = () => {
    return diceService.rollWithAdvantage();
  };

  const rollWithDisadvantage = () => {
    return diceService.rollWithDisadvantage();
  };

  const rollDie = (sides) => {
    return diceService.rollDie(sides);
  };

  const rollDice = (number, sides) => {
    return diceService.rollDice(number, sides);
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <div className="text-stone-600 mb-4">⚔️ Setting up battle arena...</div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!combatSession) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <div className="text-stone-600">No active combat session found.</div>
            <button 
              onClick={async () => {
                // Resume the story from where it was paused
                await updateCampaignStory(partyId, {
                  status: 'storytelling',
                  currentCombat: null
                });
                
                // Navigate back to story
                try {
                  console.log('Returning to story from no combat session, partyId:', partyId);
                  navigate(`/campaign-story/${partyId}`);
                } catch (error) {
                  console.error('Navigation error in return to story:', error);
                  navigate('/dashboard');
                }
              }}
              className="fantasy-button mt-4"
            >
              Return to Story
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no enemies to fight
  if (combatSession.status === 'no_enemies' || (combatSession.enemies && combatSession.enemies.length === 0)) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🕊️</div>
            <h2 className="text-2xl font-bold text-stone-800 mb-4">No Enemies to Fight</h2>
            <p className="text-stone-600 mb-6">
              There are no enemies present in this area. Combat cannot begin.
            </p>
            <button 
              onClick={async () => {
                // Resume the story from where it was paused
                await updateCampaignStory(partyId, {
                  status: 'storytelling',
                  currentCombat: null
                });
                
                // Navigate back to story
                try {
                  console.log('Returning to story from no enemies, partyId:', partyId);
                  navigate(`/campaign-story/${partyId}`);
                } catch (error) {
                  console.error('Navigation error in return to story:', error);
                  navigate('/dashboard');
                }
              }}
              className="fantasy-button"
            >
              Return to Story
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCombatant = getCurrentCombatant();

  // Player Death Screen
  if (playerDied && deadPlayer) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card bg-red-50 border-red-200">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">💀</div>
            <h1 className="text-3xl font-bold text-red-800 mb-4">Character Death</h1>
            <div className="text-xl text-red-700 mb-6">
              {deadPlayer.name} has fallen in battle...
            </div>
            <div className="bg-white p-6 rounded-lg border border-red-300 mb-6">
              <h2 className="text-lg font-semibold text-stone-800 mb-2">Fallen Hero</h2>
              <p className="text-stone-600 mb-2">
                <strong>Name:</strong> {deadPlayer.name}
              </p>
              <p className="text-stone-600 mb-2">
                <strong>Class:</strong> {deadPlayer.class}
              </p>
              <p className="text-stone-600 mb-2">
                <strong>Level:</strong> {deadPlayer.level}
              </p>
              <p className="text-stone-600">
                <strong>Final HP:</strong> {deadPlayer.hp}/{deadPlayer.maxHp}
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-stone-600">
                Your character has been defeated. You must create a new character to continue.
              </p>
              <button
                onClick={handlePlayerDeath}
                className="fantasy-button bg-red-600 hover:bg-red-700"
              >
                Create New Character
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card">
        {/* Combat Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="fantasy-title mb-0">⚔️ Combat Arena</h1>
          <div className="flex space-x-2">
            {combatSession.combatState === 'preparation' && (
              <button onClick={startCombat} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg">
                Start Combat
              </button>
            )}
            {combatSession.combatState === 'active' && (
              <div className="flex space-x-2">
                <button onClick={previousTurn} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg">
                  ← Previous
                </button>
                <button onClick={nextTurn} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg">
                  Next →
                </button>
                <button onClick={endCombat} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg">
                  End Combat
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Story Context */}
        {combatSession.storyContext && (
          <div className="mb-6 p-4 bg-stone-50 border border-stone-200 rounded-lg">
            <h3 className="font-bold text-stone-800 mb-2">Story Context</h3>
            <p className="text-stone-700 italic">{combatSession.storyContext}</p>
            <button 
              onClick={async () => {
                await updateCampaignStory(partyId, {
                  status: 'storytelling',
                  currentCombat: null
                });
                try {
                  console.log('Returning to story from combat header, partyId:', partyId);
                  navigate(`/campaign-story/${partyId}`);
                } catch (error) {
                  console.error('Navigation error in return to story:', error);
                  navigate('/dashboard');
                }
              }}
              className="text-sm text-stone-600 hover:text-stone-800 mt-2"
            >
              ← Return to Story
            </button>
          </div>
        )}

        {/* Environmental Features */}
        {environmentalFeatures.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-2">🌍 Environmental Features</h3>
            <div className="flex flex-wrap gap-2">
              {environmentalFeatures.map((feature, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Initiative Order */}
        {combatSession.combatState === 'active' && (
          <div className="mb-6">
            <h3 className="font-bold text-stone-800 mb-3">🎯 Turn Order</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {combatSession.combatants.map((combatant, index) => (
                <div
                  key={combatant.id}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    index === combatSession.currentTurn
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-stone-800">
                        {combatant.name}
                        {index === combatSession.currentTurn && (
                          <span className="ml-2 text-amber-600">← Current Turn</span>
                        )}
                      </div>
                      <div className="text-sm text-stone-600">
                        HP: {combatant.hp}/{combatant.maxHp} | AC: {combatant.ac}
                      </div>
                      {combatant.statusEffects && combatant.statusEffects.length > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          {combatant.statusEffects.map(effect => effect.type).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-stone-500">
                      Initiative: {combatant.initiative}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Turn Actions */}
        {combatSession.combatState === 'active' && currentCombatant && (
          <div className="mb-6">
            <h3 className="font-bold text-stone-800 mb-3">
              🎲 {currentCombatant.name}'s Turn
            </h3>
            
            {isCurrentUserTurn() ? (
              <div className="space-y-4">
                {/* Available Actions */}
                <div>
                  <h4 className="font-semibold text-stone-700 mb-2">Available Actions:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedAction(action)}
                        className={`p-3 rounded-lg border-2 transition-colors text-left ${
                          selectedAction?.type === action.type
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className="font-medium text-stone-800">{action.name}</div>
                        <div className="text-sm text-stone-600">{action.description}</div>
                        <div className="text-xs text-stone-500 mt-1">
                          Priority: {action.priority}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Selection */}
                {selectedAction && (
                  <div>
                    <h4 className="font-semibold text-stone-700 mb-2">Select Target:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {combatSession.enemies.map(enemy => (
                        <button
                          key={enemy.id}
                          onClick={() => setSelectedTarget(enemy)}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            selectedTarget?.id === enemy.id
                              ? 'border-red-500 bg-red-50'
                              : 'border-stone-200 bg-white hover:border-stone-300'
                          }`}
                        >
                          <div className="font-medium text-stone-800">{enemy.name}</div>
                          <div className="text-sm text-stone-600">
                            HP: {enemy.hp}/{enemy.maxHp} | AC: {enemy.ac}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Execute Action */}
                {selectedAction && selectedTarget && (
                  <div className="text-center">
                    <button
                      onClick={() => executeAction(selectedAction.type, selectedTarget.id)}
                      disabled={processingTurn}
                      className="fantasy-button bg-amber-600 hover:bg-amber-700"
                    >
                      {processingTurn ? 'Executing...' : `Execute ${selectedAction.name}`}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-blue-800 mb-2">
                  Waiting for {currentCombatant.name} to act
                </h4>
                <p className="text-blue-700">
                  {currentCombatant.userId === user?.uid 
                    ? 'It\'s your turn! Please select an action.'
                    : 'Please wait for the current player to make their move.'
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Results */}
        {actionMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-bold text-green-800 mb-2">Action Result</h4>
            <p className="text-green-700">{actionMessage}</p>
            {narrativeDescription && (
              <div className="mt-2 p-3 bg-white border border-green-300 rounded">
                <p className="text-stone-700 italic">{narrativeDescription}</p>
              </div>
            )}
          </div>
        )}

        {/* Enemy Turn Animation */}
        {isEnemyTurn && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-pulse">
            <h4 className="font-bold text-red-800 mb-2">🦹 Enemy Turn</h4>
            {enemyTurnMessage && (
              <div className="text-red-700 font-medium mb-2">
                {enemyTurnMessage}
              </div>
            )}
            {enemyTurnNarrative && (
              <div className="mt-2 p-3 bg-white border border-red-300 rounded">
                <p className="text-stone-700 italic">{enemyTurnNarrative}</p>
              </div>
            )}
            <div className="mt-3 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
              <span className="ml-2 text-red-600 text-sm">Enemy is acting...</span>
            </div>
          </div>
        )}

        {/* Processing Turn Indicator */}
        {processingTurn && !isEnemyTurn && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
              <span className="ml-2 text-amber-600 font-medium">Processing turn...</span>
            </div>
          </div>
        )}

        {/* Team Up Opportunities */}
        {teamUpOpportunities.length > 0 && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-bold text-purple-800 mb-2">🤝 Team Up Opportunities</h3>
            <div className="space-y-2">
              {teamUpOpportunities.map((opportunity, index) => (
                <div key={index} className="text-purple-700">
                  <strong>{opportunity.classes.join(' + ')}:</strong> {opportunity.description}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Action Input */}
        {showCustomActionInput && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <h3 className="font-bold text-indigo-800 mb-2">🎭 Custom Action</h3>
            <p className="text-indigo-700 mb-3">
              Describe the action you want to perform. The system will validate it and determine if it's possible.
            </p>
            <div className="space-y-3">
              <textarea
                value={customActionInput}
                onChange={(e) => setCustomActionInput(e.target.value)}
                placeholder="e.g., I attempt to backflip over the enemy and strike from behind..."
                className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows="3"
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleCustomActionSubmit}
                  className="fantasy-button bg-indigo-600 hover:bg-indigo-700"
                >
                  Validate Action
                </button>
                <button
                  onClick={() => setShowCustomActionInput(false)}
                  className="fantasy-button bg-stone-600 hover:bg-stone-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dice Rolling Tools */}
        {isCurrentUserTurn() && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-bold text-amber-800 mb-2">🎲 Dice Tools</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  const result = rollWithAdvantage();
                  setCurrentDiceResult(result);
                  setShowDiceRoll(true);
                }}
                className="p-2 bg-green-100 hover:bg-green-200 border border-green-300 rounded text-sm font-medium"
              >
                Roll with Advantage
              </button>
              <button
                onClick={() => {
                  const result = rollWithDisadvantage();
                  setCurrentDiceResult(result);
                  setShowDiceRoll(true);
                }}
                className="p-2 bg-red-100 hover:bg-red-200 border border-red-300 rounded text-sm font-medium"
              >
                Roll with Disadvantage
              </button>
              <button
                onClick={() => {
                  const result = rollDie(20);
                  setCurrentDiceResult({ roll: result, totalRoll: result, actionType: 'd20' });
                  setShowDiceRoll(true);
                }}
                className="p-2 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded text-sm font-medium"
              >
                Roll d20
              </button>
              <button
                onClick={() => {
                  const result = rollDice(2, 6);
                  const total = result.reduce((sum, roll) => sum + roll, 0);
                  setCurrentDiceResult({ rolls: result, totalRoll: total, actionType: '2d6' });
                  setShowDiceRoll(true);
                }}
                className="p-2 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded text-sm font-medium"
              >
                Roll 2d6
              </button>
            </div>
            
            {/* Quick Skill Checks */}
            <div className="mt-3">
              <h4 className="font-semibold text-amber-700 mb-2">Quick Skill Checks:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['attack', 'dodge', 'climb', 'jump', 'persuade', 'intimidate'].map(skill => (
                  <button
                    key={skill}
                    onClick={() => {
                      const result = performSkillCheck(skill);
                      if (result) {
                        setCurrentDiceResult(result);
                        setShowDiceRoll(true);
                      }
                    }}
                    className="p-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded text-xs font-medium capitalize"
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Custom Action Button */}
        {isCurrentUserTurn() && (
          <div className="mb-6 text-center">
            <button
              onClick={() => setShowCustomActionInput(true)}
              className="fantasy-button bg-indigo-600 hover:bg-indigo-700"
            >
              🎭 Describe Custom Action
            </button>
          </div>
        )}
      </div>

      {/* Dice Roll Display Modal */}
      {showDiceRoll && (
        <DiceRollDisplay
          diceResult={currentDiceResult}
          onClose={handleDiceRollClose}
        />
      )}

      {/* Action Validation Display Modal */}
      {showActionValidation && (
        <ActionValidationDisplay
          validation={currentValidation}
          onClose={handleActionValidationClose}
          onProceed={handleActionProceed}
          onRevise={handleActionRevise}
        />
      )}
    </div>
  );
} 