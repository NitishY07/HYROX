/**
 * Standalone Broadcast Overlay Controller (overlay.js)
 * Supports BroadcastChannel, Server-Sent Events (SSE /api/gfx-stream), and fallback HTTP polling.
 * Uses real wall-clock timestamps (Date.now()) for 100% background tab throttling immunity in OBS/vMix!
 */
document.addEventListener('DOMContentLoaded', () => {
  const channel = new BroadcastChannel('mika_gfx_channel');
  
  // DOM Elements
  const bannerEl = document.getElementById('gfxBanner');
  const leaderboardEl = document.getElementById('gfxLeaderboard');
  const lowerThirdEl = document.getElementById('gfxLowerThird');
  const tickerEl = document.getElementById('gfxTicker');

  // Cache last HTML to prevent destroying DOM nodes and restarting CSS keyframe animations
  let lastTickerHtml = '';
  let lastLeaderboardHtml = '';
  let lastStateTimestamp = 0;

  // State
  let state = {
    mode: 'sim',
    startTimeMs: null,
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
      meta: 'HYROX • Day 2 • Live',
      sponsorLogo: ''
    },
    leaderboard: [],
    spotlightAthlete: null,
    tickerItems: [],
    timestamp: 0
  };

  function formatTime(totalSec) {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = Math.floor(totalSec % 60);
    
    const pMins = String(mins).padStart(2, '0');
    const pSecs = String(secs).padStart(2, '0');
    
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${pMins}:${pSecs}`;
    }
    return `${pMins}:${pSecs}`;
  }

  function render() {
    // 1. Theme & Position
    document.body.className = `gfx-overlay-body ${state.theme || 'theme-sportvot'} ${state.position || 'pos-top-left'}`;

    // 2. Banner
    if (bannerEl) {
      if (state.visibleElements && state.visibleElements.banner && state.meetingInfo) {
        bannerEl.classList.remove('gfx-hidden');
        const t = document.getElementById('bannerTitle');
        const m = document.getElementById('bannerMeta');
        if (t && t.innerText !== state.meetingInfo.title) t.innerText = state.meetingInfo.title || 'LIVE EVENT';
        if (m && m.innerText !== state.meetingInfo.meta) m.innerText = state.meetingInfo.meta || 'MIKA TIMING';
        
        // Sponsor Logo
        let logoEl = document.getElementById('bannerSponsorLogo');
        if (state.meetingInfo.sponsorLogo) {
          if (!logoEl) {
            logoEl = document.createElement('img');
            logoEl.id = 'bannerSponsorLogo';
            logoEl.className = 'gfx-sponsor-logo';
            bannerEl.appendChild(logoEl);
          }
          if (logoEl.src !== state.meetingInfo.sponsorLogo) {
            logoEl.src = state.meetingInfo.sponsorLogo;
          }
        } else if (logoEl) {
          logoEl.remove();
        }
      } else {
        bannerEl.classList.add('gfx-hidden');
      }
    }

    const isTimerEnabled = state.visibleElements && state.visibleElements.showTimer === true;

    // Dynamic clock calculation ONLY if showTimer is explicitly enabled
    let currentLeaderboard = state.leaderboard || [];
    if (state.mode === 'sim' && isTimerEnabled && state.startTimeMs) {
      const elapsedSec = Math.floor((Date.now() - state.startTimeMs) / 1000);
      currentLeaderboard = currentLeaderboard.map((item, index) => {
        const baseOffset = index === 0 ? 0 : index * 4.2;
        const itemSec = Math.max(0, elapsedSec + baseOffset);
        return {
          ...item,
          time: formatTime(itemSec)
        };
      });
    }

    // 3. Leaderboard
    if (leaderboardEl) {
      if (state.visibleElements && state.visibleElements.leaderboard && currentLeaderboard && currentLeaderboard.length > 0) {
        leaderboardEl.classList.remove('gfx-hidden');
        const catBadge = document.getElementById('lbCategory');
        if (catBadge && state.meetingInfo && state.meetingInfo.category) {
          catBadge.innerText = state.meetingInfo.category;
        }
        const listContainer = document.getElementById('lbList');
        if (listContainer) {
          const lbHtml = currentLeaderboard.slice(0, 10).map(item => `
            <div class="gfx-lb-item pos-${item.rank}">
              <div class="gfx-rank-num">${item.rank}</div>
              <div class="gfx-bib-tag">#${item.bib || '000'}</div>
              <div class="gfx-athlete-details">
                <div class="gfx-athlete-name">${escapeHtml(item.name || 'Athlete')}</div>
                <div class="gfx-athlete-club">${escapeHtml(item.club || item.nat || '')}</div>
              </div>
              <div class="gfx-time-col">
                ${(isTimerEnabled && item.time) ? `<div class="gfx-time-val">${item.time}</div>` : ''}
                <div class="gfx-time-delta">${item.delta || ''}</div>
              </div>
            </div>
          `).join('');

          if (lbHtml !== lastLeaderboardHtml) {
            listContainer.innerHTML = lbHtml;
            lastLeaderboardHtml = lbHtml;
          }
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
        if (tm) tm.innerText = (isTimerEnabled && a.time) ? a.time : '';
      } else {
        lowerThirdEl.classList.add('gfx-hidden');
      }
    }

    // 5. Ticker - Smooth Continuous Marquee
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
              ${(isTimerEnabled && item.time) ? `<span class="time">${item.time}</span>` : ''}
            </div>
          `).join('');

          const fullTickerHtml = itemsHtml + itemsHtml;
          if (fullTickerHtml !== lastTickerHtml) {
            // Check if wrapper is empty (initial render)
            if (!tickerWrapper.innerHTML.trim()) {
              tickerWrapper.innerHTML = fullTickerHtml;
            } else {
              // Update inner items without triggering animation reset if item count matches
              const existingItems = tickerWrapper.querySelectorAll('.gfx-ticker-item');
              const tempContainer = document.createElement('div');
              tempContainer.innerHTML = fullTickerHtml;
              const newItems = tempContainer.querySelectorAll('.gfx-ticker-item');

              if (existingItems.length === newItems.length) {
                existingItems.forEach((oldItem, idx) => {
                  if (oldItem.innerHTML !== newItems[idx].innerHTML) {
                    oldItem.innerHTML = newItems[idx].innerHTML;
                  }
                });
              } else {
                tickerWrapper.innerHTML = fullTickerHtml;
              }
            }
            lastTickerHtml = fullTickerHtml;
          }
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

  function applyStateUpdate(incomingPayload) {
    if (!incomingPayload) return;
    const incomingTs = incomingPayload.timestamp || 0;
    
    // Ignore stale updates if we already received a newer state
    if (incomingTs > 0 && incomingTs < lastStateTimestamp) {
      return;
    }
    
    if (incomingTs > 0) {
      lastStateTimestamp = incomingTs;
    }

    state = { ...state, ...incomingPayload };
    render();
  }

  // 1. BroadcastChannel (Same Machine - Instant)
  channel.onmessage = (event) => {
    if (event.data && event.data.type === 'GFX_UPDATE') {
      applyStateUpdate(event.data.payload);
    }
  };

  // 2. Server-Sent Events (SSE) Stream for Zero-Latency Network Sync
  let sseSource = null;
  function connectSSE() {
    try {
      sseSource = new EventSource('/api/gfx-stream');
      sseSource.onmessage = (event) => {
        if (event.data) {
          try {
            const data = JSON.parse(event.data);
            if (data && Object.keys(data).length > 0) {
              applyStateUpdate(data);
            }
          } catch (e) {}
        }
      };

      sseSource.onerror = () => {
        // Fallback to HTTP polling if SSE connection fails
        if (sseSource) sseSource.close();
        setTimeout(connectSSE, 5000);
      };
    } catch (e) {
      // Fallback HTTP polling if EventSource is unsupported
      setInterval(pollNetworkState, 1000);
    }
  }

  // 3. Fallback HTTP Polling
  async function pollNetworkState() {
    try {
      const res = await fetch('/api/gfx-state');
      if (res.ok) {
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          applyStateUpdate(data);
        }
      }
    } catch (e) {}
  }

  // Initialize SSE connection
  connectSSE();

  // Load initial cached local storage state
  try {
    const saved = localStorage.getItem('mika_gfx_state');
    if (saved) {
      applyStateUpdate(JSON.parse(saved));
    }
  } catch (e) {}

  render();
});

