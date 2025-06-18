import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { saveCharacter } from '../firebase/database';

export default function CharacterCreation() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [character, setCharacter] = useState({
    // Basic Info
    name: '',
    race: '',
    class: '',
    level: 1,
    background: '',
    alignment: '',
    
    // Ability Scores
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    
    // Physical Description
    age: '',
    height: '',
    weight: '',
    eyes: '',
    skin: '',
    hair: '',
    
    // Character Details
    personality: '',
    ideals: '',
    bonds: '',
    flaws: '',
    backstory: '',
    
    // Equipment
    equipment: [],
    
    // Spells (for spellcasters)
    spells: [],
    
    // Proficiencies
    proficiencies: [],
    
    // Image placeholder
    portrait: '/placeholder-character.png'
  });

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

  const races = [
    'Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Tiefling', 
    'Half-Elf', 'Half-Orc', 'Gnome', 'Aarakocra', 'Genasi', 'Goliath'
  ];

  const classes = [
    'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
    'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
  ];

  const alignments = [
    'Lawful Good', 'Neutral Good', 'Chaotic Good',
    'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
    'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'
  ];

  const backgrounds = [
    'Acolyte', 'Criminal', 'Folk Hero', 'Noble', 'Sage', 'Soldier'
  ];

  const handleInputChange = (field, value) => {
    setCharacter(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('You must be logged in to create a character');
      return;
    }

    setLoading(true);
    try {
      await saveCharacter(user.uid, character);
      alert('Character created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating character:', error);
      alert('Error creating character. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card">
        <h1 className="fantasy-title text-center">Create Your Character</h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Character Name
              </label>
              <input
                type="text"
                value={character.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="fantasy-input"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Race
              </label>
              <select
                value={character.race}
                onChange={(e) => handleInputChange('race', e.target.value)}
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
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Class
              </label>
              <select
                value={character.class}
                onChange={(e) => handleInputChange('class', e.target.value)}
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
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Level
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={character.level}
                onChange={(e) => handleInputChange('level', parseInt(e.target.value))}
                className="fantasy-input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Background
              </label>
              <select
                value={character.background}
                onChange={(e) => handleInputChange('background', e.target.value)}
                className="fantasy-input"
                required
              >
                <option value="">Select Background</option>
                {backgrounds.map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Alignment
              </label>
              <select
                value={character.alignment}
                onChange={(e) => handleInputChange('alignment', e.target.value)}
                className="fantasy-input"
                required
              >
                <option value="">Select Alignment</option>
                {alignments.map(align => (
                  <option key={align} value={align}>{align}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ability Scores */}
          <div>
            <h2 className="text-2xl font-bold text-stone-800 mb-4">Ability Scores</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(ability => (
                <div key={ability}>
                  <label className="block text-sm font-medium text-stone-700 mb-2 capitalize">
                    {ability}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={character[ability]}
                    onChange={(e) => handleInputChange(ability, parseInt(e.target.value))}
                    className="fantasy-input"
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Physical Description */}
          <div>
            <h2 className="text-2xl font-bold text-stone-800 mb-4">Physical Description</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Age"
                value={character.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                className="fantasy-input"
              />
              <input
                type="text"
                placeholder="Height"
                value={character.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                className="fantasy-input"
              />
              <input
                type="text"
                placeholder="Weight"
                value={character.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                className="fantasy-input"
              />
              <input
                type="text"
                placeholder="Eye Color"
                value={character.eyes}
                onChange={(e) => handleInputChange('eyes', e.target.value)}
                className="fantasy-input"
              />
              <input
                type="text"
                placeholder="Skin Color"
                value={character.skin}
                onChange={(e) => handleInputChange('skin', e.target.value)}
                className="fantasy-input"
              />
              <input
                type="text"
                placeholder="Hair Color"
                value={character.hair}
                onChange={(e) => handleInputChange('hair', e.target.value)}
                className="fantasy-input"
              />
            </div>
          </div>

          {/* Character Personality */}
          <div>
            <h2 className="text-2xl font-bold text-stone-800 mb-4">Personality</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Personality Traits
                </label>
                <textarea
                  value={character.personality}
                  onChange={(e) => handleInputChange('personality', e.target.value)}
                  className="fantasy-input"
                  rows="3"
                  placeholder="Describe your character's personality..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Ideals
                </label>
                <textarea
                  value={character.ideals}
                  onChange={(e) => handleInputChange('ideals', e.target.value)}
                  className="fantasy-input"
                  rows="3"
                  placeholder="What does your character believe in?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Bonds
                </label>
                <textarea
                  value={character.bonds}
                  onChange={(e) => handleInputChange('bonds', e.target.value)}
                  className="fantasy-input"
                  rows="3"
                  placeholder="What connections does your character have?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Flaws
                </label>
                <textarea
                  value={character.flaws}
                  onChange={(e) => handleInputChange('flaws', e.target.value)}
                  className="fantasy-input"
                  rows="3"
                  placeholder="What are your character's weaknesses?"
                />
              </div>
            </div>
          </div>

          {/* Backstory */}
          <div>
            <h2 className="text-2xl font-bold text-stone-800 mb-4">Backstory</h2>
            <textarea
              value={character.backstory}
              onChange={(e) => handleInputChange('backstory', e.target.value)}
              className="fantasy-input"
              rows="6"
              placeholder="Tell the story of your character's life before the adventure..."
            />
          </div>

          {/* Character Portrait */}
          <div>
            <h2 className="text-2xl font-bold text-stone-800 mb-4">Character Portrait</h2>
            <div className="flex items-center space-x-4">
              <div className="w-32 h-32 bg-stone-200 rounded-lg flex items-center justify-center">
                <span className="text-stone-500">Portrait Placeholder</span>
              </div>
              <button
                type="button"
                className="fantasy-button"
                onClick={() => {/* TODO: Add image upload functionality */}}
              >
                Upload Image
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button 
              type="submit" 
              className="fantasy-button text-lg px-8 py-3"
              disabled={loading}
            >
              {loading ? 'Creating Character...' : 'Create Character'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 