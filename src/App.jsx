// The whole UI, shared by the Electron renderer (src/renderer.jsx) and the
// iPad entry point (src/ios/main.jsx). Platform differences live behind
// window.fishingApi and the components, not here.

import React, { useState, useEffect } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import "./index.css";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import GearCatalog from "./components/GearCatalog.jsx";
import FishingTrips from "./components/FishingTrips.jsx";
import QuickLinks from "./components/QuickLinks.jsx";
import Settings from "./components/Settings.jsx";

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [shouldShowSmartAdd, setShouldShowSmartAdd] = useState(false);
  const [shouldShowManualForm, setShouldShowManualForm] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [mapsApiKey, setMapsApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const key = await window.fishingApi.getMapsApiKey();
        setMapsApiKey(key);
      } catch (err) {
        console.error('Failed to fetch maps key:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchKey();
  }, []);

  const navigateToSmartAdd = () => {
    setActiveTab('gear');
    setShouldShowSmartAdd(true);
  };

  const navigateToTripDetail = (tripId) => {
    setSelectedTripId(tripId);
    setActiveTab('trips');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard
          setActiveTab={setActiveTab}
          navigateToSmartAdd={navigateToSmartAdd}
          navigateToTripDetail={navigateToTripDetail}
        />;
      case 'gear':
        return <GearCatalog
          initialShowSmartAdd={shouldShowSmartAdd}
          onSmartAddHandled={() => setShouldShowSmartAdd(false)}
          initialShowManualForm={shouldShowManualForm}
          onManualHandled={() => setShouldShowManualForm(false)}
        />;
      case 'trips':
        return <FishingTrips
          selectedTripId={selectedTripId}
          onTripSelectionHandled={() => setSelectedTripId(null)}
          mapsApiKey={mapsApiKey}
        />;
      case 'links':
        return <QuickLinks />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard
          setActiveTab={setActiveTab}
          navigateToSmartAdd={navigateToSmartAdd}
          navigateToTripDetail={navigateToTripDetail}
        />;
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen" style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: 'white',
        fontFamily: 'system-ui'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px' }}>Bass Hub</h2>
          <p style={{ color: '#888', fontSize: '0.9rem' }}>Preparing your tackle box...</p>
        </div>
      </div>
    );
  }

  const layout = (
    <div className="layout-container">
      <div className="titlebar-drag-region"></div>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        <div className="scroll-area">
          {renderContent()}
        </div>
      </main>
    </div>
  );

  if (mapsApiKey) {
    return (
      <APIProvider apiKey={mapsApiKey} solutionChannel="GMP_GCC_GOOGLEMESSAGES_V1">
        {layout}
      </APIProvider>
    );
  }

  return layout;
};

export default App;
