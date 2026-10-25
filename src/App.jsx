// The whole UI, shared by the Electron renderer (src/renderer.jsx) and the
// iPad entry point (src/ios/main.jsx). Platform differences live behind
// window.fishingApi and the components, not here.

import React, { useState, useEffect } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./index.css";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import GearCatalog from "./components/GearCatalog.jsx";
import FishingTrips from "./components/FishingTrips.jsx";
import QuickLinks from "./components/QuickLinks.jsx";
import Settings from "./components/Settings.jsx";
import Modal from "./components/Modal.jsx";
import { IS_IOS } from "./shared/platform";

const THEME_SETTING = "theme";

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [shouldShowSmartAdd, setShouldShowSmartAdd] = useState(false);
  const [shouldShowManualForm, setShouldShowManualForm] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [mapsApiKey, setMapsApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showFirstRun, setShowFirstRun] = useState(false);
  const [theme, setTheme] = useState('dark');

  // The palette is switched by data-theme on <html>; index.css holds both.
  // On the iPad the status bar text must follow too, or iOS keeps the system
  // style and dims a light page behind white text. Loaded only there.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (IS_IOS) {
      import('@capacitor/status-bar')
        .then(({ StatusBar, Style }) => StatusBar.setStyle({ style: theme === 'light' ? Style.Light : Style.Dark }))
        .catch((err) => console.error('Failed to set status bar style:', err));
    }
  }, [theme]);

  useEffect(() => {
    (async () => {
      try {
        const saved = await window.fishingApi.getSetting(THEME_SETTING);
        if (saved === 'light' || saved === 'dark') setTheme(saved);
      } catch (err) {
        console.error('Failed to load theme:', err);
      }
    })();
  }, []);

  const changeTheme = (next) => {
    setTheme(next);
    window.fishingApi.updateSetting(THEME_SETTING, next).catch((err) => {
      console.error('Failed to save theme:', err);
    });
  };

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

  // iPad only: a fresh install starts empty, so point at the snapshot exchange
  // once instead of leaving a blank app unexplained.
  useEffect(() => {
    if (!IS_IOS) return;
    (async () => {
      try {
        const [gear, trips, links, dismissed] = await Promise.all([
          window.fishingApi.getGear(),
          window.fishingApi.getTrips(),
          window.fishingApi.getLinks(),
          window.fishingApi.getSetting("first_run_dismissed"),
        ]);
        if (!dismissed && gear.length === 0 && trips.length === 0 && links.length === 0) {
          setShowFirstRun(true);
        }
      } catch (err) {
        console.error("First-run check failed:", err);
      }
    })();
  }, []);

  const dismissFirstRun = async (goToSettings) => {
    setShowFirstRun(false);
    try {
      await window.fishingApi.updateSetting("first_run_dismissed", "1");
    } catch (err) {
      console.error("Could not record first-run dismissal:", err);
    }
    if (goToSettings) setActiveTab("settings");
  };

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
        background: 'var(--bg-color)',
        color: 'var(--text-main)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px' }}>Bass Hub</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Preparing your tackle box...</p>
        </div>
      </div>
    );
  }

  const layout = (
    <div className="layout-container">
      <div className="titlebar-drag-region"></div>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} onThemeChange={changeTheme} />
      <main className="main-content">
        <div className="scroll-area">
          {renderContent()}
        </div>
      </main>

      <Modal
        isOpen={showFirstRun}
        onClose={() => dismissFirstRun(false)}
        title="Bring your data over"
      >
        <p className="snapshot-summary">
          Bass Hub on the iPad starts empty. If your tackle box lives on the Mac,
          open Settings there and use <strong>Export .db File</strong>, save it to
          iCloud Drive, then import it here under <strong>Snapshots</strong>.
        </p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => dismissFirstRun(false)}>
            Start fresh
          </button>
          <button className="btn-primary" onClick={() => dismissFirstRun(true)}>
            Go to Settings
          </button>
        </div>
      </Modal>
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
