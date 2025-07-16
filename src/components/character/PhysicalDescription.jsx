import React from 'react';

export default function PhysicalDescription({ character, onInputChange }) {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-100 mb-4">Physical Description</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="character-age" className="block text-sm font-medium text-gray-200 mb-2">
            Age
          </label>
          <input
            id="character-age"
            name="character-age"
            type="text"
            placeholder="Age"
            value={character.age}
            onChange={(e) => onInputChange('age', e.target.value)}
            className="fantasy-input"
            required
          />
        </div>
        <div>
          <label htmlFor="character-height" className="block text-sm font-medium text-gray-200 mb-2">
            Height
          </label>
          <input
            id="character-height"
            name="character-height"
            type="text"
            placeholder="Height"
            value={character.height}
            onChange={(e) => onInputChange('height', e.target.value)}
            className="fantasy-input"
            required
          />
        </div>
        <div>
          <label htmlFor="character-weight" className="block text-sm font-medium text-gray-200 mb-2">
            Weight
          </label>
          <input
            id="character-weight"
            name="character-weight"
            type="text"
            placeholder="Weight"
            value={character.weight}
            onChange={(e) => onInputChange('weight', e.target.value)}
            className="fantasy-input"
            required
          />
        </div>
        <div>
          <label htmlFor="character-eyes" className="block text-sm font-medium text-gray-200 mb-2">
            Eye Color
          </label>
          <input
            id="character-eyes"
            name="character-eyes"
            type="text"
            placeholder="Eye Color"
            value={character.eyes}
            onChange={(e) => onInputChange('eyes', e.target.value)}
            className="fantasy-input"
            required
          />
        </div>
        <div>
          <label htmlFor="character-skin" className="block text-sm font-medium text-gray-200 mb-2">
            Skin Color
          </label>
          <input
            id="character-skin"
            name="character-skin"
            type="text"
            placeholder="Skin Color"
            value={character.skin}
            onChange={(e) => onInputChange('skin', e.target.value)}
            className="fantasy-input"
            required
          />
        </div>
        <div>
          <label htmlFor="character-hair" className="block text-sm font-medium text-gray-200 mb-2">
            Hair Color
          </label>
          <input
            id="character-hair"
            name="character-hair"
            type="text"
            placeholder="Hair Color"
            value={character.hair}
            onChange={(e) => onInputChange('hair', e.target.value)}
            className="fantasy-input"
            required
          />
        </div>
      </div>
    </div>
  );
} 