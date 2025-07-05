import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function CampaignDefeat({ story, deadCharacters, combatSummary }) {
  const navigate = useNavigate();

  const handleStartNewCampaign = () => {
    navigate('/dashboard');
  };

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card bg-red-900/20 border-red-700">
        <div className="text-center py-8">
          <div className="text-8xl mb-6">💀</div>
          <h1 className="text-4xl font-bold text-red-300 mb-4">Campaign Defeat</h1>
          <div className="text-xl text-red-200 mb-8">
            The party has fallen... The story ends here.
          </div>
          
          {/* Story Summary */}
          <div className="bg-gray-800 p-6 rounded-lg border border-red-600 mb-6 text-left">
            <h2 className="text-2xl font-semibold text-gray-100 mb-4">The Complete Story</h2>
            <div className="space-y-4 text-gray-300">
              {story?.storyMessages?.map((message, index) => (
                <div key={index} className="border-l-2 border-gray-600 pl-4">
                  <p className="font-semibold text-gray-200">{message.sender}:</p>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fallen Heroes */}
          <div className="bg-gray-800 p-6 rounded-lg border border-red-600 mb-6">
            <h2 className="text-2xl font-semibold text-gray-100 mb-4">Fallen Heroes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deadCharacters?.map((character, index) => (
                <div key={index} className="bg-red-900/30 p-4 rounded border border-red-600">
                  <h3 className="text-lg font-semibold text-red-200 mb-2">{character.name}</h3>
                  <p className="text-gray-300 mb-1">
                    <strong>Class:</strong> {character.class}
                  </p>
                  <p className="text-gray-300 mb-1">
                    <strong>Level:</strong> {character.level}
                  </p>
                  <p className="text-gray-300 mb-1">
                    <strong>Final HP:</strong> {character.hp}/{character.maxHp}
                  </p>
                  <p className="text-gray-300">
                    <strong>Cause of Death:</strong> {character.deathCause || 'Combat wounds'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Combat Summary */}
          {combatSummary && (
            <div className="bg-gray-800 p-6 rounded-lg border border-red-600 mb-6">
              <h2 className="text-2xl font-semibold text-gray-100 mb-4">Final Battle</h2>
              <div className="text-gray-300 space-y-2">
                <p><strong>Duration:</strong> {combatSummary.duration} rounds</p>
                <p><strong>Result:</strong> {combatSummary.result}</p>
                {combatSummary.narrative && (
                  <p className="italic">{combatSummary.narrative}</p>
                )}
              </div>
            </div>
          )}

          {/* New Campaign Button */}
          <div className="space-y-4">
            <p className="text-gray-300">
              The adventure has ended, but new stories await...
            </p>
            <button
              onClick={handleStartNewCampaign}
              className="fantasy-button bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 text-lg"
            >
              Begin a New Adventure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 