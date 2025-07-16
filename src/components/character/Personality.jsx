import React from 'react';

export default function Personality({ character, onInputChange }) {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-100 mb-4">Personality</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="character-personality" className="block text-sm font-medium text-gray-200 mb-2">
            Personality Traits
          </label>
          <textarea
            id="character-personality"
            name="character-personality"
            value={character.personality}
            onChange={(e) => onInputChange('personality', e.target.value)}
            className="fantasy-input"
            rows="3"
            placeholder="Describe your character's personality..."
            required
          />
        </div>
        <div>
          <label htmlFor="character-ideals" className="block text-sm font-medium text-gray-200 mb-2">
            Ideals
          </label>
          <textarea
            id="character-ideals"
            name="character-ideals"
            value={character.ideals}
            onChange={(e) => onInputChange('ideals', e.target.value)}
            className="fantasy-input"
            rows="3"
            placeholder="What does your character believe in?"
            required
          />
        </div>
        <div>
          <label htmlFor="character-bonds" className="block text-sm font-medium text-gray-200 mb-2">
            Bonds
          </label>
          <textarea
            id="character-bonds"
            name="character-bonds"
            value={character.bonds}
            onChange={(e) => onInputChange('bonds', e.target.value)}
            className="fantasy-input"
            rows="3"
            placeholder="What connections does your character have?"
            required
          />
        </div>
        <div>
          <label htmlFor="character-flaws" className="block text-sm font-medium text-gray-200 mb-2">
            Flaws
          </label>
          <textarea
            id="character-flaws"
            name="character-flaws"
            value={character.flaws}
            onChange={(e) => onInputChange('flaws', e.target.value)}
            className="fantasy-input"
            rows="3"
            placeholder="What are your character's weaknesses?"
            required
          />
        </div>
      </div>

      {/* Backstory */}
      <div className="mt-6 sm:mt-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-100 mb-4">Backstory</h2>
        <textarea
          id="character-backstory"
          name="character-backstory"
          value={character.backstory}
          onChange={(e) => onInputChange('backstory', e.target.value)}
          className="fantasy-input"
          rows="5"
          placeholder="Tell the story of your character's life before the adventure..."
          required
        />
      </div>
    </div>
  );
} 