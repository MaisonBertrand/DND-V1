import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import VersionDisplay from './components/VersionDisplay';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TestEnvironment from './pages/TestEnvironment';
import CampaignManagement from './pages/CampaignManagement';
import CharacterCreation from './pages/CharacterCreation';
import CampaignStory from './components/CampaignStory';
import Combat from './pages/Combat';
import PartyManagement from './pages/PartyManagement';
import './index.css';

// Component to handle old route redirects and logging
function OldRouteRedirect() {
  const location = useLocation();
  const partyId = location.pathname.split('/campaign-story/')[1];
  
  console.log('Old route detected:', location.pathname);
  console.log('PartyId extracted:', partyId);
  console.log('Redirecting to:', `/campaign/${partyId}`);
  
  return <Navigate to={`/campaign/${partyId}`} replace />;
}

function App() {
  return (
    <Router 
      basename="/DND-V1"
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/test-environment" element={<TestEnvironment />} />
            <Route path="/campaign-management" element={<CampaignManagement />} />
            <Route path="/character-creation/:partyId" element={<CharacterCreation />} />
            <Route path="/campaign/:partyId" element={<CampaignStory />} />
            <Route path="/combat/:partyId" element={<Combat />} />
            <Route path="/party-management" element={<PartyManagement />} />
            
            {/* Redirect old campaign-story routes to new campaign routes */}
            <Route path="/campaign-story/:partyId" element={<OldRouteRedirect />} />
            
            {/* Catch-all route for any unmatched paths */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
        <VersionDisplay />
      </div>
    </Router>
  );
}

export default App; 