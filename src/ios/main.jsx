// TEMPORARY spike harness. Replaced by the real entry point once the two
// feasibility questions are answered. Results print as "[spike] ..." lines.

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

const MAPS_KEY = __MAPS_KEY__;
const TW_PRODUCT = 'https://www.tacklewarehouse.com/Berkley_Choppo_Topwater/descpage-BCH.html';
const TW_IMAGE = 'https://img.tacklewarehouse.com/watermark/rs.php?path=BCH-BONE-1.jpg&nw=455';

const log = (msg) => console.log(`[spike] ${msg}`);

function App() {
  const [lines, setLines] = useState([]);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const push = (msg) => {
    log(msg);
    setLines((prev) => [...prev, msg]);
  };

  useEffect(() => {
    (async () => {
      const cap = window.Capacitor;
      push(`platform=${cap?.getPlatform?.() ?? 'none'} keyLen=${MAPS_KEY.length}`);

      // 1. Plain cross-origin fetch — confirms CapacitorHttp is patching fetch.
      try {
        const res = await fetch(TW_PRODUCT, { headers: { Accept: 'text/html' } });
        const body = await res.text();
        const hasMainImage = /class="main_image/.test(body);
        const hasBrand = /itemprop="brand"/.test(body);
        push(`tw-page status=${res.status} bytes=${body.length} main_image=${hasMainImage} brand=${hasBrand}`);
      } catch (err) {
        push(`tw-page FAILED: ${err?.message ?? err}`);
      }

      // 2. Remote image fetch (the Phase 4 hotlink path).
      try {
        const res = await fetch(TW_IMAGE);
        const blob = await res.blob();
        push(`tw-image status=${res.status} type=${blob.type} bytes=${blob.size}`);
      } catch (err) {
        push(`tw-image FAILED: ${err?.message ?? err}`);
      }

      push('done');
    })();
  }, []);

  const embedUrl = MAPS_KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=Lake%20Okeechobee,%20FL&zoom=10`
    : '';

  return (
    <div style={{ font: '14px -apple-system, system-ui', padding: '60px 20px 20px', color: '#e6edf3', background: '#0b0e11', minHeight: '100vh' }}>
      <h2 style={{ margin: '0 0 12px' }}>Spike</h2>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.5, background: '#161b22', padding: 12, borderRadius: 8 }}>
        {lines.join('\n') || 'running…'}
      </pre>

      <p style={{ margin: '18px 0 6px', fontSize: 12, color: '#8b949e' }}>
        Maps Embed iframe — onload fired: {String(iframeLoaded)}
      </p>
      {embedUrl ? (
        <iframe
          title="maps-embed"
          src={embedUrl}
          width="100%"
          height="360"
          style={{ border: '1px solid #30363d', borderRadius: 8, background: '#fff' }}
          onLoad={() => {
            setIframeLoaded(true);
            log('maps-iframe onload fired');
          }}
          onError={() => log('maps-iframe onerror fired')}
        />
      ) : (
        <p style={{ color: '#f85149' }}>No maps key in the build.</p>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
