import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import useCampaignStory from '../hooks/useCampaignStory';
import ActionValidationDisplay from './ActionValidationDisplay';
import DiceRollDisplay from './DiceRollDisplay';
import ReadyUpPhase from './campaign/ReadyUpPhase';
import VotingPhase from './campaign/VotingPhase';
import StorytellingPhase from './campaign/StorytellingPhase';
import LoadingPhases from './campaign/LoadingPhases';
import DebugPanel from './campaign/DebugPanel';

export default function CampaignStory() {
  const { user, loading: authLoading } = useAuth();
  const { partyId } = useParams();
  const navigate = useNavigate();
  
  // Use custom hook for all campaign story logic
  const {
    // State
    story,
    party,
    partyMembers,
    partyCharacters,
    loading,
    error,
    playerResponse,
    currentPhase,
    objectives,
    inlineValidation,
    showActionValidation,
    actionValidation,
    showDiceRoll,
    diceResult,
    isReady,
    allPlayersReady,
    isGeneratingPlots,
    showDebug,
    deadPlayers,
    showDeathRecap,
    combatLoading,
    hasNavigatedToCombat,
    
    // Setters
    setPlayerResponse,
    setShowDebug,
    setShowDeathRecap,
    setError,
    
    // Functions
    getReadyCount,
    getTotalPlayers,
    getSortedCharacters,
    highlightKeywords,
    loadStoryAndCharacters,
    handleReadyUp,
    handleStartStory,
    handlePlotSelection,
    handleSendResponse,
    handleSetSpeaker,
    handleActionValidationClose,
    handleActionProceed,
    handleActionRevise,
    handleManualCombatTrigger,
    handleResetCombatState
  } = useCampaignStory(partyId, user, navigate);

  // Check authentication and redirect if needed
  React.useEffect(() => {
    if (!user && !authLoading) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Redirect manual campaigns to the appropriate page
  React.useEffect(() => {
    console.log('CampaignStory: Checking redirect conditions', {
      storyStatus: story?.status,
      campaignType: party?.campaignType,
      partyId
    });
    if (story?.status === 'active' && party?.campaignType === 'manual') {
      console.log('CampaignStory: Redirecting to manual campaign page');
      navigate(`/manual-campaign/${partyId}`);
    }
  }, [story?.status, party?.campaignType, partyId, navigate]);

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-400 mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg">Loading campaign...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-200 mb-4">Error Loading Campaign</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-100 mb-2">
            {party?.name || 'Campaign Story'}
          </h1>
          <p className="text-slate-300 text-lg">
            {party?.description || 'An epic adventure awaits!'}
          </p>
        </div>

        {/* Ready Up Phase - Only for AI-assisted campaigns */}
        {story?.status === 'ready_up' && party?.campaignType !== 'manual' && (
          <ReadyUpPhase
            story={story}
            party={party}
            user={user}
            partyCharacters={partyCharacters}
            partyMembers={partyMembers}
            isReady={isReady}
            allPlayersReady={allPlayersReady}
            loading={loading}
            isGeneratingPlots={isGeneratingPlots}
            onReadyUp={handleReadyUp}
            onStartStory={handleStartStory}
            navigate={navigate}
            partyId={partyId}
          />
        )}

        {/* Manual Campaign Active Status - Redirect to manual campaign page */}
        {story?.status === 'active' && party?.campaignType === 'manual' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-400 border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-300 text-lg">Redirecting to manual campaign...</p>
          </div>
        )}

        {/* Loading Phases */}
        <LoadingPhases story={story} />

        {/* Voting Phase */}
        {story?.status === 'voting' && (
          <VotingPhase
            story={story}
            party={party}
            user={user}
            loading={loading}
            showDebug={showDebug}
            setShowDebug={setShowDebug}
            onPlotSelection={handlePlotSelection}
            onStartStory={handleStartStory}
          />
        )}

        {/* Main Story Content */}
        {story?.status === 'storytelling' && (
          <StorytellingPhase
            story={story}
            party={party}
            user={user}
            partyCharacters={partyCharacters}
            showDebug={showDebug}
            setShowDebug={setShowDebug}
            playerResponse={playerResponse}
            setPlayerResponse={setPlayerResponse}
            loading={loading}
            onSendResponse={handleSendResponse}
            onSetSpeaker={handleSetSpeaker}
            highlightKeywords={highlightKeywords}
          />
        )}

        {/* Death Recap */}
        {showDeathRecap && deadPlayers.length > 0 && (
          <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-600 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <div className="text-red-400 text-xl">💀</div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-200 mb-2">Combat Aftermath</h3>
                <p className="text-red-100 text-sm mb-3">
                  The battle has ended. Some heroes have fallen, but the story continues...
                </p>
                <div className="bg-red-800/30 border border-red-600 rounded p-3 mb-3">
                  <h4 className="text-red-200 font-semibold mb-2">Fallen Heroes:</h4>
                  <div className="space-y-2">
                    {deadPlayers.map((player, index) => (
                      <div key={index} className="text-red-200 text-sm">
                        <strong>{player.name}</strong> ({player.class}, Level {player.level}) - {player.deathCause}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-red-100 text-xs">
                  The fallen heroes will need to create new characters to rejoin the adventure.
                </p>
              </div>
              <button
                onClick={() => setShowDeathRecap(false)}
                className="text-red-400 hover:text-red-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-600 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="text-red-400 text-xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-200 mb-2">Notice</h3>
                <p className="text-red-100 text-sm mb-3">{error}</p>
                {error.includes('AI service') && (
                  <div className="bg-red-800/30 border border-red-600 rounded p-3">
                    <p className="text-red-200 text-xs mb-2">
                      <strong>What this means:</strong> The AI storytelling service is temporarily unavailable.
                    </p>
                    <p className="text-red-200 text-xs mb-2">
                      <strong>You can still:</strong>
                    </p>
                    <ul className="text-red-200 text-xs list-disc list-inside space-y-1">
                      <li>Continue the story manually by typing your responses</li>
                      <li>Use the predefined plot options if available</li>
                      <li>Wait a few minutes and try again</li>
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Debug Panel */}
        <DebugPanel
          showDebug={showDebug}
          story={story}
          user={user}
          party={party}
          partyMembers={partyMembers}
          isReady={isReady}
          allPlayersReady={allPlayersReady}
          combatLoading={combatLoading}
          hasNavigatedToCombat={hasNavigatedToCombat}
          onManualCombatTrigger={handleManualCombatTrigger}
          onResetCombatState={handleResetCombatState}
        />

        {/* Modals */}
        {showActionValidation && (
          <ActionValidationDisplay
            validation={actionValidation}
            onClose={handleActionValidationClose}
            onProceed={handleActionProceed}
            onRevise={handleActionRevise}
          />
        )}

        {showDiceRoll && (
          <DiceRollDisplay
            result={diceResult}
            onClose={() => setShowDiceRoll(false)}
          />
        )}
      </div>
    </div>
  );
} 