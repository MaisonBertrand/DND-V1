import React from 'react';
import { races, classes, backgrounds, alignments } from '../../data/characterData';

export default function BasicInfo({ character, onInputChange }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="character-name" className="block text-sm font-medium text-amber-200 mb-2">
            Character Name *
          </label>
          <input
            id="character-name"
            name="character-name"
            type="text"
            value={character.name}
            onChange={(e) => onInputChange('name', e.target.value)}
            className="fantasy-input"
            placeholder="Enter character name"
            required
          />
        </div>
        
        <div>
          <label htmlFor="character-race" className="block text-sm font-medium text-amber-200 mb-2">
            Race *
          </label>
          <select
            id="character-race"
            name="character-race"
            value={character.race}
            onChange={(e) => onInputChange('race', e.target.value)}
            className="fantasy-input"
            required
          >
            <option value="">Select Race</option>
            {races.map(race => (
              <option key={race} value={race}>{race}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="character-class" className="block text-sm font-medium text-amber-200 mb-2">
            Class *
          </label>
          <select
            id="character-class"
            name="character-class"
            value={character.class}
            onChange={(e) => onInputChange('class', e.target.value)}
            className="fantasy-input"
            required
          >
            <option value="">Select Class</option>
            {classes.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="character-background" className="block text-sm font-medium text-amber-200 mb-2">
            Background
          </label>
          <select
            id="character-background"
            name="character-background"
            value={character.background}
            onChange={(e) => onInputChange('background', e.target.value)}
            className="fantasy-input"
          >
            <option value="">Select Background</option>
            {backgrounds.map(bg => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="character-alignment" className="block text-sm font-medium text-amber-200 mb-2">
            Alignment
          </label>
          <select
            id="character-alignment"
            name="character-alignment"
            value={character.alignment}
            onChange={(e) => onInputChange('alignment', e.target.value)}
            className="fantasy-input"
          >
            <option value="">Select Alignment</option>
            {alignments.map(align => (
              <option key={align} value={align}>{align}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Character Preview Card */}
      {(character.name || character.race || character.class) && (
        <div className="mt-8 p-6 bg-gray-700 border border-gray-600 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-100 mb-4">Character Preview</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-amber-300 font-medium">Name</p>
              <p className="text-gray-300">{character.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-amber-300 font-medium">Race & Class</p>
              <p className="text-gray-300">
                {character.race || 'Not set'} {character.class ? `• ${character.class}` : ''}
              </p>
            </div>
            <div>
              <p className="text-amber-300 font-medium">Level</p>
              <p className="text-gray-300">1</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 