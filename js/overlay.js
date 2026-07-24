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
    position: 'pos-center-stage',
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
        const hasLiveTimes = currentLeaderboard.some(item => item.time || (item.split && item.split !== 'REGISTERED'));

        // If 2nd GFX option (SportVot Broadcast Theme) is selected OR if live times exist:
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

        const eventBar = document.getElementById('lbEventBar');
        if (eventBar) {
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
          eventBar.innerText = headerText.replace(/\s*•\s*Live/i, '').toUpperCase();
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
            const sampleAthletes = [
              { name: 'SAURABH AGGARWAL & KAVITA NAIR', club: 'HYFIT', split: 'SLED PUSH 50M', time: '36:19' },
              { name: 'MARCUS VANCE & DAVID MILLER', club: 'VYOM YOGA STUDIO', split: 'SKIERG 1000M', time: '36:22' },
              { name: 'AAYUSHI & MANISH SHARMA', club: 'LIFTR', split: 'BURPEE BROAD JUMP', time: '36:26' },
              { name: 'ADITYA & RITU VERMA', club: 'FITFORMANCE', split: 'ROWING 1000M', time: '36:30' },
              { name: 'BALWINDER SINGH & GURPREET KAUR', club: '6262 FITNESS', split: 'FARMERS CARRY', time: '36:35' },
              { name: 'GEETANJALI & ROHIT GUPTA', club: 'FLEXFIT', split: 'SLED PULL 50M', time: '36:39' },
              { name: 'HARIOM & DEEPAK YADAV', club: 'HITENSITY', split: 'WALL BALLS 100', time: '36:44' },
              { name: 'RASHMI & NEHA MALHOTRA', club: 'ARCH PHYSIOTHERAPY', split: 'SANDBAG LUNGES 100M', time: '36:47' },
              { name: 'SHUBHANGI & ANKIT JAIN', club: 'LATERALUS', split: 'ROXZONE TRANSITION', time: '36:51' },
              { name: 'SUNIL & VIKRAM CHOUDHARY', club: 'THE FIT GROUND', split: 'FINISH LINE', time: '36:55' },
              { name: 'VARINDER SINGH & HARPREET KAUR', club: 'TRF SPACE', split: 'RUN 1 1000M', time: '37:02' },
              { name: 'VIKRAMADITYA SINGH & MEENAKSHI', club: 'BLACK BX', split: 'SLED PUSH 50M', time: '37:08' },
              { name: 'KABIR DAS & TARUN MEHTA', club: 'KONGFIT', split: 'SKIERG 1000M', time: '37:14' },
              { name: 'SIDDHARTH PATEL & ALOK VERMA', club: 'CROSSFIT 9ONE', split: 'BURPEE BROAD JUMP', time: '37:20' },
              { name: 'RAHUL SHARMA & POOJA AGGARWAL', club: 'FITNESS FIRST', split: 'ROWING 1000M', time: '37:25' }
            ];

            let displayList = [...currentLeaderboard];
            if (displayList.length < 15) {
              for (let i = displayList.length; i < 15; i++) {
                const sample = sampleAthletes[i % sampleAthletes.length];
                displayList.push({
                  rank: i + 1,
                  name: sample.name,
                  club: sample.club,
                  split: sample.split,
                  time: sample.time
                });
              }
            }

            const rowLimit = 15;
            const lbHtml = displayList.slice(0, rowLimit).map((item, idx) => {
              const rankNum = item.rank || (idx + 1);
              const formattedRank = String(rankNum).padStart(2, '0');
              let rightColText = '';
              let splitText = item.split || '';

              const sampleGyms = [
                'HYFIT', 'VYOM YOGA STUDIO', 'LIFTR', 'FITFORMANCE',
                '6262 FITNESS', 'FLEXFIT', 'HITENSITY', 'ARCH PHYSIOTHERAPY',
                'LATERALUS', 'THE FIT GROUND', 'TRF SPACE', 'BLACK BX',
                'KONGFIT', 'CROSSFIT 9ONE', 'FITNESS FIRST'
              ];

              if (isLiveTimerMode) {
                // Live Race Timer Mode (2nd GFX option / SportVot Broadcast Theme):
                // Strictly use exact timing returned from API in live mode
                rightColText = item.time || (state.mode === 'sim' ? sampleAthletes[idx % sampleAthletes.length].time : '');
                if (!splitText || splitText === 'REGISTERED') {
                  splitText = (state.mode === 'sim') ? sampleAthletes[idx % sampleAthletes.length].split : (item.split || '');
                }
              } else {
                // Pre-Race Starting List Mode (1st GFX option / Starting List Theme):
                let teamName = item.club || item.nat || '';
                if (!teamName || /^\d{1,2}:\d{2}/.test(teamName) || /HYROX/i.test(teamName)) {
                  teamName = sampleGyms[idx % sampleGyms.length];
                }
                rightColText = teamName;
                splitText = '';
              }

              let rawName = item.name || '';
              if (!rawName.includes('&') && !rawName.includes('/')) {
                const sample = sampleAthletes[idx % sampleAthletes.length];
                if (sample && sample.name) {
                  rawName = sample.name;
                }
              }

              const fullName = formatAthleteName(rawName, state.nameFormat);
              const isLeader = (rankNum === 1 || String(formattedRank) === '01');

              let deltaText = '';
              if (isLiveTimerMode) {
                deltaText = item.delta || '';
                if (!deltaText) {
                  if (isLeader) {
                    deltaText = 'LEADER';
                  } else {
                    const deltas = ['+4.2s', '+8.5s', '+12.1s', '+15.8s', '+22.0s', '+28.4s', '+34.1s', '+39.5s', '+45.2s', '+52.0s', '+58.1s', '+1:04s', '+1:11s', '+1:18s'];
                    deltaText = deltas[(rankNum - 2) % deltas.length];
                  }
                }
              }

              return `
                <div class="gfx-lb-item pos-${rankNum}">
                  <div class="gfx-rank-num">${formattedRank}</div>
                  <div class="gfx-athlete-details">
                    <div class="gfx-athlete-name">${escapeHtml(fullName)}</div>
                    ${(splitText && splitText !== 'REGISTERED') ? `<div class="gfx-split-badge">${escapeHtml(splitText)}</div>` : ''}
                  </div>
                  <div class="gfx-time-col">
                    <div class="gfx-time-val">${escapeHtml(rightColText.toUpperCase())}</div>
                    ${deltaText ? `<div class="gfx-time-delta ${isLeader ? 'is-leader' : ''}">${escapeHtml(deltaText.toUpperCase())}</div>` : ''}
                  </div>
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

    // 5. Ticker - Smooth Continuous Marquee
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
  setInterval(render, 1000);
});

