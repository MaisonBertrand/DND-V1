import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CharacterCreation from './pages/CharacterCreation';
import PartyManagement from './pages/PartyManagement';
import CampaignManagement from './pages/CampaignManagement';
import Combat from './pages/Combat';
import CampaignStory from './components/CampaignStory';

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
            <Route path="/character-creation/:partyId" element={<CharacterCreation />} />
            <Route path="/party-management" element={<PartyManagement />} />
            <Route path="/campaign/:partyId" element={<CampaignManagement />} />
            <Route path="/campaign-story/:partyId" element={<CampaignStory />} />
            <Route path="/combat/:partyId" element={<Combat />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App; 