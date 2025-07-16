import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Navbar from './components/Navbar';
import VersionDisplay from './components/VersionDisplay';
import VisibilityDebugger from './components/VisibilityDebugger';
import './index.css';

// Lazy load components for code splitting
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CharacterCreation = lazy(() => import('./pages/CharacterCreation'));
const CampaignLobby = lazy(() => import('./pages/CampaignLobby'));
const CampaignStory = lazy(() => import('./components/CampaignStory'));
const ManualCampaign = lazy(() => import('./pages/ManualCampaign'));
const ManualCampaignDM = lazy(() => import('./pages/ManualCampaignDM'));
const Combat = lazy(() => import('./pages/Combat'));
const VisibilityTest = lazy(() => import('./components/VisibilityTest'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-400 border-t-transparent mx-auto mb-4"></div>
      <p className="text-slate-300 text-lg font-medium">Loading...</p>
    </div>
  </div>
);

// Component to handle old route redirects and logging
function OldRouteRedirect() {
  const location = useLocation();
  const partyId = location.pathname.split('/campaign-story/')[1];
  
  return <Navigate to={`/campaign/${partyId}`} replace />;
}

function App() {
  const [firebaseError, setFirebaseError] = useState(false);

  useEffect(() => {
    // Check if Firebase is properly initialized
    try {
      // This will trigger the error handling in config.js if env vars are missing
      import('./firebase/config');
    } catch (error) {
      setFirebaseError(true);
    }
  }, []);

  if (firebaseError) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-amber-500 mb-4">🚨 Setup Required</h1>
          <p className="mb-4">
            This application requires Firebase configuration to work properly.
          </p>
          <div className="bg-gray-800 p-4 rounded-lg mb-4 text-sm font-mono text-left">
            <p>Create a <code>.env</code> file in the project root with:</p>
            <pre className="mt-2 text-xs">
{`VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id`}
            </pre>
          </div>
          <p className="text-sm text-gray-400">
            See <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">Firebase Console</a> to create a project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
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
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/character-creation/:partyId" element={<CharacterCreation />} />
                <Route path="/lobby/:partyId" element={<CampaignLobby />} />
                <Route path="/campaign/:partyId" element={<CampaignStory />} />
                <Route path="/manual-campaign/:partyId" element={<ManualCampaign />} />
                <Route path="/manual-campaign-dm/:partyId" element={<ManualCampaignDM />} />
                <Route path="/combat/:sessionId" element={<Combat />} />
                <Route path="/visibility-test" element={<VisibilityTest />} />
                
                {/* Redirect old campaign-story routes to new campaign routes */}
                <Route path="/campaign-story/:partyId" element={<OldRouteRedirect />} />
                
                {/* Catch-all route for any unmatched paths */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </main>
          <VersionDisplay />
          {/* Visibility Debugger - enable by setting isEnabled to true */}
          <VisibilityDebugger isEnabled={false} />
        </div>
      </Router>
    </AppProvider>
  );
}

export default App; 