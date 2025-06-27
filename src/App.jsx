import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router basename="/DND-V1">
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
            <Route path="/character-creation" element={<CharacterCreation />} />
            <Route path="/campaign/:partyId" element={<CampaignStory />} />
            <Route path="/combat" element={<Combat />} />
            <Route path="/party-management" element={<PartyManagement />} />
          </Routes>
        </main>
        <VersionDisplay />
      </div>
    </Router>
  );
}

export default App; 