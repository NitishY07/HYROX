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
    theme: 'theme-sportvot',
    position: 'pos-top-left',
    visibleElements: {
      banner: true,
      leaderboard: true,
      lowerThird: false,
      ticker: true,
      showTimer: false,
      showClubs: true
    },
    meetings: [],
    races: [],
    events: [],
    leaderboard: [],
    spotlightAthlete: null,
    tickerItems: [],
    meetingInfo: {
      title: 'DELHI CHAMPIONSHIP 2026',
      meta: 'HYROX • Day 2 • Live',
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

  const meetingSelect = document.getElementById('meetingSelect');
  const raceSelect = document.getElementById('raceSelect');
  const eventSelect = document.getElementById('eventSelect');

  const toggleBanner = document.getElementById('toggleBanner');
  const toggleLeaderboard = document.getElementById('toggleLeaderboard');
  const toggleLowerThird = document.getElementById('toggleLowerThird');
  const toggleTicker = document.getElementById('toggleTicker');
  const toggleTimer = document.getElementById('toggleTimer');
  const toggleClubs = document.getElementById('toggleClubs');

  const themeSelect = document.getElementById('themeSelect');
  const posSelect = document.getElementById('posSelect');
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
        console.warn('Live API connection failed. Activating timer fallback.');
        startSimulatorSync();
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
    if (livePollInterval) clearInterval(livePollInterval);
    
    const pollFn = async () => {
      if (state.mode !== 'live') return;
      try {
        const results = await api.getRaceResults(state.selectedRaceId, state.selectedMeetingId, state.selectedEventKey);
        if (results && results.length > 0) {
          simulator.stop();
          state.leaderboard = results.map((r, i) => ({
            rank: i + 1,
            bib: r.bib || r.idParticipant || `B${i+1}`,
            name: `${r.firstname || ''} ${r.lastname || r.nameText || 'Participant'}`.trim(),
            club: r.clubname || r.nation || '',
            nat: r.nation || 'IND',
            time: r.timeText || r.time || '00:00',
            delta: i === 0 ? 'LEADER' : `+${i * 3.5}s`
          }));
          updateSpotlightSelectOptions();
          syncState();
        } else {
          startSimulatorSync();
        }
      } catch (err) {
        console.info('Live results endpoint info:', err.message);
        startSimulatorSync();
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

  // Event Listeners
  if (envPresetSelect) {
    envPresetSelect.addEventListener('change', () => {
      if (envPresetSelect.value === 'staging') {
        apiHostInput.value = 'https://apihub-staging.mikatiming.net/ah/rest/appapi';
        apiKeyInput.value = 'sportvot';
      } else if (envPresetSelect.value === 'prod') {
        apiHostInput.value = 'https://apihub.mikatiming.net/ah/rest/appapi';
        apiKeyInput.value = '';
        apiKeyInput.placeholder = 'Enter Production API Key';
      }
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

      simulator.setCategory(raceName);
      state.leaderboard = simulator.getLeaderboardData();
      state.tickerItems = simulator.splitEvents;

      updateSpotlightSelectOptions();
      syncState();

      if (state.mode === 'live') {
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
      state.meetingInfo.meta = `${eventName} • Live`;
      state.meetingInfo.category = eventName;

      simulator.setCategory(eventName);
      state.leaderboard = simulator.getLeaderboardData();
      state.tickerItems = simulator.splitEvents;

      updateSpotlightSelectOptions();
      syncState();

      if (state.mode === 'live') {
        startLivePolling();
      }
    });
  }

  if (connectBtn) connectBtn.addEventListener('click', connectAPI);
  if (modeToggle) modeToggle.addEventListener('change', updateMode);

  if (toggleBanner) toggleBanner.addEventListener('change', () => { state.visibleElements.banner = toggleBanner.checked; syncState(); });
  if (toggleLeaderboard) toggleLeaderboard.addEventListener('change', () => { state.visibleElements.leaderboard = toggleLeaderboard.checked; syncState(); });
  if (toggleLowerThird) toggleLowerThird.addEventListener('change', () => { state.visibleElements.lowerThird = toggleLowerThird.checked; syncState(); });
  if (toggleTicker) toggleTicker.addEventListener('change', () => { state.visibleElements.ticker = toggleTicker.checked; syncState(); });
  if (toggleTimer) toggleTimer.addEventListener('change', () => { state.visibleElements.showTimer = toggleTimer.checked; syncState(); });
  if (toggleClubs) toggleClubs.addEventListener('change', () => { state.visibleElements.showClubs = toggleClubs.checked; syncState(); });

  if (themeSelect) themeSelect.addEventListener('change', () => { state.theme = themeSelect.value; syncState(); });
  if (posSelect) posSelect.addEventListener('change', () => { state.position = posSelect.value; syncState(); });

  if (sponsorLogoInput) {
    sponsorLogoInput.addEventListener('input', () => {
      state.meetingInfo.sponsorLogo = sponsorLogoInput.value.trim();
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
  loadNetworkUrls();
  updateMode();
  connectAPI();
});

