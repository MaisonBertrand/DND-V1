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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.displayName || user?.email}! Manage your campaigns and test the system.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Test Environment</h3>
            <p className="text-gray-600 mb-4">
              Test action validation, dice rolling, and combat detection in a controlled environment.
            </p>
            <button
              onClick={handleNavigateToTest}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Open Test Environment
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Create New Campaign</h3>
            <p className="text-gray-600 mb-4">
              Start a new campaign with your party.
            </p>
            <button
              onClick={() => navigate('/campaign-management')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Campaign
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Character Creation</h3>
            <p className="text-gray-600 mb-4">
              Create new characters for your campaigns.
            </p>
            <button
              onClick={() => navigate('/character-creation')}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Character
            </button>
          </div>
        </div>

        {/* Campaign List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Your Campaigns</h2>
          </div>
          
          {parties.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-600 mb-4">You haven't created any campaigns yet.</p>
              <button
                onClick={() => navigate('/campaign-management')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Campaign
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {parties.map((party) => (
                <div key={party.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800">{party.name}</h3>
                      <p className="text-gray-600 mt-1">{party.description}</p>
                      <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                        <span>{party.members?.length || 0} members</span>
                        <span>Theme: {party.theme}</span>
                        <span>Created: {new Date(party.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/campaign/${party.id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Continue
                      </button>
                      <button
                        onClick={() => handleDeleteParty(party.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
