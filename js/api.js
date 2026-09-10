class MikaTimingAPI {
  constructor() {
    this.baseUrl = '';
    this.apiKey = '';
    this.selectedMeetingId = '';
  }

  setConfig(baseUrl, apiKey) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async _fetch(path) {
    const proxyUrl = '/api/proxy?url=' + encodeURIComponent(this.baseUrl + path) + '&apiKey=' + encodeURIComponent(this.apiKey);
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error('API Error ' + res.status + ': ' + path);
    return res.json();
  }

  // GET /meeting — List all meetings
  async getMeetings() {
    const data = await this._fetch('/meeting');
    return Array.isArray(data) ? data : (data.meeting || data.meetings || data.data || []);
  }

  // GET /meeting/{idMeeting} — Get single meeting info
  async getMeetingInfo(idMeeting) {
    return await this._fetch('/meeting/' + idMeeting);
  }

  // GET /meeting/{idMeeting}/race — List all races
  async getRaces(idMeeting) {
    const id = idMeeting || this.selectedMeetingId || '';
    const data = await this._fetch('/meeting/' + id + '/race');
    return Array.isArray(data) ? data : (data.race || data.races || data.data || []);
  }

  // GET /meeting/{idMeeting}/event — List all event categories
  async getEvents(idMeeting) {
    const id = idMeeting || this.selectedMeetingId || '';
    const data = await this._fetch('/meeting/' + id + '/event');
    return Array.isArray(data) ? data : (data.event || data.events || data.data || []);
  }

  // GET /meeting/{idMeeting}/race/{idRace}/result — Live race results (poll every 5s)
  async getRaceResults(idRace, idMeeting, eventKey) {
    const mid = idMeeting || this.selectedMeetingId || '';
    const rid = idRace || '';
    let path = '/meeting/' + mid + '/race/' + rid + '/result';
    if (eventKey) path += '?event=' + encodeURIComponent(eventKey);

    const data = await this._fetch(path);
    const raw = Array.isArray(data) ? data : (data.result || data.results || data.data || []);

    // Sort by rank ascending
    raw.sort((a, b) => {
      const rA = parseInt(a.rank || a.position || a.place || 9999, 10);
      const rB = parseInt(b.rank || b.position || b.place || 9999, 10);
      return rA - rB;
    });

    // Normalize all fields — 100% from API, no hardcoded names
    return raw.map((r, i) => ({
      rank     : parseInt(r.rank || r.position || r.place || i + 1, 10),
      bib      : r.bib || r.startNo || r.idParticipant || String(i + 1),
      name     : r.nameText
                 || r.displayName
                 || r.fullname
                 || r.name
                 || r.participantName
                 || (((r.firstname || r.first_name || r.fname || '') + ' ' + (r.lastname || r.last_name || r.lname || '')).trim())
                 || ('Athlete #' + (i + 1)),
      time     : r.timeText || r.time || r.splitTime || '',
      delta    : r.delta || '',
      club     : r.startGroup || r.clubname || r.club || r.raceTitle || '',
      nat      : r.nationality || r.nation || 'IND',
      split    : r.splitName || r.checkpointName || r.checkpoint || r.split || '',
      gunTimeMs: r.gunTimeMs || r.timeStart || r.startTimeMs || null
    }));
  }
}

const api = new MikaTimingAPI();
