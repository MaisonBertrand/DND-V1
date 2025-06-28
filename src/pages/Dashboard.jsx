import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { getUserParties, disbandParty } from '../firebase/database';
import ActionValidationDisplay from '../components/ActionValidationDisplay';
import DiceRollDisplay from '../components/DiceRollDisplay';
import MultipleAttemptsDisplay from '../components/MultipleAttemptsDisplay';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testInput, setTestInput] = useState('');
  const [storyContext, setStoryContext] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [showActionValidation, setShowActionValidation] = useState(false);
  const [showDiceRoll, setShowDiceRoll] = useState(false);
  const [showMultipleAttempts, setShowMultipleAttempts] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [diceResult, setDiceResult] = useState(null);
  const [multipleAttemptsResult, setMultipleAttemptsResult] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        await loadUserData(user.uid);
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const loadUserData = async (userId) => {
    try {
      const userParties = await getUserParties(userId);
      await loadPartyMemberProfiles(userParties);
      setParties(userParties);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPartyMemberProfiles = async (parties) => {
    for (const party of parties) {
      if (party.members) {
        for (const member of party.members) {
          if (member.profileId) {
            try {
              // Load member profile data if needed
              // This could be expanded to load character sheets, etc.
            } catch (error) {
              console.error('Error loading member profile:', error);
            }
          }
        }
      }
    }
  };

  const handleDeleteParty = async (partyId) => {
    try {
      await disbandParty(partyId, user.uid);
      setParties(prevParties => prevParties.filter(party => party.id !== partyId));
    } catch (error) {
      console.error('Error deleting party:', error);
    }
  };

  const handleNavigateToTest = () => {
    navigate('/test-environment');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="fantasy-container">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-300 mt-2 text-sm sm:text-base">
            Welcome back, {user?.displayName || user?.email}! Manage your campaigns and test the system.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="fantasy-card">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">Test Environment</h3>
            <p className="text-gray-300 mb-4 text-sm">
              Test action validation, dice rolling, and combat detection in a controlled environment.
            </p>
            <button
              onClick={handleNavigateToTest}
              className="w-full fantasy-button bg-green-600 hover:bg-green-700"
            >
              Open Test Environment
            </button>
          </div>

          <div className="fantasy-card">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">Create New Campaign</h3>
            <p className="text-gray-300 mb-4 text-sm">
              Start a new campaign with your party.
            </p>
            <button
              onClick={() => navigate('/campaign-management')}
              className="w-full fantasy-button bg-blue-600 hover:bg-blue-700"
            >
              Create Campaign
            </button>
          </div>

          <div className="fantasy-card">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">Character Creation</h3>
            <p className="text-gray-300 mb-4 text-sm">
              Create new characters for your campaigns.
            </p>
            <button
              onClick={() => navigate('/character-creation')}
              className="w-full fantasy-button bg-purple-600 hover:bg-purple-700"
            >
              Create Character
            </button>
          </div>
        </div>

        {/* Campaign List */}
        <div className="fantasy-card">
          <div className="border-b border-gray-700 pb-4 mb-4">
            <h2 className="text-xl font-semibold text-gray-100">Your Campaigns</h2>
          </div>
          
          {parties.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-300 mb-4">You haven't created any campaigns yet.</p>
              <button
                onClick={() => navigate('/campaign-management')}
                className="fantasy-button bg-blue-600 hover:bg-blue-700"
              >
                Create Your First Campaign
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {parties.map((party) => (
                <div key={party.id} className="border border-gray-600 rounded-lg p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-100">{party.name}</h3>
                      <p className="text-gray-300 mt-1 text-sm">{party.description}</p>
                      <div className="flex flex-wrap items-center mt-2 gap-2 text-xs sm:text-sm text-gray-400">
                        <span>{party.members?.length || 0} members</span>
                        <span>•</span>
                        <span>Theme: {party.theme}</span>
                        <span>•</span>
                        <span>Created: {new Date(party.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => navigate(`/campaign/${party.id}`)}
                        className="fantasy-button bg-blue-600 hover:bg-blue-700 flex-1"
                      >
                        Continue
                      </button>
                      <button
                        onClick={() => handleDeleteParty(party.id)}
                        className="fantasy-button bg-red-600 hover:bg-red-700 flex-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
