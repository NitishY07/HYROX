/**
 * Standalone Broadcast Overlay Controller (overlay.js)
 * Supports local BroadcastChannel AND Cross-Machine Network Sync via /api/gfx-state.
 */
document.addEventListener('DOMContentLoaded', () => {
  const channel = new BroadcastChannel('mika_gfx_channel');
  
  // DOM Elements
  const bannerEl = document.getElementById('gfxBanner');
  const leaderboardEl = document.getElementById('gfxLeaderboard');
  const lowerThirdEl = document.getElementById('gfxLowerThird');
  const tickerEl = document.getElementById('gfxTicker');

  // State
  let state = {
    mode: 'sim',
    theme: 'theme-sportvot',
    position: 'pos-top-left',
    visibleElements: {
      banner: true,
      leaderboard: true,
      lowerThird: false,
      ticker: true
    },
    meetingInfo: {
      title: 'DELHI CHAMPIONSHIP 2026',
      meta: 'HYROX • Day 2 • Live'
    },
    leaderboard: [],
    spotlightAthlete: null,
    tickerItems: []
  };

  function render() {
    // 1. Theme & Position
    document.body.className = `gfx-overlay-body ${state.theme || 'theme-sportvot'} ${state.position || 'pos-top-left'}`;

    // 2. Banner
    if (bannerEl) {
      if (state.visibleElements && state.visibleElements.banner && state.meetingInfo) {
        bannerEl.classList.remove('gfx-hidden');
        const t = document.getElementById('bannerTitle');
        const m = document.getElementById('bannerMeta');
        if (t) t.innerText = state.meetingInfo.title || 'LIVE EVENT';
        if (m) m.innerText = state.meetingInfo.meta || 'MIKA TIMING';
      } else {
        bannerEl.classList.add('gfx-hidden');
      }
    }

    // 3. Leaderboard
    if (leaderboardEl) {
      if (state.visibleElements && state.visibleElements.leaderboard && state.leaderboard && state.leaderboard.length > 0) {
        leaderboardEl.classList.remove('gfx-hidden');
        const listContainer = document.getElementById('lbList');
        if (listContainer) {
          listContainer.innerHTML = state.leaderboard.slice(0, 10).map(item => `
            <div class="gfx-lb-item pos-${item.rank}">
              <div class="gfx-rank-num">${item.rank}</div>
              <div class="gfx-bib-tag">#${item.bib || '000'}</div>
              <div class="gfx-athlete-details">
                <div class="gfx-athlete-name">${escapeHtml(item.name || 'Athlete')}</div>
                <div class="gfx-athlete-club">${escapeHtml(item.club || item.nat || '')}</div>
              </div>
              <div class="gfx-time-col">
                <div class="gfx-time-val">${item.time || '--:--'}</div>
                <div class="gfx-time-delta">${item.delta || ''}</div>
              </div>
            </div>
          `).join('');
        }
      } else {
        leaderboardEl.classList.add('gfx-hidden');
      }
    }

    // 4. Lower Third
    if (lowerThirdEl) {
      if (state.visibleElements && state.visibleElements.lowerThird && state.spotlightAthlete) {
        lowerThirdEl.classList.remove('gfx-hidden');
        const a = state.spotlightAthlete;
        const r = document.getElementById('ltRankNum');
        const b = document.getElementById('ltBib');
        const n = document.getElementById('ltName');
        const m = document.getElementById('ltMeta');
        const tm = document.getElementById('ltTime');
        if (r) r.innerText = a.rank ? `#${a.rank}` : '--';
        if (b) b.innerText = `BIB #${a.bib || '---'} • ${a.nat || 'IND'}`;
        if (n) n.innerText = a.name || 'SELECT ATHLETE';
        if (m) m.innerText = `${a.club || 'Club'} • Pace: ${a.pace || 'N/A'}`;
        if (tm) tm.innerText = a.time || '00:00';
      } else {
        lowerThirdEl.classList.add('gfx-hidden');
      }
    }

    // 5. Ticker
    if (tickerEl) {
      if (state.visibleElements && state.visibleElements.ticker && state.tickerItems && state.tickerItems.length > 0) {
        tickerEl.classList.remove('gfx-hidden');
        const tickerWrapper = document.getElementById('tickerWrapper');
        if (tickerWrapper) {
          const itemsHtml = state.tickerItems.map(item => `
            <div class="gfx-ticker-item">
              <span class="bib">#${item.bib}</span>
              <span class="name">${escapeHtml(item.name)}</span>
              <span class="split">${escapeHtml(item.checkpoint)}</span>
              <span class="time">${item.time}</span>
            </div>
          `).join('');
          tickerWrapper.innerHTML = itemsHtml + itemsHtml;
        }
      } else {
        tickerEl.classList.add('gfx-hidden');
      }
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 1. BroadcastChannel (Same Machine)
  channel.onmessage = (event) => {
    if (event.data && event.data.type === 'GFX_UPDATE') {
      state = { ...state, ...event.data.payload };
      render();
    }
  };

  // 2. Server Polling (For Cross-Machine Network OBS / vMix Overlays)
  async function pollNetworkState() {
    try {
      const res = await fetch('/api/gfx-state');
      if (res.ok) {
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          state = { ...state, ...data };
          render();
        }
      }
    } catch (e) {}
  }

  setInterval(pollNetworkState, 500);

  try {
    const saved = localStorage.getItem('mika_gfx_state');
    if (saved) {
      state = { ...state, ...JSON.parse(saved) };
    }
  } catch (e) {}

  render();
});
