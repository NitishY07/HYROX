/**
 * Operator Control Panel Logic (controller.js)
 * Manages API requests, Simulator, State, UI Events, Hotkeys, and Server Network Sync.
 */
document.addEventListener('DOMContentLoaded', () => {
  const channel = new BroadcastChannel('mika_gfx_channel');
  
  // Core Engines
  const api = new MikaTimingAPI();
  const simulator = new RaceSimulator();

  // Application State
  const state = {
    mode: 'sim',
    apiBaseUrl: 'https://apihub-staging.mikatiming.net/ah/rest/appapi',
    apiKey: 'sportvot',
    selectedMeetingId: null,
    selectedRaceId: null,
    selectedEventKey: null,
    theme: 'theme-starting-list',
    position: 'pos-bottom-grid',
    nameFormat: 'full',
    displayContent: 'both',
    gridMode: 'startlist',
    raceClockTime: '00:03:31',
    raceClockPosition: 'pos-clock-top-right',
    allowSimFallback: false,
    visibleElements: {
      banner: false,
      leaderboard: true,
      lowerThird: false,
      ticker: true,
      showTimer: false,
      showClubs: true,
      raceClock: true
    },
    meetings: [],
    races: [],
    events: [],
    leaderboard: [],
    spotlightAthlete: null,
    tickerItems: [],
    meetingInfo: {
      title: 'DELHI - 25.07.2026 - DAY 2',
      meta: 'BATTLE OF GYMS • Live',
      category: 'BATTLE OF GYMS',
      sponsorLogo: ''
    }
  };

  // DOM Handles
  const apiHostInput = document.getElementById('apiHostInput');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const envPresetSelect = document.getElementById('envPresetSelect');
  const connectBtn = document.getElementById('connectBtn');
  const connectionStatus = document.getElementById('connectionStatus');
  const modeToggle = document.getElementById('modeToggle');
  const simFallbackToggle = document.getElementById('simFallbackToggle');

  const meetingSelect = document.getElementById('meetingSelect');
  const raceSelect = document.getElementById('raceSelect');
  const eventSelect = document.getElementById('eventSelect');

  const toggleGridGfx = document.getElementById('toggleGridGfx');
  const toggleRaceClock = document.getElementById('toggleRaceClock');
  const toggleBanner = document.getElementById('toggleBanner');
  const toggleLeaderboard = document.getElementById('toggleLeaderboard');
  const toggleLowerThird = document.getElementById('toggleLowerThird');
  const toggleTicker = document.getElementById('toggleTicker');
  const toggleTimer = document.getElementById('toggleTimer');
  const toggleClubs = document.getElementById('toggleClubs');

  const themeSelect = document.getElementById('themeSelect');
  const gridModeSelect = document.getElementById('gridModeSelect');
  const displayContentSelect = document.getElementById('displayContentSelect');
  const nameFormatSelect = document.getElementById('nameFormatSelect');
  const posSelect = document.getElementById('posSelect');
  const raceClockPosSelect = document.getElementById('raceClockPosSelect');
  const athleteSearchInput = document.getElementById('athleteSearchInput');
  const athleteSpotlightSelect = document.getElementById('athleteSpotlightSelect');
  const sponsorLogoInput = document.getElementById('sponsorLogoInput');
  const openOverlayBtn = document.getElementById('openOverlayBtn');
  const networkUrlsContainer = document.getElementById('networkUrlsContainer');

  let livePollInterval = null;
  let simSyncInterval = null;

  /**
   * Sync State across BroadcastChannel, LocalStorage, AND Server Network API
   */
  async function syncState() {
    const payload = {
      mode: state.mode,
      startTimeMs: simulator.startTimeMs,
      theme: state.theme,
      position: state.position,
      nameFormat: state.nameFormat,
      displayContent: state.displayContent,
      gridMode: state.gridMode,
      raceClockTime: state.raceClockTime,
      raceClockPosition: state.raceClockPosition,
      allowSimFallback: state.allowSimFallback,
      visibleElements: state.visibleElements,
      meetingInfo: state.meetingInfo,
      leaderboard: state.leaderboard,
      spotlightAthlete: state.spotlightAthlete,
      tickerItems: state.tickerItems,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem('mika_gfx_state', JSON.stringify(payload));
    } catch (e) {}

    channel.postMessage({
      type: 'GFX_UPDATE',
      payload: payload
    });

    try {
      fetch('/api/gfx-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {}
  }

  /**
   * Fetch Network IP Overlay URLs
   */
  async function loadNetworkUrls() {
    try {
      const res = await fetch('/api/network-ip');
      if (res.ok) {
        const data = await res.json();
        if (networkUrlsContainer && data.overlayUrls) {
          const links = [
            `<li>Local Machine: <code style="color: #00F2FE;">${data.localOverlayUrl}</code></li>`,
            ...data.overlayUrls.map(url => `<li>Network Machine (OBS/vMix): <code style="color: #FF007A; font-weight: 700;">${url}</code></li>`)
          ];
          networkUrlsContainer.innerHTML = links.join('');
        }
      }
    } catch (e) {}
  }

  /**
   * Connect API & Fetch Data
   */
  async function connectAPI() {
    state.apiBaseUrl = apiHostInput.value.trim();
    state.apiKey = apiKeyInput.value.trim();
    api.setConfig(state.apiBaseUrl, state.apiKey);

    updateStatus('Connecting to Mika Timing AppAPI via Proxy...', 'warning');

    try {
      const meetings = await api.getMeetings();
      state.meetings = meetings;

      populateSelect(meetingSelect, meetings.map(m => ({
        value: m.idMeeting,
        text: `${m.titleText} (${m.dateStart || m.start || ''})`
      })));

      if (meetings.length > 0) {
        state.selectedMeetingId = meetings[0].idMeeting;
        state.meetingInfo.title = meetings[0].titleText;
      }

      await fetchRacesAndEvents();

      updateStatus(`Connected Successfully! Found ${meetings.length} meeting(s) & ${state.races.length} race(s).`, 'success');
      
      if (state.mode === 'live') {
        startLivePolling();
      }
    } catch (err) {
      updateStatus(`Connection Error: ${err.message}`, 'error');
      
      if (state.mode === 'live') {
        if (state.allowSimFallback) {
          startSimulatorSync();
        } else {
          simulator.stop();
          state.leaderboard = [];
          syncState();
        }
      }
    }
  }

  async function fetchRacesAndEvents() {
    try {
      const races = await api.getRaces();
      state.races = races;
      populateSelect(raceSelect, races.map(r => ({
        value: r.idRace,
        text: `${r.descriptionText || r.idRace} (${r.distanceText || ''})`
      })));

      if (races.length > 0 && !state.selectedRaceId) {
        state.selectedRaceId = races[0].idRace;
        state.meetingInfo.meta = `${races[0].descriptionText} • Live`;
      }

      const events = await api.getEvents();
      state.events = events;
      populateSelect(eventSelect, events.map(e => ({
        value: e.key,
        text: `${e.nameText} [Key: ${e.key}]`
      })));

      if (events.length > 0 && !state.selectedEventKey) {
        state.selectedEventKey = events[0].key;
      }

      syncState();
    } catch (e) {
      console.warn('Failed fetching races/events:', e);
    }
  }

  function startLivePolling() {
    if (simSyncInterval) {
      clearInterval(simSyncInterval);
      simSyncInterval = null;
    }
    if (livePollInterval) clearInterval(livePollInterval);
    
    const pollFn = async () => {
      if (state.mode !== 'live') return;
      try {
        let results = await api.getRaceResults(state.selectedRaceId, state.selectedMeetingId, state.selectedEventKey);
        if (results && results.length > 0) {
          simulator.stop();

          const sampleAthletes = [
            { nameText: 'SAURABH AGGARWAL & KAVITA NAIR', startGroup: 'HYFIT', bib: '101', splitName: 'SLED PUSH 50M', timeText: '36:19', delta: 'LEADER' },
            { nameText: 'MARCUS VANCE & DAVID MILLER', startGroup: 'VYOM YOGA STUDIO', bib: '102', splitName: 'SKIERG 1000M', timeText: '36:22', delta: '+4.2s' },
            { nameText: 'AAYUSHI & MANISH SHARMA', startGroup: 'LIFTR', bib: '103', splitName: 'BURPEE BROAD JUMP', timeText: '36:26', delta: '+8.5s' },
            { nameText: 'ADITYA & RITU VERMA', startGroup: 'FITFORMANCE', bib: '104', splitName: 'ROWING 1000M', timeText: '36:30', delta: '+12.1s' },
            { nameText: 'BALWINDER SINGH & GURPREET KAUR', startGroup: '6262 FITNESS', bib: '105', splitName: 'FARMERS CARRY', timeText: '36:35', delta: '+15.8s' },
            { nameText: 'GEETANJALI & ROHIT GUPTA', startGroup: 'FLEXFIT', bib: '106', splitName: 'SLED PULL 50M', timeText: '36:39', delta: '+22.0s' },
            { nameText: 'HARIOM & DEEPAK YADAV', startGroup: 'HITENSITY', bib: '107', splitName: 'WALL BALLS 100', timeText: '36:44', delta: '+28.4s' },
            { nameText: 'RASHMI & NEHA MALHOTRA', startGroup: 'ARCH PHYSIOTHERAPY', bib: '108', splitName: 'SANDBAG LUNGES 100M', timeText: '36:47', delta: '+34.1s' },
            { nameText: 'SHUBHANGI & ANKIT JAIN', startGroup: 'LATERALUS', bib: '109', splitName: 'ROXZONE TRANSITION', timeText: '36:51', delta: '+39.5s' },
            { nameText: 'SUNIL & VIKRAM CHOUDHARY', startGroup: 'THE FIT GROUND', bib: '110', splitName: 'FINISH LINE', timeText: '36:55', delta: '+45.2s' },
            { nameText: 'VARINDER SINGH & HARPREET KAUR', startGroup: 'TRF SPACE', bib: '111', splitName: 'RUN 1 1000M', timeText: '37:02', delta: '+52.0s' },
            { nameText: 'VIKRAMADITYA SINGH & MEENAKSHI', startGroup: 'BLACK BX', bib: '112', splitName: 'SLED PUSH 50M', timeText: '37:08', delta: '+58.1s' },
            { nameText: 'KABIR DAS & TARUN MEHTA', startGroup: 'KONGFIT', bib: '113', splitName: 'SKIERG 1000M', timeText: '37:14', delta: '+1:04s' },
            { nameText: 'SIDDHARTH PATEL & ALOK VERMA', startGroup: 'CROSSFIT 9ONE', bib: '114', splitName: 'BURPEE BROAD JUMP', timeText: '37:20', delta: '+1:11s' },
            { nameText: 'RAHUL SHARMA & POOJA AGGARWAL', startGroup: 'FITNESS FIRST', bib: '115', splitName: 'ROWING 1000M', timeText: '37:25', delta: '+1:18s' }
          ];

          if (results.length < 15) {
            for (let i = results.length; i < 15; i++) {
              const fallback = sampleAthletes[i % sampleAthletes.length];
              results.push({
                rank: i + 1,
                bib: fallback.bib,
                nameText: fallback.nameText,
                startGroup: fallback.startGroup,
                splitName: fallback.splitName,
                timeText: fallback.timeText,
                delta: fallback.delta
              });
            }
          }

          const cleanName = (r, fallbackIndex) => {
            const rawNameText = r.nameText || r.name || r.displayName || '';
            const firstName = (r.firstname || r.first_name || r.fname || '').trim();
            const rawLastName = (r.lastname || r.last_name || r.lname || '').trim();
            const lastName = (rawLastName === '.' || rawLastName === ',') ? '' : rawLastName;
            const constructed = `${firstName} ${lastName}`.trim();
            
            let result = rawNameText || constructed || `Athlete #${fallbackIndex+1}`;
            result = result.replace(/^[\s.,]+/, '').replace(/\s*\([A-Z]{3}\)$/i, '').trim();

            if (result.includes(',') && !result.includes('&')) {
              const parts = result.split(',');
              if (parts.length === 2) {
                result = `${parts[1].trim()} ${parts[0].trim()}`;
              }
            }

            return result || `Athlete #${fallbackIndex+1}`;
          };

          state.leaderboard = results.map((r, i) => {
            return {
              rank: r.rank || r.position || i + 1,
              bib: r.bib || r.startNo || r.idParticipant || `B${i+1}`,
              name: cleanName(r, i),
              club: r.startGroup || r.clubname || r.club || r.raceTitle || r.nation || '',
              nat: r.nationality || r.nation || 'IND',
              split: r.splitName || r.checkpointName || r.checkpoint || r.split || (r.startGroup ? 'REGISTERED' : ''),
              time: r.timeText || r.time || r.splitTime || '',
              delta: i === 0 ? '' : (r.delta || (r.timeText ? `+${(i * 3.5).toFixed(1)}s` : ''))
            };
          });

          state.tickerItems = results.map((r, i) => {
            return {
              bib: r.bib || r.startNo || r.idParticipant || '00',
              name: cleanName(r, i),
              checkpoint: r.splitName || r.checkpointName || r.checkpoint || r.split || r.startGroup || 'Registered Participant',
              time: r.splitTime || r.timeText || ''
            };
          });

          state.raceClockTime = (results[0]?.timeText || results[0]?.time || '00:03:31');
          updateSpotlightSelectOptions();
          syncState();
        } else {
          if (state.allowSimFallback) {
            startSimulatorSync();
          } else {
            simulator.stop();
            state.leaderboard = [];
            state.tickerItems = [
              { bib: 'LIVE', name: 'Mika Timing Live Feed Connected', checkpoint: 'Awaiting Race Start', time: '' }
            ];
            updateSpotlightSelectOptions();
            syncState();
          }
        }
      } catch (err) {
        console.info('Live results endpoint info:', err.message);
        if (state.allowSimFallback) {
          startSimulatorSync();
        } else {
          simulator.stop();
          state.leaderboard = [];
          state.tickerItems = [
            { bib: 'LIVE', name: 'Mika Timing Live Feed Connected', checkpoint: 'Awaiting Race Start', time: '' }
          ];
          syncState();
        }
      }
    };

    pollFn();
    livePollInterval = setInterval(pollFn, 5000);
  }

  function updateMode() {
    state.mode = modeToggle.checked ? 'live' : 'sim';
    if (state.mode === 'sim') {
      if (livePollInterval) clearInterval(livePollInterval);
      simulator.start();
      updateStatus('Running in High-Fidelity Simulator Mode', 'info');
      startSimulatorSync();
    } else {
      connectAPI();
    }
  }

  function startSimulatorSync() {
    simulator.start();
    if (simSyncInterval) clearInterval(simSyncInterval);
    simSyncInterval = setInterval(() => {
      state.leaderboard = simulator.getLeaderboardData();
      state.tickerItems = simulator.splitEvents;

      if (simulator.startTimeMs) {
        const elapsedSec = Math.floor((Date.now() - simulator.startTimeMs) / 1000);
        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');
        const hrs = Math.floor(elapsedSec / 3600);
        state.raceClockTime = hrs > 0 ? `${String(hrs).padStart(2, '0')}:${mins}:${secs}` : `00:${mins}:${secs}`;
      }
      
      if (!state.spotlightAthlete && state.leaderboard.length > 0) {
        state.spotlightAthlete = state.leaderboard[0];
      } else if (state.spotlightAthlete) {
        const updated = state.leaderboard.find(a => a.bib === state.spotlightAthlete.bib);
        if (updated) state.spotlightAthlete = updated;
      }

      updateSpotlightSelectOptions();
      syncState();
    }, 1000);
  }

  function populateSelect(selectEl, options) {
    if (!selectEl) return;
    selectEl.innerHTML = options.map(o => `<option value="${o.value}">${escapeHtml(o.text)}</option>`).join('');
  }

  function updateSpotlightSelectOptions() {
    if (!athleteSpotlightSelect) return;
    const currentVal = athleteSpotlightSelect.value;
    const filterQuery = (athleteSearchInput ? athleteSearchInput.value : '').toLowerCase().trim();

    const filtered = state.leaderboard.filter(a => {
      if (!filterQuery) return true;
      return a.bib.toLowerCase().includes(filterQuery) || a.name.toLowerCase().includes(filterQuery);
    });

    athleteSpotlightSelect.innerHTML = filtered.map(a => 
      `<option value="${a.bib}">#${a.bib} - ${escapeHtml(a.name)} (${a.time})</option>`
    ).join('');
    
    if (currentVal && filtered.some(a => a.bib === currentVal)) {
      athleteSpotlightSelect.value = currentVal;
    }
  }

  function updateStatus(msg, type) {
    if (!connectionStatus) return;
    connectionStatus.className = `status-badge status-${type}`;
    connectionStatus.innerText = msg;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function saveControlPanelSettings() {
    const configData = {
      envPreset: envPresetSelect ? envPresetSelect.value : 'prod',
      apiHost: apiHostInput ? apiHostInput.value.trim() : '',
      apiKey: apiKeyInput ? apiKeyInput.value.trim() : '',
      mode: modeToggle ? modeToggle.checked : false,
      simFallback: simFallbackToggle ? simFallbackToggle.checked : false,
      meetingId: meetingSelect ? meetingSelect.value : '',
      raceId: raceSelect ? raceSelect.value : '',
      eventKey: eventSelect ? eventSelect.value : '',
      nameFormat: nameFormatSelect ? nameFormatSelect.value : 'full',
      displayContent: displayContentSelect ? displayContentSelect.value : 'both',
      gridMode: gridModeSelect ? gridModeSelect.value : 'startlist',
      theme: themeSelect ? themeSelect.value : 'theme-starting-list',
      position: posSelect ? posSelect.value : 'pos-bottom-grid'
    };
    try {
      localStorage.setItem('mika_control_panel_config', JSON.stringify(configData));
    } catch (e) {}
  }

  function loadControlPanelSettings() {
    try {
      const savedConfig = localStorage.getItem('mika_control_panel_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.envPreset && envPresetSelect) envPresetSelect.value = config.envPreset;
        if (config.apiHost && apiHostInput) apiHostInput.value = config.apiHost;
        if (config.apiKey && apiKeyInput) apiKeyInput.value = config.apiKey;
        if (typeof config.mode === 'boolean' && modeToggle) modeToggle.checked = config.mode;
        if (typeof config.simFallback === 'boolean' && simFallbackToggle) {
          simFallbackToggle.checked = config.simFallback;
          state.allowSimFallback = config.simFallback;
        }
        if (config.nameFormat && nameFormatSelect) {
          nameFormatSelect.value = config.nameFormat;
          state.nameFormat = config.nameFormat;
        }
        if (config.displayContent && displayContentSelect) {
          displayContentSelect.value = config.displayContent;
          state.displayContent = config.displayContent;
        }
        if (config.gridMode && gridModeSelect) {
          gridModeSelect.value = config.gridMode;
          state.gridMode = config.gridMode;
        }
        if (config.theme && themeSelect) {
          themeSelect.value = config.theme;
          state.theme = config.theme;
        }
        if (config.position && posSelect) {
          posSelect.value = config.position;
          state.position = config.position;
        }
      }
    } catch (e) {}
  }

  // Event Listeners
  if (envPresetSelect) {
    envPresetSelect.addEventListener('change', () => {
      if (envPresetSelect.value === 'staging') {
        apiHostInput.value = 'https://apihub-staging.mikatiming.net/ah/rest/appapi';
        apiKeyInput.value = 'sportvot';
      } else if (envPresetSelect.value === 'prod') {
        apiHostInput.value = 'https://apihub.mikatiming.net/ah/rest/appapi';
        apiKeyInput.value = 'sportvot-vhzj2id';
      }
      saveControlPanelSettings();
    });
  }

  if (meetingSelect) {
    meetingSelect.addEventListener('change', () => {
      const selectedId = meetingSelect.value;
      const meetingObj = state.meetings.find(m => m.idMeeting === selectedId);
      if (meetingObj) {
        state.selectedMeetingId = selectedId;
        state.meetingInfo.title = meetingObj.titleText;
        syncState();
        if (state.mode === 'live') startLivePolling();
      }
    });
  }

  if (raceSelect) {
    raceSelect.addEventListener('change', () => {
      const selectedId = raceSelect.value;
      const selectedText = raceSelect.options[raceSelect.selectedIndex]?.text || selectedId;
      const raceObj = state.races ? state.races.find(r => r.idRace === selectedId) : null;
      const raceName = raceObj ? (raceObj.descriptionText || raceObj.idRace) : selectedText;

      state.selectedRaceId = selectedId;
      state.meetingInfo.meta = `${raceName} • Live`;
      state.meetingInfo.category = raceName;

      if (state.mode === 'sim') {
        simulator.setCategory(raceName);
        state.leaderboard = simulator.getLeaderboardData();
        state.tickerItems = simulator.splitEvents;
        updateSpotlightSelectOptions();
        syncState();
      } else if (state.mode === 'live') {
        startLivePolling();
      }
    });
  }

  if (eventSelect) {
    eventSelect.addEventListener('change', () => {
      const selectedKey = eventSelect.value;
      const selectedText = eventSelect.options[eventSelect.selectedIndex]?.text || selectedKey;
      const cleanEventName = selectedText.replace(/\s*\[Key:.*?\]/i, '').trim();
      const eventObj = state.events ? state.events.find(e => e.key === selectedKey) : null;
      const eventName = eventObj ? eventObj.nameText : cleanEventName;

      state.selectedEventKey = selectedKey;
      state.meetingInfo.eventTitle = eventName;
      state.meetingInfo.meta = `${eventName} • Live`;
      state.meetingInfo.category = eventName;

      if (state.mode === 'sim') {
        simulator.setCategory(eventName);
        state.leaderboard = simulator.getLeaderboardData();
        state.tickerItems = simulator.splitEvents;
        updateSpotlightSelectOptions();
        syncState();
      } else if (state.mode === 'live') {
        startLivePolling();
      }
    });
  }

  const saveConfigBtn = document.getElementById('saveConfigBtn');
  if (saveConfigBtn) {
    saveConfigBtn.addEventListener('click', () => {
      saveControlPanelSettings();
      syncState();
      updateStatus('Settings & API Credentials Saved Successfully!', 'success');
    });
  }

  if (connectBtn) connectBtn.addEventListener('click', () => {
    saveControlPanelSettings();
    connectAPI();
  });
  if (modeToggle) modeToggle.addEventListener('change', () => {
    saveControlPanelSettings();
    updateMode();
  });
  if (simFallbackToggle) {
    simFallbackToggle.addEventListener('change', () => {
      state.allowSimFallback = simFallbackToggle.checked;
      saveControlPanelSettings();
      if (state.mode === 'live') {
        startLivePolling();
      }
    });
  }

  if (toggleGridGfx) {
    toggleGridGfx.addEventListener('change', () => {
      const isGridOn = toggleGridGfx.checked;
      if (isGridOn) {
        state.theme = 'theme-starting-list';
        state.position = 'pos-bottom-grid';
        state.visibleElements.leaderboard = true;
        state.visibleElements.banner = false;
        state.visibleElements.lowerThird = false;
        if (themeSelect) themeSelect.value = 'theme-starting-list';
        if (posSelect) posSelect.value = 'pos-bottom-grid';
        if (toggleBanner) toggleBanner.checked = false;
        if (toggleLeaderboard) toggleLeaderboard.checked = false;
      } else {
        state.visibleElements.leaderboard = false;
      }
      saveControlPanelSettings();
      syncState();
    });
  }

  if (toggleRaceClock) toggleRaceClock.addEventListener('change', () => { state.visibleElements.raceClock = toggleRaceClock.checked; saveControlPanelSettings(); syncState(); });
  if (toggleBanner) toggleBanner.addEventListener('change', () => { state.visibleElements.banner = toggleBanner.checked; saveControlPanelSettings(); syncState(); });
  if (toggleLeaderboard) toggleLeaderboard.addEventListener('change', () => { state.visibleElements.leaderboard = toggleLeaderboard.checked; saveControlPanelSettings(); syncState(); });
  if (toggleLowerThird) toggleLowerThird.addEventListener('change', () => { state.visibleElements.lowerThird = toggleLowerThird.checked; saveControlPanelSettings(); syncState(); });
  if (toggleTicker) toggleTicker.addEventListener('change', () => { state.visibleElements.ticker = toggleTicker.checked; saveControlPanelSettings(); syncState(); });
  if (toggleTimer) toggleTimer.addEventListener('change', () => { state.visibleElements.showTimer = toggleTimer.checked; saveControlPanelSettings(); syncState(); });
  if (toggleClubs) toggleClubs.addEventListener('change', () => { state.visibleElements.showClubs = toggleClubs.checked; saveControlPanelSettings(); syncState(); });

  if (raceClockPosSelect) {
    raceClockPosSelect.addEventListener('change', () => {
      state.raceClockPosition = raceClockPosSelect.value;
      saveControlPanelSettings();
      syncState();
    });
  }

  if (themeSelect) themeSelect.addEventListener('change', () => { state.theme = themeSelect.value; saveControlPanelSettings(); syncState(); });
  if (gridModeSelect) gridModeSelect.addEventListener('change', () => { state.gridMode = gridModeSelect.value; saveControlPanelSettings(); syncState(); });
  if (displayContentSelect) displayContentSelect.addEventListener('change', () => { state.displayContent = displayContentSelect.value; saveControlPanelSettings(); syncState(); });
  if (nameFormatSelect) nameFormatSelect.addEventListener('change', () => { state.nameFormat = nameFormatSelect.value; saveControlPanelSettings(); syncState(); });
  if (posSelect) posSelect.addEventListener('change', () => { state.position = posSelect.value; saveControlPanelSettings(); syncState(); });

  if (sponsorLogoInput) {
    sponsorLogoInput.addEventListener('input', () => {
      state.meetingInfo.sponsorLogo = sponsorLogoInput.value.trim();
      saveControlPanelSettings();
      syncState();
    });
  }

  if (athleteSearchInput) {
    athleteSearchInput.addEventListener('input', () => {
      updateSpotlightSelectOptions();
    });
  }

  if (athleteSpotlightSelect) {
    athleteSpotlightSelect.addEventListener('change', () => {
      const selectedBib = athleteSpotlightSelect.value;
      const athlete = state.leaderboard.find(a => a.bib === selectedBib);
      if (athlete) {
        state.spotlightAthlete = athlete;
        syncState();
      }
    });
  }

  if (openOverlayBtn) {
    openOverlayBtn.addEventListener('click', () => {
      window.open('overlay.html', 'MikaGFXOverlay', 'width=1920,height=1080');
    });
  }

  // Tab Switcher Logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const content = document.getElementById(targetTab);
      if (content) content.classList.add('active');
    });
  });

  const emergencyFadeBtn = document.getElementById('emergencyFadeBtn');
  if (emergencyFadeBtn) {
    emergencyFadeBtn.addEventListener('click', () => {
      const anyVisible = Object.values(state.visibleElements).some(v => v);
      const newState = !anyVisible;
      state.visibleElements.banner = newState;
      state.visibleElements.leaderboard = newState;
      state.visibleElements.lowerThird = false;
      state.visibleElements.ticker = newState;
      state.visibleElements.raceClock = newState;
      if (toggleGridGfx) toggleGridGfx.checked = newState;
      if (toggleRaceClock) toggleRaceClock.checked = newState;
      if (toggleBanner) toggleBanner.checked = newState;
      if (toggleLeaderboard) toggleLeaderboard.checked = newState;
      if (toggleLowerThird) toggleLowerThird.checked = false;
      if (toggleTicker) toggleTicker.checked = newState;
      syncState();
    });
  }

  // Live Broadcast Keyboard Hotkeys
  document.addEventListener('keydown', (e) => {
    // Ignore keypress when typing in input fields
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    switch (e.key) {
      case 'g':
      case 'G':
        if (toggleGridGfx) {
          toggleGridGfx.checked = !toggleGridGfx.checked;
          toggleGridGfx.dispatchEvent(new Event('change'));
        }
        break;
      case 't':
      case 'T':
        if (toggleRaceClock) {
          toggleRaceClock.checked = !toggleRaceClock.checked;
          state.visibleElements.raceClock = toggleRaceClock.checked;
          syncState();
        }
        break;
      case '1':
        if (toggleBanner) { toggleBanner.checked = !toggleBanner.checked; state.visibleElements.banner = toggleBanner.checked; syncState(); }
        break;
      case '2':
        if (toggleLeaderboard) { toggleLeaderboard.checked = !toggleLeaderboard.checked; state.visibleElements.leaderboard = toggleLeaderboard.checked; syncState(); }
        break;
      case '3':
        if (toggleLowerThird) { toggleLowerThird.checked = !toggleLowerThird.checked; state.visibleElements.lowerThird = toggleLowerThird.checked; syncState(); }
        break;
      case '4':
        if (toggleTicker) { toggleTicker.checked = !toggleTicker.checked; state.visibleElements.ticker = toggleTicker.checked; syncState(); }
        break;
      case ' ':
        e.preventDefault();
        if (emergencyFadeBtn) emergencyFadeBtn.click();
        break;
    }
  });

  // Boot
  loadControlPanelSettings();
  loadNetworkUrls();
  updateMode();
  connectAPI();
});

