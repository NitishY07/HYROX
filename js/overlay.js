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
    theme: 'theme-starting-list',
    position: 'pos-bottom-grid',
    displayContent: 'both',
    nameFormat: 'full',
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
    if (!state.theme || state.theme === 'theme-starting-list') {
      state.position = 'pos-bottom-grid';
    }
    document.body.className = `gfx-overlay-body ${state.theme || 'theme-starting-list'} ${state.position || 'pos-bottom-grid'}`;

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
    const isClubsEnabled = !state.visibleElements || state.visibleElements.showClubs !== false;

    // Dynamic clock calculation ONLY in SIM mode
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
      if (state.visibleElements && state.visibleElements.leaderboard) {
        leaderboardEl.classList.remove('gfx-hidden');
        const isStartingListTheme = (state.theme === 'theme-starting-list');
        const isSignatureBroadcastTheme = (state.theme !== 'theme-starting-list');
        const isBottomGrid = (state.position === 'pos-bottom-grid');
        const hasLiveTimes = currentLeaderboard.some(item => item.time || (item.split && item.split !== 'REGISTERED'));

        // Determine mode
        const isLiveTimerMode = isSignatureBroadcastTheme || hasLiveTimes;

        if (isLiveTimerMode) {
          leaderboardEl.classList.remove('mode-team');
          leaderboardEl.classList.add('mode-timer');
        } else {
          leaderboardEl.classList.remove('mode-timer');
          leaderboardEl.classList.add('mode-team');
        }

        const catBadge = document.getElementById('lbCategory');
        if (catBadge) {
          catBadge.innerText = isLiveTimerMode ? 'TIME' : 'TEAM';
        }

        let headerText = 'STARTING LIST';
        if (state.meetingInfo?.eventTitle && !/^HYROX$/i.test(state.meetingInfo.eventTitle)) {
          headerText = state.meetingInfo.eventTitle;
        } else if (!isLiveTimerMode) {
          headerText = 'STARTING LIST';
        } else if (state.meetingInfo?.category && !/^HYROX/i.test(state.meetingInfo.category)) {
          headerText = state.meetingInfo.category;
        } else if (state.meetingInfo?.title && !/^HYROX/i.test(state.meetingInfo.title)) {
          headerText = state.meetingInfo.title;
        }
        headerText = headerText.replace(/\s*•\s*Live/i, '').trim();

        const eventBar = document.getElementById('lbEventBar');
        if (eventBar) {
          if (isBottomGrid) {
            eventBar.innerHTML = `<span class="gfx-grid-station-pill">STARTING LIST</span>`;
          } else {
            eventBar.innerText = headerText.toUpperCase();
          }
        }

        const titleEl = document.getElementById('lbTitle') || document.querySelector('.gfx-lb-title');
        if (titleEl) {
          titleEl.innerText = 'ATHLETES';
        }

        const listContainer = document.getElementById('lbList');
        if (listContainer) {
          if (!currentLeaderboard || currentLeaderboard.length === 0) {
            const emptyHtml = `
              <div class="gfx-lb-item" style="grid-template-columns: 1fr; justify-content: center; text-align: center; color: #CBD5E1; font-weight: 800; font-size: 13px; letter-spacing: 1px; padding: 18px;">
                AWAITING LIVE RACE START...
              </div>
            `;
            if (emptyHtml !== lastLeaderboardHtml) {
              listContainer.innerHTML = emptyHtml;
              lastLeaderboardHtml = emptyHtml;
            }
          } else {
            let displayList = [...currentLeaderboard];
            
            // Sort dynamically by rank/position if present
            displayList.sort((a, b) => {
              const rA = parseInt(a.rank || 999, 10);
              const rB = parseInt(b.rank || 999, 10);
              return rA - rB;
            });

            const maxPlayerCount = isBottomGrid ? 12 : 15;
            const rowLimit = Math.min(displayList.length, maxPlayerCount);
            const displayMode = state.displayContent || 'both';

            const lbHtml = displayList.slice(0, rowLimit).map((item, idx) => {
              const rankNum = item.rank || (idx + 1);
              const formattedRank = String(rankNum).padStart(2, '0');
              let rightColText = '';
              let splitText = item.split || '';

              const isGridLiveSplits = (state.gridMode === 'livesplits');

              if (isGridLiveSplits || isLiveTimerMode) {
                rightColText = item.time || '';
              } else {
                rightColText = item.club || item.nat || '';
                splitText = '';
              }

              const fullName = formatAthleteName(item.name || `Athlete #${idx + 1}`, state.nameFormat);
              const isLeader = (rankNum === 1 || String(formattedRank) === '01');

              let deltaText = item.delta || '';
              if (!deltaText && isLiveTimerMode && !isBottomGrid) {
                if (isLeader) {
                  deltaText = 'LEADER';
                }
              }

              const showPlayers = (displayMode === 'both' || displayMode === 'players');
              const showTeams = (displayMode === 'both' || displayMode === 'teams');

              let itemStyle = '';
              if (isBottomGrid) {
                itemStyle = 'grid-template-columns: 42px 1fr !important;';
              }

              let mainContentHtml = '';
              if (displayMode === 'teams') {
                mainContentHtml = `
                  <div class="gfx-athlete-details">
                    <div class="gfx-athlete-name" style="font-size: 14px; font-weight: 900; color: #111111;">${escapeHtml((rightColText || 'HYROX').toUpperCase())}</div>
                  </div>
                `;
              } else {
                mainContentHtml = `
                  <div class="gfx-athlete-details">
                    <div class="gfx-athlete-name">${escapeHtml(fullName)}</div>
                  </div>
                `;
              }

              const isSplitName = /SLED|SKIERG|BURPEE|ROWING|FARMERS|WALL|SANDBAG|ROXZONE|FINISH|RUN|REGISTERED/i.test(rightColText || '');
              const showRightCol = (showTeams && displayMode === 'both' && !isBottomGrid && !isSplitName && rightColText && /^\d{1,2}:\d{2}/.test(rightColText));

              const rightColHtml = showRightCol ? `
                <div class="gfx-time-col">
                  <div class="gfx-time-val">${escapeHtml((rightColText || '').toUpperCase())}</div>
                  ${deltaText ? `<div class="gfx-time-delta ${isLeader ? 'is-leader' : ''}">${escapeHtml(deltaText.toUpperCase())}</div>` : ''}
                </div>
              ` : '';

              return `
                <div class="gfx-lb-item pos-${rankNum}" style="${itemStyle}">
                  <div class="gfx-rank-num">${formattedRank}</div>
                  ${mainContentHtml}
                  ${rightColHtml}
                </div>
              `;
            }).join('');

            if (lbHtml !== lastLeaderboardHtml) {
              listContainer.innerHTML = lbHtml;
              lastLeaderboardHtml = lbHtml;
            }
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
        if (b) b.innerText = `${a.nat || 'IND'}`;
        if (n) n.innerText = formatAthleteName(a.name, state.nameFormat);
        if (m) m.innerText = `${a.club || 'Club'} • Pace: ${a.pace || 'N/A'}`;
        if (tm) tm.innerText = (isTimerEnabled && a.time) ? a.time : '';
      } else {
        lowerThirdEl.classList.add('gfx-hidden');
      }
    }

    // 5. Standalone HYROX Digital Race Clock (Self-Healing Continuous Ticking)
    const raceClockEl = document.getElementById('gfxRaceClock');
    const clockValEl = document.getElementById('gfxClockVal');
    if (raceClockEl) {
      const isRaceClockVisible = !(state.visibleElements && state.visibleElements.raceClock === false);
      if (isRaceClockVisible) {
        raceClockEl.classList.remove('gfx-hidden');
        raceClockEl.className = `gfx-race-clock gfx-animated ${state.raceClockPosition || 'pos-clock-top-right'}`;
        if (clockValEl) {
          const hrs = Math.floor(localRaceClockSec / 3600);
          const mins = String(Math.floor((localRaceClockSec % 3600) / 60)).padStart(2, '0');
          const secs = String(localRaceClockSec % 60).padStart(2, '0');
          const displayTime = hrs > 0 ? `${String(hrs).padStart(2, '0')}:${mins}:${secs}` : `00:${mins}:${secs}`;
          clockValEl.innerText = state.raceClockTime || displayTime;
        }
      } else {
        raceClockEl.classList.add('gfx-hidden');
      }
    }

    // 6. Ticker - Smooth Continuous Marquee
    if (tickerEl) {
      if (state.visibleElements && state.visibleElements.ticker && state.tickerItems && state.tickerItems.length > 0) {
        tickerEl.classList.remove('gfx-hidden');
        const tickerWrapper = document.getElementById('tickerWrapper');
        if (tickerWrapper) {
          const itemsHtml = state.tickerItems.map(item => `
            <div class="gfx-ticker-item">
              <span class="name">${escapeHtml(formatAthleteName(item.name, state.nameFormat))}</span>
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

  function formatAthleteName(nameStr, format) {
    if (!nameStr) return 'Athlete';
    if (!format || format === 'full') return nameStr;

    const parseSingleName = (singleName) => {
      const trimmed = singleName.trim();
      const parts = trimmed.split(/\s+/);
      if (parts.length <= 1) return trimmed;

      const lastName = parts[parts.length - 1];
      const firstName = parts.slice(0, parts.length - 1).join(' ');

      if (format === 'initial') {
        // Handle names that already have initials like R. Sharma
        if (firstName.length === 1 || (firstName.length === 2 && firstName.endsWith('.'))) {
          return `${firstName.charAt(0).toUpperCase()}. ${lastName}`;
        }
        const initial = firstName.charAt(0).toUpperCase();
        return `${initial}. ${lastName}`;
      } else if (format === 'last') {
        return lastName;
      }
      return trimmed;
    };

    if (nameStr.includes('/')) {
      return nameStr.split('/').map(parseSingleName).join('/');
    } else if (nameStr.includes('&')) {
      return nameStr.split('&').map(parseSingleName).join('/');
    } else if (nameStr.toLowerCase().includes(' and ')) {
      return nameStr.split(/ and /i).map(parseSingleName).join('/');
    }

    return parseSingleName(nameStr);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  let localRaceClockSec = 211;
  let lastClockTimeStr = '';

  function applyStateUpdate(incomingPayload) {
    if (!incomingPayload || Object.keys(incomingPayload).length === 0) return;
    const incomingTs = incomingPayload.timestamp || 0;
    
    // Ignore stale updates if we already received a newer state
    if (incomingTs > 0 && incomingTs < lastStateTimestamp) {
      return;
    }
    
    if (incomingTs > 0) {
      lastStateTimestamp = incomingTs;
    }

    const prevPosition = state.position || 'pos-bottom-grid';
    const prevTheme = state.theme || 'theme-starting-list';
    const prevDisplayContent = state.displayContent || 'both';

    state = { ...state, ...incomingPayload };
    
    if (!state.position) state.position = prevPosition;
    if (!state.theme) state.theme = prevTheme;
    if (!state.displayContent) state.displayContent = prevDisplayContent;

    if (state.raceClockTime && state.raceClockTime !== lastClockTimeStr) {
      lastClockTimeStr = state.raceClockTime;
      const parts = state.raceClockTime.split(':').map(Number);
      if (parts.length === 3) localRaceClockSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) localRaceClockSec = parts[0] * 60 + parts[1];
    }

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
      if (saved.includes('SAURABH') || saved.includes('MARCUS VANCE')) {
        localStorage.removeItem('mika_gfx_state');
      } else {
        applyStateUpdate(JSON.parse(saved));
      }
    }
  } catch (e) {}

  render();
  setInterval(() => {
    localRaceClockSec++;
    const hrs = Math.floor(localRaceClockSec / 3600);
    const mins = String(Math.floor((localRaceClockSec % 3600) / 60)).padStart(2, '0');
    const secs = String(localRaceClockSec % 60).padStart(2, '0');
    state.raceClockTime = hrs > 0 ? `${String(hrs).padStart(2, '0')}:${mins}:${secs}` : `00:${mins}:${secs}`;
    render();
  }, 1000);
});

