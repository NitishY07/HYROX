
const REAL_ATHLETE_PAIRS_DEFAULT = [
  { rank: 1, bib: '172011', name: 'Dhaval Thakkar / Ridham Thakkar', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 2, bib: '172003', name: 'Palak Goswami / Bhoomik Goswami', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 3, bib: '172007', name: 'Beneeta Kiran / Sudhanshu Pant', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 4, bib: '172015', name: 'Vedant Mandaliya / Stuti Mandaliya', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 5, bib: '172006', name: 'Ketan Wadkar / Ranu Chatwani', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 6, bib: '172008', name: 'Vishesh Kumar Singh / Saloni Sathe', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 7, bib: '172012', name: 'Bhavin Doshi / Malarkodi Mahendran', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 8, bib: '172005', name: 'Aakshka Thakkar / Yagya Raj', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 9, bib: '172013', name: 'Shilpa Patel / Jaydip Solanki', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 10, bib: '172009', name: 'Megumi Saito / Sahil Sharma', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 11, bib: '172004', name: 'Ashwani Kumar Gupta / Nancy Gupta', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 12, bib: '172010', name: 'Amit Bhagat / Nini Bhatia', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 13, bib: '172001', name: 'Sanjay Negi / Bhavneet Kaur', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 14, bib: '172014', name: 'Helina Swamy / Akshay Mhetre', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 15, bib: '172002', name: 'Paromita Mandal / Rohit Parab', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 16, bib: '172016', name: 'Devender Singh / Princi Kumari', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' },
  { rank: 17, bib: '172017', name: 'Saumya Verma / Sonu Kumar', club: 'Battle of Gyms', nat: 'IND', split: '', time: '' }
];
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
    mode: 'live',
    apiBaseUrl: 'https://apihub.mikatiming.net/ah/rest/appapi',
    apiKey: 'sportvot-vhzj2id',
    selectedMeetingId: 'LR3MS4JI1A59',
    selectedRaceId: 'LR3MS4JI295A',
    selectedEventKey: 'BOG',
    isRaceStarted: false,
    theme: 'theme-starting-list',
    position: 'pos-bottom-grid',
    nameFormat: 'full',
    displayContent: 'both',
    gridMode: 'startlist',
    raceClockTime: '00:00:00',
    raceClockPosition: 'pos-clock-top-left',
    allowSimFallback: false,
    visibleElements: {
      banner: false,
      leaderboard: true,
      lowerThird: false,
      ticker: true,
      showTimer: true,
      showClubs: true,
      raceClock: true
    },
    meetings: [],
    races: [],
    events: [],
    leaderboard: REAL_ATHLETE_PAIRS_DEFAULT,
    spotlightAthlete: null,
    tickerItems: REAL_ATHLETE_PAIRS_DEFAULT.map(p => ({ bib: p.bib, name: p.name, checkpoint: p.split || p.club, time: p.time })),
    meetingInfo: {
      title: 'GUJARAT - 27.11.2026 - DAY 2',
      meta: 'Battle of Gyms • Live',
      category: 'Battle of Gyms',
      eventTitle: 'Battle of Gyms',
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
  const startRaceGunBtn = document.getElementById('startRaceGunBtn');
  const resetRaceClockBtn = document.getElementById('resetRaceClockBtn');
  const panelClockTime = document.getElementById('panelClockTime');
  const raceStatusBadge = document.getElementById('raceStatusBadge');

  let livePollInterval = null;
  let simSyncInterval = null;
  let liveClockInterval = null;
  let liveRaceStartMs = null;

  /**
   * Sync State across BroadcastChannel, LocalStorage, AND Server Network API
   */
  async function syncState() {
    const payload = {
      mode: state.mode,
      isRaceStarted: !!state.isRaceStarted,
      startTimeMs: (state.mode === 'live' || state.mode === 'api') ? (typeof liveRaceStartMs !== 'undefined' ? liveRaceStartMs : null) : simulator.startTimeMs,
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
    state.apiBaseUrl = apiHostInput ? apiHostInput.value.trim() : 'https://apihub.mikatiming.net/ah/rest/appapi';
    state.apiKey = apiKeyInput ? apiKeyInput.value.trim() : 'sportvot-vhzj2id';
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
        const validMeeting = meetings.find(m => m.idMeeting === state.selectedMeetingId);
        if (!validMeeting) {
          state.selectedMeetingId = meetings[0].idMeeting;
          state.meetingInfo.title = meetings[0].titleText;
        } else {
          state.meetingInfo.title = validMeeting.titleText;
        }
        if (meetingSelect) meetingSelect.value = state.selectedMeetingId;
      }

      await fetchRacesAndEvents(state.selectedMeetingId);

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

  async function fetchRacesAndEvents(meetingId) {
    const targetMeetingId = meetingId || state.selectedMeetingId;
    try {
      const races = await api.getRaces(targetMeetingId);
      state.races = races;
      populateSelect(raceSelect, races.map(r => ({
        value: r.idRace,
        text: `${r.descriptionText || r.idRace} (${r.distanceText || ''})`
      })));

      const events = await api.getEvents(targetMeetingId);
      state.events = events;
      populateSelect(eventSelect, events.map(e => ({
        value: e.key,
        text: `${e.nameText} [Key: ${e.key}]`
      })));

      if (events.length > 0) {
        // ALWAYS select BOG by default if available
        const bogEvent = events.find(e => e.key === 'BOG');
        if (bogEvent && (!state.selectedEventKey || state.selectedEventKey === 'BOG' || state.selectedEventKey === 'HD')) {
          state.selectedEventKey = 'BOG';
          state.meetingInfo.eventTitle = bogEvent.nameText;
          state.meetingInfo.category = bogEvent.nameText;
          state.meetingInfo.meta = `${bogEvent.nameText} • Live`;
        } else {
          const validEvent = events.find(e => e.key === state.selectedEventKey) || events[0];
          state.selectedEventKey = validEvent.key;
          state.meetingInfo.eventTitle = validEvent.nameText;
          state.meetingInfo.category = validEvent.nameText;
          state.meetingInfo.meta = `${validEvent.nameText} • Live`;
        }
        if (eventSelect) eventSelect.value = state.selectedEventKey;
      }

      if (races.length > 0) {
        if (state.selectedEventKey === 'BOG') {
          const doublesRace = races.find(r => (r.descriptionText || '').toLowerCase().includes('doubles')) || races[0];
          state.selectedRaceId = doublesRace.idRace;
          state.meetingInfo.meta = `Battle of Gyms • Live`;
          state.meetingInfo.category = 'Battle of Gyms';
        } else {
          const validRace = races.find(r => r.idRace === state.selectedRaceId) || races[0];
          state.selectedRaceId = validRace.idRace;
        }
        if (raceSelect) raceSelect.value = state.selectedRaceId;
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
    if (liveClockInterval) clearInterval(liveClockInterval);
    
    // Live 1-second continuous clock ticker linked strictly to API start timestamp
    liveClockInterval = setInterval(() => {
      if (state.mode === 'live' && state.isRaceStarted && liveRaceStartMs) {
        const elapsedSec = Math.max(0, Math.floor((Date.now() - liveRaceStartMs) / 1000));
        const mins = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');
        const hrs = Math.floor(elapsedSec / 3600);
        state.raceClockTime = hrs > 0 ? `${String(hrs).padStart(2, '0')}:${mins}:${secs}` : `00:${mins}:${secs}`;
        if (panelClockTime) panelClockTime.innerText = state.raceClockTime;
        syncState();
      } else if (!state.isRaceStarted) {
        if (panelClockTime && panelClockTime.innerText !== '00:00:00' && state.raceClockTime === '00:00:00') {
          panelClockTime.innerText = '00:00:00';
        }
      }
    }, 1000);
    
    const pollFn = async () => {
      if (state.mode !== 'live') return;
      try {
        let results = await api.getRaceResults(state.selectedRaceId, state.selectedMeetingId, state.selectedEventKey);
        if (results && results.length > 0) {
          simulator.stop();

          // Sort results strictly by API rank/position
          results.sort((a, b) => {
            const rA = parseInt(a.rank || a.position || a.place || 999, 10);
            const rB = parseInt(b.rank || b.position || b.place || 999, 10);
            return rA - rB;
          });

          // Check if race has started and extract live timing strictly from API
          const allFinished = results.length > 0 && results.every(r => r.status === 'F' || r.status === 'finished');
          const isUserInStartlistMode = (state.gridMode === 'startlist');

          if (isUserInStartlistMode) {
            // Operator is displaying Pre-Race Starting List before the gun
            state.isRaceStarted = false;
            liveRaceStartMs = null;
            state.startTimeMs = null;
            state.raceClockTime = '00:00:00';
            if (panelClockTime) panelClockTime.innerText = '00:00:00';
            if (raceStatusBadge) {
              raceStatusBadge.className = 'status-badge status-info';
              raceStatusBadge.innerText = 'PRE-RACE (STANDBY)';
            }
          } else if (liveRaceStartMs) {
            // Live Race is actively running (Gun fired or active race started) - Keep timer running!
            state.isRaceStarted = true;
            state.startTimeMs = liveRaceStartMs;
            if (raceStatusBadge) {
              raceStatusBadge.className = 'status-badge status-success';
              raceStatusBadge.innerText = 'RACE LIVE (ACTIVE)';
            }
          } else {
            // Check if API has active live race in progress
            const activeRunning = results.find(r => r.status !== 'F' && r.status !== 'R' && (r.splitTimeSeconds || r.splitTimeStr));
            if (activeRunning) {
              state.isRaceStarted = true;
              const sec = activeRunning.splitTimeSeconds || 0;
              liveRaceStartMs = Date.now() - (sec * 1000);
              state.startTimeMs = liveRaceStartMs;
              state.gridMode = 'livesplits';
              if (gridModeSelect) gridModeSelect.value = 'livesplits';
              if (raceStatusBadge) {
                raceStatusBadge.className = 'status-badge status-success';
                raceStatusBadge.innerText = 'RACE LIVE (ACTIVE)';
              }
            } else if (allFinished) {
              // Historical or complete event: display official finish time when operator is not running a live race
              state.isRaceStarted = true;
              state.startTimeMs = null;
              const winningTime = results[0]?.splitTimeStr || results[0]?.finishNetStr || results[0]?.timeText || '01:05:07';
              state.raceClockTime = winningTime;
              if (panelClockTime) panelClockTime.innerText = winningTime;
              if (raceStatusBadge) {
                raceStatusBadge.className = 'status-badge status-success';
                raceStatusBadge.innerText = 'OFFICIAL FINISH';
              }
            } else {
              // Pre-race standby
              state.isRaceStarted = false;
              liveRaceStartMs = null;
              state.startTimeMs = null;
              state.raceClockTime = '00:00:00';
              if (panelClockTime) panelClockTime.innerText = '00:00:00';
              if (raceStatusBadge) {
                raceStatusBadge.className = 'status-badge status-info';
                raceStatusBadge.innerText = 'PRE-RACE (STANDBY)';
              }
            }
          }

          const cleanName = (r, rankIdx) => {
            const bib = String(r.startNo || r.bib || '').trim();
            const bibMap = {
              '172001': 'Sanjay Negi / Bhavneet Kaur',
              '172002': 'Paromita Mandal / Rohit Parab',
              '172003': 'Palak Goswami / Bhoomik Goswami',
              '172004': 'Ashwani Kumar Gupta / Nancy Gupta',
              '172005': 'Aakshka Thakkar / Yagya Raj',
              '172006': 'Ketan Wadkar / Ranu Chatwani',
              '172007': 'Beneeta Kiran / Sudhanshu Pant',
              '172008': 'Vishesh Kumar Singh / Saloni Sathe',
              '172009': 'Megumi Saito / Sahil Sharma',
              '172010': 'Amit Bhagat / Nini Bhatia',
              '172011': 'Dhaval Thakkar / Ridham Thakkar',
              '172012': 'Bhavin Doshi / Malarkodi Mahendran',
              '172013': 'Shilpa Patel / Jaydip Solanki',
              '172014': 'Helina Swamy / Akshay Mhetre',
              '172015': 'Vedant Mandaliya / Stuti Mandaliya',
              '172016': 'Devender Singh / Princi Kumari',
              '172017': 'Saumya Verma / Sonu Kumar'
            };
            if (state.selectedEventKey === 'BOG' && bibMap[bib]) {
              return bibMap[bib];
            }

            let raw = r.nameText || r.displayName || r.name || r.fullname || r.participantName || '';
            
            if (!raw) {
              const fName = (r.firstname || r.first_name || r.fname || '').trim();
              const lName = (r.lastname || r.last_name || r.lname || '').trim();
              if (lName === '.' || lName === ',') {
                raw = fName;
              } else {
                raw = `${fName} ${lName}`.trim();
              }
            }

            if (!raw) return `Team ${rankIdx + 1}`;

            // Remove email addresses (e.g. from registration typos)
            raw = raw.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');

            let clean = raw.replace(/^[\s.,]+/, '').replace(/\s*\([A-Z]{3}\)$/i, '').trim();
            clean = clean.replace(/[\s.,]+$/, '').trim();

            // BOG team mapping for Gujarat and other venues
            if (state.selectedMeetingId === 'LR3MS4JI1804' && state.selectedEventKey === 'BOG') {
              const bogTeams = {
                'khushboo': 'Pankaj Pasi & Khusboo Adalja',
                'vidushi': 'Tom Saxena & Vidushi Kumar',
                'punith': 'Punith Basavaraju & Tanvi Gandhi',
                'rohit': 'Paromita Mandal & Rohit Parab',
                'sahirah': 'Jehangir Havaldar & Sahirah Oshidar',
                'janhavi': 'Parth Pandya & Janhavi Patil',
                'sameer': 'Vineetha Deshmukh & Sameer Deshmukh',
                'glen': 'Glen Richard & Anchal Singh',
                'teddy': 'Teddy Cardozo & Swisel Dsouza',
                'vikram': 'Vikram Naik & Pooja Naik',
                'ashwani': 'Ashwani Kumar Gupta & Nancy Gupta',
                'priti': 'Sikandar Tadakhe & Priti Lamba',
                'zahabiya': 'Abhijeet Ghadge & Zahabiya Merchant',
                'lalwani': 'Hetal Sumra & Pratik Lalwani',
                'mohena': 'Dhruv Adwani & Mohena Ahluwalia',
                'jayashree': 'Kunal Nath & Jayashree Parihar',
                'iris': 'Iris Lewis & Praveen Pai',
                'abhishek menon': 'Mini Menon & Abhishek Menon',
                'malvika': 'Malvika Iyer & Pratik Mhatre',
                'shardul': 'Hiloni Ajmera & Shardul Zankar',
                'ritesh': 'Indira Baikerikar & Ritesh Shetty',
                'parshant': 'Prashant Sharma & Ria Kataria',
                'naman': 'Naman Mawandia & Geetika Hans'
              };
              const cleanLower = clean.toLowerCase();
              for (const [key, pairName] of Object.entries(bogTeams)) {
                if (cleanLower.includes(key)) {
                  clean = pairName;
                  break;
                }
              }
            } else if (state.selectedEventKey === 'BOG') {
              const lower = clean.toLowerCase();
              if (lower.includes('aashka') || lower.includes('aakshka') || lower.includes('yagya')) clean = 'Aakshka Thakkar / Yagya Raj';
              else if (lower.includes('ridham') || lower.includes('dhaval')) clean = 'Dhaval Thakkar / Ridham Thakkar';
              else if (lower.includes('goswami') || lower.includes('palak') || lower.includes('bhoomik')) clean = 'Palak Goswami / Bhoomik Goswami';
              else if (lower.includes('pant') || lower.includes('beneeta') || lower.includes('sudhanshu')) clean = 'Beneeta Kiran / Sudhanshu Pant';
              else if (lower.includes('mandaliya') || lower.includes('vedant') || lower.includes('stuti')) clean = 'Vedant Mandaliya / Stuti Mandaliya';
              else if (lower.includes('chatwani') || lower.includes('ranu') || lower.includes('wadkar') || lower.includes('ketan')) clean = 'Ketan Wadkar / Ranu Chatwani';
              else if (lower.includes('sathe') || lower.includes('saloni') || lower.includes('vishesh')) clean = 'Vishesh Kumar Singh / Saloni Sathe';
              else if (lower.includes('doshi') || lower.includes('malarkodi') || lower.includes('mahendran') || lower.includes('bhavin')) clean = 'Bhavin Doshi / Malarkodi Mahendran';
              else if (lower.includes('solanki') || lower.includes('jaydip') || lower.includes('shilpa')) clean = 'Shilpa Patel / Jaydip Solanki';
              else if (lower.includes('saito') || lower.includes('megumi') || lower.includes('sahil')) clean = 'Megumi Saito / Sahil Sharma';
              else if (lower.includes('gupta') || lower.includes('ashwani') || lower.includes('nancy')) clean = 'Ashwani Kumar Gupta / Nancy Gupta';
              else if (lower.includes('bhagat') || lower.includes('bhatia') || lower.includes('nini') || lower.includes('amit')) clean = 'Amit Bhagat / Nini Bhatia';
              else if (lower.includes('negi') || lower.includes('sanjay') || lower.includes('bhavneet')) clean = 'Sanjay Negi / Bhavneet Kaur';
              else if (lower.includes('swamy') || lower.includes('mhetre') || lower.includes('helina') || lower.includes('akshay')) clean = 'Helina Swamy / Akshay Mhetre';
              else if (lower.includes('mandal') || lower.includes('paromita') || lower.includes('parab') || lower.includes('rohit')) clean = 'Paromita Mandal / Rohit Parab';
              else if (lower.includes('devender') || lower.includes('princi')) clean = 'Devender Singh / Princi Kumari';
              else if (lower.includes('saumya') || lower.includes('sonu')) clean = 'Saumya Verma / Sonu Kumar';
              else if (lower.includes('thakkar')) clean = 'Dhaval Thakkar / Ridham Thakkar';
            }

            if (clean.includes('/')) {
              return clean.split('/').map(part => {
                part = part.trim();
                if (part.includes(',')) {
                  const sub = part.split(',');
                  return `${sub[1].trim()} ${sub[0].trim()}`;
                }
                return part;
              }).join(' / ');
            } else if (clean.includes(',') && !clean.includes('&')) {
              const parts = clean.split(',');
              if (parts.length === 2) {
                clean = `${parts[1].trim()} ${parts[0].trim()}`;
              }
            }

            // Capitalize properly if all lowercase or all uppercase
            clean = clean.split(/\s+/).map(w => {
              if (w.toLowerCase() === 'team') return 'Team';
              return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
            }).join(' ');

            return clean;
          };

          const cleanClub = (r) => {
            if (r.company && r.company.trim()) return r.company.trim();
            if (r.clubname && r.clubname.trim()) return r.clubname.trim();
            if (r.club && r.club.trim()) return r.club.trim();
            if (r.startGroup) {
              const grp = r.startGroup.split('|')[0].replace(/^\d{1,2}:\d{2}\s*/, '').trim();
              if (grp) return grp;
            }
            return 'GYM V/S GYM';
          };

          if (isUserInStartlistMode && state.selectedEventKey === 'BOG') {
            state.leaderboard = REAL_ATHLETE_PAIRS_DEFAULT.map((p, i) => ({
              rank: i + 1,
              bib: p.bib,
              name: p.name,
              club: p.club || 'Battle of Gyms',
              nat: p.nat || 'IND',
              split: '',
              time: '',
              delta: ''
            }));

            state.tickerItems = state.leaderboard.map(p => ({
              bib: p.bib,
              name: p.name,
              checkpoint: 'Starting List',
              time: ''
            }));
          } else {
            const isHistoricalWithLiveGun = allFinished && !!liveRaceStartMs;

            const mappedResults = results.map((r, i) => {
              const pName = cleanName(r, i);
              return {
                rank: r.rank || r.position || r.place || i + 1,
                bib: r.startNo || r.bib || r.idParticipant || `B${i+1}`,
                name: pName,
                club: cleanClub(r),
                nat: r.nationality || r.nation || 'IND',
                split: isHistoricalWithLiveGun ? 'ON COURSE' : (r.splitName || r.checkpointName || r.checkpoint || r.split || ''),
                time: isHistoricalWithLiveGun ? '' : (r.splitTimeStr || r.splitTime || r.timeText || r.time || r.finishNetStr || r.finishTimeNet || ''),
                delta: (i === 0 || isHistoricalWithLiveGun) ? '' : (r.splitDiffStr || r.delta || '')
              };
            });

            // If BOG event, ensure all 17 pairs are present in leaderboard
            if (state.selectedEventKey === 'BOG') {
              const existingNames = new Set(mappedResults.map(m => m.name.toLowerCase()));
              for (const defaultPair of REAL_ATHLETE_PAIRS_DEFAULT) {
                if (!existingNames.has(defaultPair.name.toLowerCase())) {
                  mappedResults.push({
                    rank: mappedResults.length + 1,
                    bib: defaultPair.bib,
                    name: defaultPair.name,
                    club: defaultPair.club || 'Battle of Gyms',
                    nat: defaultPair.nat || 'IND',
                    split: liveRaceStartMs ? 'ON COURSE' : '',
                    time: '',
                    delta: ''
                  });
                  existingNames.add(defaultPair.name.toLowerCase());
                }
              }
            }

            state.leaderboard = mappedResults;

            state.tickerItems = mappedResults.map((r, i) => {
              return {
                bib: r.bib || '00',
                name: r.name,
                checkpoint: r.split || r.club || 'Battle of Gyms',
                time: r.time || ''
              };
            });
          }

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
      if (liveClockInterval) clearInterval(liveClockInterval);
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
        const mins = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
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
      position: posSelect ? posSelect.value : 'pos-bottom-grid',
      showClubs: toggleClubs ? toggleClubs.checked : true,
      showTimer: toggleTimer ? toggleTimer.checked : true,
      raceClock: toggleRaceClock ? toggleRaceClock.checked : true,
      ticker: toggleTicker ? toggleTicker.checked : true,
      banner: toggleBanner ? toggleBanner.checked : false,
      leaderboard: toggleLeaderboard ? toggleLeaderboard.checked : true
    };
    try {
      localStorage.setItem('mika_control_panel_config', JSON.stringify(configData));
    } catch (e) {}
  }

  function loadControlPanelSettings() {
    try {
      const savedGfx = localStorage.getItem('mika_gfx_state');
      if (savedGfx && (savedGfx.includes('SAURABH') || savedGfx.includes('MARCUS VANCE'))) {
        localStorage.removeItem('mika_gfx_state');
        localStorage.removeItem('mika_control_panel_config');
      }

      const savedConfig = localStorage.getItem('mika_control_panel_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.apiKey === 'sportvot' || (config.apiHost && config.apiHost.includes('staging'))) {
          config.apiKey = 'sportvot-vhzj2id';
          config.apiHost = 'https://apihub.mikatiming.net/ah/rest/appapi';
          config.envPreset = 'prod';
        }
        if (config.envPreset && envPresetSelect) envPresetSelect.value = config.envPreset;
        if (config.apiHost && apiHostInput) apiHostInput.value = config.apiHost;
        if (config.apiKey && apiKeyInput) apiKeyInput.value = config.apiKey;
        if (typeof config.mode === 'boolean' && modeToggle) {
          modeToggle.checked = config.mode;
        } else if (modeToggle) {
          modeToggle.checked = true;
        }
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
        if (typeof config.showClubs === 'boolean') {
          if (toggleClubs) toggleClubs.checked = config.showClubs;
          state.visibleElements.showClubs = config.showClubs;
        }
        if (typeof config.showTimer === 'boolean') {
          if (toggleTimer) toggleTimer.checked = config.showTimer;
          state.visibleElements.showTimer = config.showTimer;
        } else if (toggleTimer) {
          toggleTimer.checked = true;
          state.visibleElements.showTimer = true;
        }
        if (typeof config.raceClock === 'boolean') {
          if (toggleRaceClock) toggleRaceClock.checked = config.raceClock;
          state.visibleElements.raceClock = config.raceClock;
        }
        if (typeof config.ticker === 'boolean') {
          if (toggleTicker) toggleTicker.checked = config.ticker;
          state.visibleElements.ticker = config.ticker;
        }
        if (typeof config.banner === 'boolean') {
          if (toggleBanner) toggleBanner.checked = config.banner;
          state.visibleElements.banner = config.banner;
        }
        if (typeof config.leaderboard === 'boolean') {
          if (toggleLeaderboard) toggleLeaderboard.checked = config.leaderboard;
          if (toggleGridGfx) toggleGridGfx.checked = config.leaderboard;
          state.visibleElements.leaderboard = config.leaderboard;
        }
        state.selectedEventKey = config.eventKey || 'BOG';
        state.selectedMeetingId = config.meetingId || 'LR3MS4JI1A59';
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
    meetingSelect.addEventListener('change', async () => {
      const selectedId = meetingSelect.value;
      const meetingObj = state.meetings.find(m => m.idMeeting === selectedId);
      if (meetingObj) {
        state.selectedMeetingId = selectedId;
        state.meetingInfo.title = meetingObj.titleText;
        state.selectedRaceId = null;
        state.selectedEventKey = null;
        await fetchRacesAndEvents(selectedId);
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
        state.raceClockPosition = 'pos-clock-top-left';
        state.visibleElements.leaderboard = true;
        state.visibleElements.banner = false;
        state.visibleElements.lowerThird = false;
        if (themeSelect) themeSelect.value = 'theme-starting-list';
        if (posSelect) posSelect.value = 'pos-bottom-grid';
        if (raceClockPosSelect) raceClockPosSelect.value = 'pos-clock-top-left';
        if (toggleBanner) toggleBanner.checked = false;
        if (toggleLeaderboard) toggleLeaderboard.checked = false;
      } else {
        state.visibleElements.leaderboard = false;
      }
      saveControlPanelSettings(); 
      syncState(); 
    });

    if (toggleLeaderboard) toggleLeaderboard.addEventListener('change', () => { 
      if (toggleLeaderboard.checked) {
        state.theme = 'theme-signature-broadcast';
        state.position = 'pos-top-left';
        state.visibleElements.leaderboard = true;
        if (toggleGridGfx) toggleGridGfx.checked = false;
        if (toggleRaceClock) { toggleRaceClock.checked = false; state.visibleElements.raceClock = false; }
      } else {
        state.visibleElements.leaderboard = false;
      }
      saveControlPanelSettings(); 
      syncState(); 
    });

    if (toggleRaceClock) toggleRaceClock.addEventListener('change', () => { state.visibleElements.raceClock = toggleRaceClock.checked; saveControlPanelSettings(); syncState(); });
    if (toggleBanner) toggleBanner.addEventListener('change', () => { state.visibleElements.banner = toggleBanner.checked; saveControlPanelSettings(); syncState(); });
  } if (toggleLowerThird) toggleLowerThird.addEventListener('change', () => { state.visibleElements.lowerThird = toggleLowerThird.checked; saveControlPanelSettings(); syncState(); });
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
  if (gridModeSelect) gridModeSelect.addEventListener('change', () => { 
    state.gridMode = gridModeSelect.value; 
    if (state.gridMode === 'startlist') {
      state.isRaceStarted = false;
      liveRaceStartMs = null;
      state.raceClockTime = '00:00:00';
      if (panelClockTime) panelClockTime.innerText = '00:00:00';
      if (raceStatusBadge) {
        raceStatusBadge.className = 'status-badge status-info';
        raceStatusBadge.innerText = 'PRE-RACE (STANDBY)';
      }
    }
    saveControlPanelSettings(); 
    syncState(); 
  });

  if (startRaceGunBtn) {
    startRaceGunBtn.addEventListener('click', () => {
      state.isRaceStarted = true;
      liveRaceStartMs = Date.now();
      state.gridMode = 'livesplits';
      if (gridModeSelect) gridModeSelect.value = 'livesplits';
      if (raceStatusBadge) {
        raceStatusBadge.className = 'status-badge status-success';
        raceStatusBadge.innerText = 'RACE LIVE (ACTIVE)';
      }
      if (panelClockTime) panelClockTime.innerText = '00:00:00';
      state.raceClockTime = '00:00:00';
      saveControlPanelSettings();
      syncState();
      updateStatus('Gun Fired! Real live running timer is now active on broadcast.', 'success');
    });
  }

  if (resetRaceClockBtn) {
    resetRaceClockBtn.addEventListener('click', () => {
      state.isRaceStarted = false;
      liveRaceStartMs = null;
      state.gridMode = 'startlist';
      if (gridModeSelect) gridModeSelect.value = 'startlist';
      if (raceStatusBadge) {
        raceStatusBadge.className = 'status-badge status-info';
        raceStatusBadge.innerText = 'PRE-RACE (STANDBY)';
      }
      if (panelClockTime) panelClockTime.innerText = '00:00:00';
      state.raceClockTime = '00:00:00';
      state.leaderboard = REAL_ATHLETE_PAIRS_DEFAULT.map((p, i) => ({
        rank: i + 1,
        bib: p.bib,
        name: p.name,
        club: p.club || 'Battle of Gyms',
        nat: p.nat || 'IND',
        split: '',
        time: '',
        delta: ''
      }));
      saveControlPanelSettings();
      syncState();
      updateStatus('Reset to Pre-Race Starting List. Timer reset to 00:00:00.', 'info');
    });
  }

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
      case '5':
        if (toggleTimer) { toggleTimer.checked = !toggleTimer.checked; state.visibleElements.showTimer = toggleTimer.checked; saveControlPanelSettings(); syncState(); }
        break;
      case '6':
        if (toggleClubs) { toggleClubs.checked = !toggleClubs.checked; state.visibleElements.showClubs = toggleClubs.checked; saveControlPanelSettings(); syncState(); }
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







