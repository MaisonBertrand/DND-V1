import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { createParty } from '../firebase/database';
import DungeonMaster from '../components/DungeonMaster';

export default function CampaignManagement() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [partyData, setPartyData] = useState({
    name: '',
    description: '',
    theme: 'Fantasy',
    maxPlayers: 6,
    isPublic: true
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

  const handlePartyDataChange = (field, value) => {
    setPartyData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateParty = async () => {
    try {
      setLoading(true);
      await createParty(user.uid, partyData);
      navigate('/party-management');
    } catch (error) {
      // Handle error silently or show user-friendly message
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <p className="text-stone-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card">
        <div className="flex justify-between items-center mb-6">
          <h1 className="fantasy-title mb-0">Campaign Management</h1>
          <div className="text-sm text-stone-600">
            Playing as: <span className="font-medium">{user.displayName}</span>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="campaign-name" className="block text-sm font-medium text-stone-700 mb-2">
              Campaign Name
            </label>
            <input
              id="campaign-name"
              type="text"
              value={partyData.name}
              onChange={(e) => handlePartyDataChange('name', e.target.value)}
              className="fantasy-input"
              placeholder="Enter campaign name..."
            />
          </div>

          <div>
            <label htmlFor="campaign-description" className="block text-sm font-medium text-stone-700 mb-2">
              Campaign Description
            </label>
            <textarea
              id="campaign-description"
              value={partyData.description}
              onChange={(e) => handlePartyDataChange('description', e.target.value)}
              className="fantasy-input"
              rows="4"
              placeholder="Describe your campaign..."
            />
          </div>

          <div>
            <label htmlFor="campaign-theme" className="block text-sm font-medium text-stone-700 mb-2">
              Theme
            </label>
            <input
              id="campaign-theme"
              type="text"
              value={partyData.theme}
              onChange={(e) => handlePartyDataChange('theme', e.target.value)}
              className="fantasy-input"
              placeholder="Enter campaign theme..."
            />
          </div>

          <div>
            <label htmlFor="max-players" className="block text-sm font-medium text-stone-700 mb-2">
              Maximum Players
            </label>
            <input
              id="max-players"
              type="number"
              value={partyData.maxPlayers}
              onChange={(e) => handlePartyDataChange('maxPlayers', Number(e.target.value))}
              className="fantasy-input"
              placeholder="Enter maximum number of players..."
            />
          </div>

          <div>
            <label htmlFor="public-campaign" className="block text-sm font-medium text-stone-700 mb-2">
              Public Campaign
            </label>
            <input
              id="public-campaign"
              type="checkbox"
              checked={partyData.isPublic}
              onChange={(e) => handlePartyDataChange('isPublic', e.target.checked)}
              className="mr-2"
            />
          </div>

          <div className="text-center py-8">
            <button
              onClick={handleCreateParty}
              className="fantasy-button text-lg px-8 py-3"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 