import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useParty } from '../contexts/PartyContext';
import { useMap } from '../contexts/MapContext';
import LobbyHeader from '../components/lobby/LobbyHeader';
import PartyMemberCard from '../components/lobby/PartyMemberCard';
import CampaignMapDisplay from '../components/lobby/CampaignMapDisplay';
import CharacterSheetModal from '../components/lobby/CharacterSheetModal';
import AllCharacterSheetsModal from '../components/lobby/AllCharacterSheetsModal';
import MapEditorModal from '../components/lobby/MapEditorModal';
import SubMapEditorModal from '../components/lobby/SubMapEditorModal';

export default function CampaignLobby() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    party, 
    partyCharacters, 
    partyMemberProfiles, 
    userCharacter, 
    isDM, 
    loading: partyLoading,
    nonDMMembers,
    getUsername,
    getCharacterStatus,
    getStatusColor,
    getStatusIcon
  } = useParty();
  const {
    showMapEditor,
    campaignMap,
    mapTitle,
    mapSize,
    selectedTile,
    selectedTool,
    showSubMapEditor,
    selectedSubMapTile,
    subMaps,
    currentSubMap,
    tileTypes,
    setShowMapEditor,
    setShowSubMapEditor,
    setMapTitle,
    setMapSize,
    setSelectedTile,
    setSelectedTool,
    setCurrentSubMap,
    handleTileRightClick,
    handleSubMapTileClick,
    handleSubMapTileMouseDown,
    handleSubMapTileMouseEnter,
    handleTileMouseUp,
    handleSaveSubMap,
    handleClearSubMap,
    getTileHasSubMap
  } = useMap();

  // Local state for modals
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [showAllCharacterSheets, setShowAllCharacterSheets] = useState(false);

  // Memoized event handlers to prevent unnecessary re-renders
  const handleStartCampaign = useCallback(() => {
    if (party.campaignType === 'manual') {
      if (party.dmId === user.uid) {
        navigate(`/manual-campaign-dm/${party.id}`);
      } else {
        navigate(`/manual-campaign/${party.id}`);
      }
    } else {
      navigate(`/campaign/${party.id}`);
    }
  }, [party, user?.uid, navigate]);

  const handleCreateCharacter = useCallback(() => {
    navigate(`/character-creation/${party.id}`);
  }, [party?.id, navigate]);

  const handleViewCharacterSheet = useCallback((character) => {
    setSelectedCharacter(character);
    setShowCharacterSheet(true);
  }, []);

  const handleEditMap = useCallback(() => {
    setShowMapEditor(true);
  }, [setShowMapEditor]);

  const handleViewCharacters = useCallback(() => {
    setShowAllCharacterSheets(true);
  }, []);

  const handleCloseCharacterSheet = useCallback(() => {
    setShowCharacterSheet(false);
  }, []);

  const handleCloseAllCharacterSheets = useCallback(() => {
    setShowAllCharacterSheets(false);
  }, []);

  // Memoized party member cards to prevent unnecessary re-renders
  const partyMemberCards = useMemo(() => {
    return nonDMMembers.map((memberId) => {
      const character = partyCharacters.find(char => char.userId === memberId);
      const isCurrentUser = memberId === user.uid;
    
      return (
        <PartyMemberCard
          key={memberId}
          memberId={memberId}
          character={character}
          isCurrentUser={isCurrentUser}
          getUsername={getUsername}
          getCharacterStatus={getCharacterStatus}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
          onViewCharacterSheet={handleViewCharacterSheet}
        />
      );
    });
  }, [nonDMMembers, partyCharacters, user?.uid, getUsername, getCharacterStatus, getStatusColor, getStatusIcon, handleViewCharacterSheet]);

  // Memoized campaign info data
  const campaignInfoData = useMemo(() => [
    {
      label: 'Campaign Type:',
      value: party.campaignType === 'ai-assist' ? 'AI-Assisted Storytelling' : 'Manual D&D Experience'
    },
    {
      label: 'Max Players:',
      value: party.maxPlayers
    },
    {
      label: 'Current Players:',
      value: partyCharacters.filter(char => char.userId !== party.dmId).length
    },
    {
      label: 'Dungeon Master:',
      value: getUsername(party.dmId)
    }
  ], [party, partyCharacters, getUsername]);

  // Show loading state
  if (authLoading || partyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg font-medium">Loading campaign lobby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="fantasy-container">
        {/* Header */}
        <LobbyHeader party={party} />

        {/* Party Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {partyMemberCards}
        </div>

        {/* Campaign Map Display */}
        <CampaignMapDisplay
          campaignMap={campaignMap}
          mapTitle={mapTitle}
          isDM={isDM}
          tileTypes={tileTypes}
          getTileHasSubMap={getTileHasSubMap}
          handleTileRightClick={handleTileRightClick}
          onEditMap={handleEditMap}
          onViewCharacters={handleViewCharacters}
        />

        {/* Campaign Info */}
        <div className="mt-8 fantasy-card">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Campaign Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {campaignInfoData.map((info, index) => (
              <div key={index}>
                <span className="text-slate-400">{info.label}</span>
                <span className="text-slate-200 ml-2">{info.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          {!userCharacter && (
            <button
              onClick={handleCreateCharacter}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 text-lg"
            >
              🎭 Create Character
            </button>
          )}
          {userCharacter && (
            <button
              onClick={handleStartCampaign}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 text-lg"
            >
              🚀 Start Campaign
            </button>
          )}
        </div>

        {/* Modals */}
        <CharacterSheetModal
          character={selectedCharacter}
          onClose={handleCloseCharacterSheet}
        />

        <AllCharacterSheetsModal
          partyCharacters={partyCharacters}
          getUsername={getUsername}
          onClose={handleCloseAllCharacterSheets}
        />

        <MapEditorModal
          show={showMapEditor}
          mapTitle={mapTitle}
          setMapTitle={setMapTitle}
          mapSize={mapSize}
          setMapSize={setMapSize}
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          selectedTile={selectedTile}
          setSelectedTile={setSelectedTile}
          tileTypes={tileTypes}
          campaignMap={campaignMap}
          handleTileMouseDown={handleTileMouseDown}
          handleTileMouseEnter={handleTileMouseEnter}
          handleTileMouseUp={handleTileMouseUp}
          handleTileRightClick={handleTileRightClick}
          getTileHasSubMap={getTileHasSubMap}
          handleClearMap={handleClearMap}
          handleSaveMap={handleSaveMap}
          handleResizeMap={handleResizeMap}
          onClose={() => setShowMapEditor(false)}
        />

        <SubMapEditorModal
          show={showSubMapEditor}
          selectedSubMapTile={selectedSubMapTile}
          currentSubMap={currentSubMap}
          setCurrentSubMap={setCurrentSubMap}
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          selectedTile={selectedTile}
          setSelectedTile={setSelectedTile}
          tileTypes={tileTypes}
          handleSubMapTileMouseDown={handleSubMapTileMouseDown}
          handleSubMapTileMouseEnter={handleSubMapTileMouseEnter}
          handleTileMouseUp={handleTileMouseUp}
          handleSaveSubMap={handleSaveSubMap}
          handleClearSubMap={handleClearSubMap}
          onClose={() => setShowSubMapEditor(false)}
        />
      </div>
    </div>
  );
} 