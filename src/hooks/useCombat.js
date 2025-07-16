import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { 
  getCombatSession, 
  updateCombatSession, 
  updateCombatSessionWithNarrative,
  addToCombatBattleLog,
  subscribeToCombatSession,
  updateCampaignStory,
  getPartyCharacters,
  updatePartyCharacterStats,
  getCampaignStory
} from '../firebase/database';
import { combatService } from '../services/combat';

export function useCombat() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State
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
  const [campaignDefeated, setCampaignDefeated] = useState(false);
  const [deadCharacters, setDeadCharacters] = useState([]);
  const [combatSummary, setCombatSummary] = useState(null);
  const [story, setStory] = useState(null);
  const [spectating, setSpectating] = useState(false);
  const [lastProcessedTurn, setLastProcessedTurn] = useState(-1);
  const [damageAnimation, setDamageAnimation] = useState(null);
  const [showDamageAnimation, setShowDamageAnimation] = useState(false);
  const [enemyTurnComplete, setEnemyTurnComplete] = useState(false);
  const [partyMembersReady, setPartyMembersReady] = useState(new Set());
  const [battleLog, setBattleLog] = useState([]);
  const [combatReady, setCombatReady] = useState(false);
  
  // Ref to track if subscription is already set up
  const subscriptionRef = useRef(null);
  
  // Check if this is a test combat session
  const isTestCombat = location.state?.isTestCombat;
  const testData = location.state;

  // Memoized computed values
  const currentCombatant = useMemo(() => {
    if (!combatSession?.initiativeOrder || combatSession.currentTurn === undefined) return null;
    return combatSession.initiativeOrder[combatSession.currentTurn];
  }, [combatSession?.initiativeOrder, combatSession?.currentTurn]);

  const isPlayerTurn = useMemo(() => {
    return currentCombatant?.type === 'player';
  }, [currentCombatant]);

  const playerCharacters = useMemo(() => {
    return partyCharacters.filter(char => char.hp > 0);
  }, [partyCharacters]);

  const enemyCharacters = useMemo(() => {
    return combatSession?.enemies?.filter(enemy => enemy.hp > 0) || [];
  }, [combatSession?.enemies]);

  const allCombatants = useMemo(() => {
    return [...playerCharacters, ...enemyCharacters];
  }, [playerCharacters, enemyCharacters]);

  // Auth effect
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

  // Initialize combat data
  useEffect(() => {
    if (isTestCombat && testData) {
      initializeTestCombat();
    } else if (sessionId) {
      const refreshCombatData = async () => {
        await loadCombatData();
      };
      refreshCombatData();
    }
  }, [isTestCombat, testData, sessionId]);

  // Subscribe to combat session updates
  useEffect(() => {
    if (sessionId && !isTestCombat) {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
      
      const unsubscribe = subscribeToCombatSession(sessionId, (session) => {
        setCombatSession(session);
        setLoading(false);
        
        if (session?.currentTurn !== undefined) {
          if (lastProcessedTurn !== session.currentTurn && !processingTurn) {
            setLastProcessedTurn(session.currentTurn);
          } else if (processingTurn && lastProcessedTurn === session.currentTurn) {
            setLastProcessedTurn(session.currentTurn);
          }
        }
        
        if (session) {
          if (session.battleLog && session.battleLog.length > 0) {
            setBattleLog(session.battleLog);
          }
          
          updateAvailableActions(session);
          setEnvironmentalFeatures(session.environmentalFeatures || []);
          setTeamUpOpportunities(session.teamUpOpportunities || []);
          
          checkPlayerDeath();
        }
      });
      
      subscriptionRef.current = unsubscribe;
      
      return () => {
        if (subscriptionRef.current) {
          subscriptionRef.current();
          subscriptionRef.current = null;
        }
      };
    }
  }, [sessionId, isTestCombat]);

  // Memoized functions
  const loadCombatData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [session, characters, storyData] = await Promise.all([
        getCombatSession(sessionId),
        getPartyCharacters(combatSession?.partyId),
        getCampaignStory(combatSession?.partyId)
      ]);
      
      setCombatSession(session);
      setPartyCharacters(characters);
      setStory(storyData);
      
      if (session) {
        updateAvailableActions(session);
        setEnvironmentalFeatures(session.environmentalFeatures || []);
        setTeamUpOpportunities(session.teamUpOpportunities || []);
      }
    } catch (error) {
      console.error('Error loading combat data:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, combatSession?.partyId]);

  const updateAvailableActions = useCallback((session) => {
    if (!session || !currentCombatant) return;
    
    const actions = combatService.getAvailableActions(session, currentCombatant);
    setAvailableActions(actions);
  }, [currentCombatant]);

  const checkPlayerDeath = useCallback(() => {
    const deadPlayers = playerCharacters.filter(char => char.hp <= 0);
    if (deadPlayers.length > 0) {
      setPlayerDied(true);
      setDeadPlayer(deadPlayers[0]);
      setDeadCharacters(deadPlayers);
      
      if (deadPlayers.length === playerCharacters.length) {
        setCampaignDefeated(true);
      }
    }
  }, [playerCharacters]);

  const handleActionSelect = useCallback((action) => {
    setSelectedAction(action);
    setSelectedTarget(null);
    setActionMessage('');
  }, []);

  const handleTargetSelect = useCallback((target) => {
    setSelectedTarget(target);
  }, []);

  const handleActionSubmit = useCallback(async () => {
    if (!selectedAction || !selectedTarget || !combatSession) return;
    
    try {
      setProcessingTurn(true);
      
      const result = await combatService.processAction(
        combatSession,
        selectedAction,
        selectedTarget,
        currentCombatant
      );
      
      await updateCombatSessionWithNarrative(sessionId, result);
      
      setSelectedAction(null);
      setSelectedTarget(null);
      setActionMessage('');
      setNarrativeDescription('');
      
    } catch (error) {
      console.error('Error processing action:', error);
      setActionMessage('Error processing action');
    } finally {
      setProcessingTurn(false);
    }
  }, [selectedAction, selectedTarget, combatSession, currentCombatant, sessionId]);

  const handleEndTurn = useCallback(async () => {
    if (!combatSession) return;
    
    try {
      setProcessingTurn(true);
      
      const nextTurn = (combatSession.currentTurn + 1) % combatSession.initiativeOrder.length;
      const nextCombatant = combatSession.initiativeOrder[nextTurn];
      
      await updateCombatSession(sessionId, {
        currentTurn: nextTurn,
        round: nextTurn === 0 ? combatSession.round + 1 : combatSession.round
      });
      
      if (nextCombatant.type === 'enemy') {
        await processEnemyTurn(nextCombatant);
      }
      
    } catch (error) {
      console.error('Error ending turn:', error);
    } finally {
      setProcessingTurn(false);
    }
  }, [combatSession, sessionId]);

  const processEnemyTurn = useCallback(async (enemy) => {
    setIsEnemyTurn(true);
    
    try {
      const result = await combatService.processEnemyTurn(combatSession, enemy);
      
      await updateCombatSessionWithNarrative(sessionId, result);
      
      setEnemyTurnMessage(result.message);
      setEnemyTurnNarrative(result.narrative);
      
    } catch (error) {
      console.error('Error processing enemy turn:', error);
    } finally {
      setIsEnemyTurn(false);
      setEnemyTurnComplete(true);
    }
  }, [combatSession, sessionId]);

  const initializeTestCombat = useCallback(() => {
    if (!testData) return;
    
    setCombatSession(testData.combatSession);
    setPartyCharacters(testData.partyCharacters);
    setStory(testData.story);
    setLoading(false);
  }, [testData]);

  return {
    // State
    user,
    combatSession,
    loading,
    partyCharacters,
    selectedAction,
    selectedTarget,
    actionMessage,
    narrativeDescription,
    availableActions,
    environmentalFeatures,
    teamUpOpportunities,
    isEnemyTurn,
    enemyTurnMessage,
    enemyTurnNarrative,
    processingTurn,
    playerDied,
    deadPlayer,
    campaignDefeated,
    deadCharacters,
    combatSummary,
    story,
    spectating,
    battleLog,
    combatReady,
    
    // Computed values
    currentCombatant,
    isPlayerTurn,
    playerCharacters,
    enemyCharacters,
    allCombatants,
    
    // Actions
    setSelectedAction,
    setSelectedTarget,
    setActionMessage,
    setNarrativeDescription,
    setCombatReady,
    
    // Functions
    handleActionSelect,
    handleTargetSelect,
    handleActionSubmit,
    handleEndTurn,
    loadCombatData
  };
} 