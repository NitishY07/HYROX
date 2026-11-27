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
    mode: 'live',
    startTimeMs: null,
    isRaceStarted: false,
    theme: 'theme-starting-list',
    position: 'pos-bottom-grid',
    raceClockPosition: 'pos-clock-top-left',
    raceClockTime: '00:00:00',
    displayContent: 'both',
    nameFormat: 'full',
    visibleElements: {
      banner: false,
      leaderboard: true,
      lowerThird: false,
      ticker: true,
      raceClock: true
    },
    meetingInfo: {
      title: 'GUJARAT - 27.11.2026 - DAY 2',
      meta: 'Battle of Gyms • Live',
      category: 'Battle of Gyms',
      eventTitle: 'Battle of Gyms',
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

  function parseHyroxZone(splitStr) {
    if (!splitStr) return null;
    const s = String(splitStr).toLowerCase().trim();
    if (s.includes('ski')) return { num: '01', name: 'SKIERG' };
    if (s.includes('push')) return { num: '02', name: 'SLED PUSH' };
    if (s.includes('pull')) return { num: '03', name: 'SLED PULL' };
    if (s.includes('burpee') || s.includes('broad')) return { num: '04', name: 'BURPEES' };
    if (s.includes('row')) return { num: '05', name: 'ROWERG' };
    if (s.includes('farm') || s.includes('carry')) return { num: '06', name: 'FARMERS CARRY' };
    if (s.includes('sandbag') || s.includes('lunge')) return { num: '07', name: 'SANDBAG LUNGES' };
    if (s.includes('wall') || s.includes('ball')) return { num: '08', name: 'WALL BALLS' };
    if (s.includes('finish') || s.includes('total') || s.includes('ziel')) return { num: 'FI', name: 'FINISH' };
    if (s.includes('rox')) return { num: 'RX', name: 'ROXZONE' };
    if (s.includes('run')) return { num: 'RN', name: splitStr.toUpperCase() };
    return { num: '', name: splitStr.toUpperCase() };
  }

  // Format numbers with zero-padded plain digits (no slashed-zero)
  // Result: 01, 02 … 09 | 10, 11, 12
  function formatSlashedNum(numStr) {
    if (!numStr && numStr !== 0) return '';
    const str = String(numStr).trim();
    if (str.length === 1) {
      return '0' + str;
    }
    return str;
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

    const isTimerEnabled = !(state.visibleElements && state.visibleElements.showTimer === false);
    const isClubsEnabled = !state.visibleElements || state.visibleElements.showClubs !== false;

    // Dynamic clock calculation ONLY in SIM mode
    let currentLeaderboard = state.leaderboard || [];
    if (state.mode === 'sim' && isTimerEnabled && state.gridMode !== 'livesplits') {
      let baseElapsed = 0;
      if (state.startTimeMs) {
        baseElapsed = Math.floor((Date.now() - state.startTimeMs) / 1000);
      } else {
        const p = (state.raceClockTime || '00:00').split(':').map(Number);
        baseElapsed = p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p[0]*60 + p[1];
      }
      currentLeaderboard = currentLeaderboard.map((item, index) => {
        const itemSec = Math.max(0, baseElapsed + (index * 4.2));
        return { ...item, time: formatTime(itemSec) };
      });
    }

    // 3. Leaderboard
    if (leaderboardEl) {
      if (state.visibleElements && state.visibleElements.leaderboard) {
        leaderboardEl.classList.remove('gfx-hidden');
        const isStartingListTheme = (state.theme === 'theme-starting-list');
        const isSignatureBroadcastTheme = (state.theme !== 'theme-starting-list');
        const isBottomGrid = (state.position === 'pos-bottom-grid');
        const isStartlistGrid = (state.gridMode === 'startlist');
        const hasLiveTimes = currentLeaderboard.some(item => item.time && item.time !== '00:00' && item.time !== '00:00:00');
        const isRaceLive = !isStartlistGrid && !!(state.isRaceStarted || hasLiveTimes);

        // Determine mode: live timer only if race is live and timer is enabled
        const isLiveTimerMode = isRaceLive && isTimerEnabled;

        if (isLiveTimerMode) {
          leaderboardEl.classList.remove('mode-team');
          leaderboardEl.classList.add('mode-timer');
        } else {
          leaderboardEl.classList.remove('mode-timer');
          leaderboardEl.classList.add('mode-team');
        }

        const catBadge = document.getElementById('lbCategory');
        if (catBadge) {
          if (isLiveTimerMode) {
            catBadge.innerText = 'TIME';
            catBadge.style.display = '';
          } else if (isClubsEnabled) {
            catBadge.innerText = 'TEAM';
            catBadge.style.display = '';
          } else {
            catBadge.style.display = 'none';
          }
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
            let zoneHtml = `<span class="gfx-grid-station-pill">STARTING LIST</span>`;
            if (!isStartlistGrid && isRaceLive && currentLeaderboard && currentLeaderboard.length > 0) {
              const activeItem = currentLeaderboard.find(item => item.split && item.split !== 'REGISTERED' && item.split !== '-') || currentLeaderboard[0];
              const activeSplit = state.currentStation || activeItem?.split || activeItem?.checkpoint;
              const zone = parseHyroxZone(activeSplit);
              if (zone) {
                if (zone.num && zone.name) {
                  zoneHtml = `<div class="gfx-grid-station-num">${formatSlashedNum(zone.num)}</div><div class="gfx-grid-station-pill">${zone.name}</div>`;
                } else {
                  zoneHtml = `<span class="gfx-grid-station-pill">${zone.name}</span>`;
                }
              } else {
                zoneHtml = `<span class="gfx-grid-station-pill">RACE IN PROGRESS</span>`;
              }
            }
            eventBar.innerHTML = zoneHtml;
          } else {
            if (!isStartlistGrid && isRaceLive && currentLeaderboard && currentLeaderboard.length > 0) {
              const activeItem = currentLeaderboard.find(item => item.split && item.split !== 'REGISTERED' && item.split !== '-') || currentLeaderboard[0];
              const activeSplit = state.currentStation || activeItem?.split || activeItem?.checkpoint;
              const zone = parseHyroxZone(activeSplit);
              if (zone) {
                eventBar.innerText = zone.num ? `${zone.num} ${zone.name}` : zone.name;
              } else {
                eventBar.innerText = 'RACE IN PROGRESS';
              }
            } else {
              eventBar.innerText = headerText.toUpperCase();
            }
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
            
            // Sort dynamically by fastest timer first (when times are present), then by rank
            const parseTimeSec = (tStr) => {
              if (!tStr || !/^\d{1,2}:\d{2}/.test(String(tStr).trim())) return Number.MAX_SAFE_INTEGER;
              const parts = String(tStr).trim().split(':').map(Number);
              if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
              if (parts.length === 2) return parts[0] * 60 + parts[1];
              return Number.MAX_SAFE_INTEGER;
            };
            displayList.sort((a, b) => {
              const tA = parseTimeSec(a.time);
              const tB = parseTimeSec(b.time);
              if (tA !== tB) return tA - tB;
              const rA = parseInt(a.rank || 999, 10);
              const rB = parseInt(b.rank || 999, 10);
              return rA - rB;
            });

            const maxPlayerCount = isBottomGrid ? 12 : 20;
            const rowLimit = Math.min(displayList.length, maxPlayerCount);
            const displayMode = state.displayContent || 'both';

            const lbHtml = displayList.slice(0, rowLimit).map((item, idx) => {
              const rankNum = hasLiveTimes ? (idx + 1) : (item.rank || (idx + 1));
              const formattedRank = String(rankNum).padStart(2, '0');
              let rightColText = '';
              let splitText = item.split || '';

              const isGridLiveSplits = (state.gridMode === 'livesplits');
              const showTimeCol = !isStartlistGrid && (isGridLiveSplits || isLiveTimerMode || !!(item.time && item.time !== '00:00' && item.time !== '00:00:00')) && isTimerEnabled;

              if (showTimeCol) {
                rightColText = item.time || (item.split && item.split !== 'REGISTERED' ? item.split : '');
              } else {
                rightColText = isClubsEnabled ? (item.club || item.nat || '') : '';
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
                itemStyle = (showTimeCol && rightColText) ? 'grid-template-columns: 42px 1fr 100px !important;' : 'grid-template-columns: 42px 1fr !important;';
              } else {
                itemStyle = ((showTimeCol || isClubsEnabled) && rightColText) ? 'grid-template-columns: 46px 1fr 115px !important;' : 'grid-template-columns: 46px 1fr !important;';
              }

              let mainContentHtml = '';
              if (displayMode === 'teams') {
                const teamLabel = isClubsEnabled ? (rightColText || item.club || 'HYROX') : 'HYROX';
                mainContentHtml = `
                  <div class="gfx-athlete-details">
                    <div class="gfx-athlete-name" style="font-size: 14px; font-weight: 900; color: #111111;">${escapeHtml(teamLabel.toUpperCase())}</div>
                  </div>
                `;
              } else if (displayMode === 'both' && !showTimeCol && isClubsEnabled && item.club && !isBottomGrid) {
                mainContentHtml = `
                  <div class="gfx-athlete-details" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div class="gfx-athlete-name">${escapeHtml(fullName)}</div>
                    <span class="gfx-athlete-team" style="color:#666; font-size:11px; font-weight:700; text-transform:uppercase; margin-left:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.club)}</span>
                  </div>
                `;
              } else {
                mainContentHtml = `
                  <div class="gfx-athlete-details">
                    <div class="gfx-athlete-name">${escapeHtml(fullName)}</div>
                  </div>
                `;
              }

              const timeColHtml = (showTimeCol && rightColText) ? `
                <div class="gfx-time-col" style="display:flex !important; align-items:center; justify-content:center; background:#e8e8e8; border-left:2px solid #ccc; padding:0 8px;">
                  <span class="gfx-time-val" style="font-family: 'BrutalType', 'Brutel', sans-serif; font-weight:900; font-size:16px; color:#111; letter-spacing:0.5px;">${escapeHtml(rightColText)}</span>
                </div>
              ` : '';

              return `
                <div class="gfx-lb-item pos-${rankNum}" style="${itemStyle}">
                  <div class="gfx-rank-num">${formatSlashedNum(formattedRank)}</div>
                  ${mainContentHtml}
                  ${timeColHtml}
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
      const isVerticalVisible = state.visibleElements && state.visibleElements.leaderboard && state.position === 'pos-top-left';
      const isRaceClockVisible = !(state.visibleElements && state.visibleElements.raceClock === false) && !isVerticalVisible;
      if (isRaceClockVisible) {
        raceClockEl.classList.remove('gfx-hidden');
        const clockPos = state.raceClockPosition || (state.position === 'pos-bottom-grid' ? 'pos-clock-top-left' : 'pos-clock-top-right');
        raceClockEl.className = `gfx-race-clock gfx-animated ${clockPos}`;
        if (clockValEl) {
          const hrs = Math.floor(localRaceClockSec / 3600);
          const mins = String(Math.floor((localRaceClockSec % 3600) / 60)).padStart(2, '0');
          const secs = String(localRaceClockSec % 60).padStart(2, '0');
          const displayTime = hrs > 0 ? `${String(hrs).padStart(2, '0')}:${mins}:${secs}` : `00:${mins}:${secs}`;
          clockValEl.innerText = displayTime;
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
    
    if (!format || format === 'full') {
      if (nameStr.includes('/')) {
        return nameStr.split('/').map(p => p.trim()).join(' / ');
      }
      return nameStr;
    }

    const parseSingleName = (singleName) => {
      const trimmed = singleName.trim();
      const parts = trimmed.split(/\s+/);
      if (parts.length <= 1) return { first: '', last: trimmed, full: trimmed };

      const lastName = parts[parts.length - 1];
      const firstName = parts.slice(0, parts.length - 1).join(' ');
      return { first: firstName, last: lastName, full: trimmed };
    };

    if (nameStr.includes('/') || nameStr.includes('&') || nameStr.toLowerCase().includes(' and ')) {
      const delimiter = nameStr.includes('/') ? '/' : (nameStr.includes('&') ? '&' : / and /i);
      const rawParts = nameStr.split(delimiter).map(p => p.trim());
      if (rawParts.length === 2) {
        const p1 = parseSingleName(rawParts[0]);
        const p2 = parseSingleName(rawParts[1]);

        if (format === 'last') {
          // If both athletes share the exact same last name, avoid redundant "THAKKAR & THAKKAR"
          if (p1.last.toLowerCase() === p2.last.toLowerCase() && p1.first && p2.first) {
            return `${p1.first} & ${p2.first} ${p1.last}`;
          }
          return `${p1.last} & ${p2.last}`;
        } else if (format === 'initial') {
          const init1 = p1.first ? `${p1.first.charAt(0).toUpperCase()}. ` : '';
          const init2 = p2.first ? `${p2.first.charAt(0).toUpperCase()}. ` : '';
          if (p1.last.toLowerCase() === p2.last.toLowerCase() && init1 && init2) {
            return `${init1}& ${init2}${p1.last}`;
          }
          return `${init1}${p1.last} & ${init2}${p2.last}`;
        }
      }
    }

    const single = parseSingleName(nameStr);
    if (format === 'last') return single.last;
    if (format === 'initial' && single.first) return `${single.first.charAt(0).toUpperCase()}. ${single.last}`;
    return single.full;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  let localRaceClockSec = 0;
  let lastClockTimeStr = '';

  function applyStateUpdate(incomingPayload) {
    if (!incomingPayload || Object.keys(incomingPayload).length === 0) return;
    
    const prevPosition = state.position || 'pos-bottom-grid';
    const prevTheme = state.theme || 'theme-starting-list';
    const prevDisplayContent = state.displayContent || 'both';

    state = { 
      ...state, 
      ...incomingPayload,
      visibleElements: {
        ...(state.visibleElements || {}),
        ...(incomingPayload.visibleElements || {})
      }
    };
    
    if (!state.position) state.position = prevPosition;
    if (!state.theme) state.theme = prevTheme;
    if (!state.displayContent) state.displayContent = prevDisplayContent;

    if (state.startTimeMs && state.isRaceStarted) {
      // Live race: derive clock from wall-clock start timestamp
      localRaceClockSec = Math.max(0, Math.floor((Date.now() - state.startTimeMs) / 1000));
    } else if (state.raceClockTime && state.raceClockTime !== '00:00:00') {
      // Finished race or API-set time: always accept the latest value
      const parts = state.raceClockTime.split(':').map(Number);
      if (parts.length === 3) localRaceClockSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) localRaceClockSec = parts[0] * 60 + parts[1];
      lastClockTimeStr = state.raceClockTime;
    }

    if (!state.isRaceStarted && state.mode !== 'manual') {
      localRaceClockSec = 0;
      state.raceClockTime = '00:00:00';
      lastClockTimeStr = '';
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
    if (state.isRaceStarted || state.mode === 'manual') {
      if (state.startTimeMs && state.isRaceStarted) {
        // Live running race: derive from wall-clock
        localRaceClockSec = Math.max(0, Math.floor((Date.now() - state.startTimeMs) / 1000));
        const hrs = Math.floor(localRaceClockSec / 3600);
        const mins = String(Math.floor((localRaceClockSec % 3600) / 60)).padStart(2, '0');
        const secs = String(localRaceClockSec % 60).padStart(2, '0');
        state.raceClockTime = hrs > 0 ? `${String(hrs).padStart(2, '0')}:${mins}:${secs}` : `00:${mins}:${secs}`;
      }
      // If no startTimeMs (finished race), keep showing the last known raceClockTime without incrementing
    } else {
      localRaceClockSec = 0;
      state.raceClockTime = '00:00:00';
    }
    render();
  }, 1000);
});








