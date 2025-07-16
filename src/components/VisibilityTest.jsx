import React, { useState } from 'react';
import { FantasyCard, FantasyButton, FantasyInput, ModalWrapper } from '../utils/uiUtils';
import { ensureModalVisibility, fixVisibilityIssues, debugVisibility } from '../utils/uiUtils';

export default function VisibilityTest() {
  const [showModal, setShowModal] = useState(false);
  const [testInput, setTestInput] = useState('');

  const runVisibilityTests = () => {
    console.log('🔍 Running visibility tests...');
    
    // Test 1: Check for hidden elements
    const hiddenElements = debugVisibility();
    
    // Test 2: Fix common issues
    fixVisibilityIssues();
    
    // Test 3: Ensure modal visibility
    ensureModalVisibility();
    
    console.log('✅ Visibility tests completed');
    alert(`Visibility tests completed. Found ${hiddenElements.length} hidden elements. Check console for details.`);
  };

  return (
    <div className="fantasy-container">
      <h1 className="fantasy-title">🔍 UI Visibility Test</h1>
      <p className="fantasy-subtitle">Test all UI elements to ensure they are visible</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Test Cards */}
        <FantasyCard>
          <h3 className="text-xl font-bold text-amber-400 mb-4">Test Card 1</h3>
          <p className="text-slate-300 mb-4">This card should be visible with proper styling.</p>
          <FantasyButton onClick={() => alert('Button 1 clicked!')}>
            Test Button 1
          </FantasyButton>
        </FantasyCard>

        <FantasyCard>
          <h3 className="text-xl font-bold text-amber-400 mb-4">Test Card 2</h3>
          <p className="text-slate-300 mb-4">Another test card to verify visibility.</p>
          <FantasyButton onClick={() => alert('Button 2 clicked!')}>
            Test Button 2
          </FantasyButton>
        </FantasyCard>
      </div>

      {/* Test Inputs */}
      <FantasyCard className="mb-8">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Test Inputs</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-slate-300 mb-2">Text Input:</label>
            <FantasyInput
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Type something here..."
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-2">Select Input:</label>
            <select className="fantasy-input">
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>
          </div>
        </div>
      </FantasyCard>

      {/* Test Buttons */}
      <FantasyCard className="mb-8">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Test Buttons</h3>
        <div className="flex flex-wrap gap-4">
          <FantasyButton onClick={() => setShowModal(true)}>
            Open Modal
          </FantasyButton>
          <FantasyButton onClick={runVisibilityTests}>
            Run Visibility Tests
          </FantasyButton>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Regular Button
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
            Success Button
          </button>
        </div>
      </FantasyCard>

      {/* Test Responsive Elements */}
      <FantasyCard className="mb-8">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Responsive Test</h3>
        <div className="space-y-2">
          <div className="hidden sm:block bg-green-900/50 p-2 rounded">
            This should be hidden on mobile (sm:block)
          </div>
          <div className="sm:hidden bg-red-900/50 p-2 rounded">
            This should be visible on mobile (sm:hidden)
          </div>
          <div className="hidden md:block bg-blue-900/50 p-2 rounded">
            This should be hidden on small screens (md:block)
          </div>
          <div className="md:hidden bg-yellow-900/50 p-2 rounded">
            This should be visible on small screens (md:hidden)
          </div>
        </div>
      </FantasyCard>

      {/* Test Z-Index Layers */}
      <FantasyCard className="mb-8">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Z-Index Test</h3>
        <div className="relative h-32 bg-slate-700 rounded p-4">
          <div className="absolute top-2 left-2 bg-red-600 p-2 rounded z-10">
            Z-10 Layer
          </div>
          <div className="absolute top-8 left-8 bg-green-600 p-2 rounded z-20">
            Z-20 Layer
          </div>
          <div className="absolute top-14 left-14 bg-blue-600 p-2 rounded z-30">
            Z-30 Layer
          </div>
        </div>
      </FantasyCard>

      {/* Modal Test */}
      <ModalWrapper isOpen={showModal} onClose={() => setShowModal(false)}>
        <FantasyCard>
          <h3 className="text-xl font-bold text-amber-400 mb-4">Test Modal</h3>
          <p className="text-slate-300 mb-4">
            This modal should be visible and properly positioned. It should have a dark overlay behind it.
          </p>
          <div className="flex gap-4">
            <FantasyButton onClick={() => setShowModal(false)}>
              Close Modal
            </FantasyButton>
            <FantasyButton onClick={() => alert('Modal button clicked!')}>
              Test Action
            </FantasyButton>
          </div>
        </FantasyCard>
      </ModalWrapper>
    </div>
  );
} 