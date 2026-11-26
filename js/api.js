/**
 * Mika Timing AppAPI Engine
 * Bypasses browser CORS using built-in Server Proxy /api/proxy
 */
class MikaTimingAPI {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'https://apihub.mikatiming.net/ah/rest/appapi';
    this.apiKey = config.apiKey || 'sportvot-vhzj2id';
    this.apiVersion = config.apiVersion || '1';
  }

  /**
   * Set API Configuration
   */
  setConfig(baseUrl, apiKey) {
    if (baseUrl) {
      this.baseUrl = baseUrl.replace(/\/+$/, '');
    }
    if (apiKey) {
      this.apiKey = apiKey.trim();
    }
  }

  /**
   * Core HTTP Request method using Server-side CORS Proxy
   */
  async request(endpoint, params = {}) {
    // Construct full destination URL
    let targetUrl = `${this.baseUrl}${endpoint}`;
    
    const query = new URLSearchParams();
    if (this.apiKey) {
      query.append('apiKey', this.apiKey);
    }
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        query.append(key, params[key]);
      }
    });

    const queryString = query.toString();
    if (queryString) {
      targetUrl += (targetUrl.includes('?') ? '&' : '?') + queryString;
    }

    // Pass through local proxy to bypass browser CORS restrictions
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}&apiKey=${encodeURIComponent(this.apiKey)}&apiVersion=${encodeURIComponent(this.apiVersion)}`;

    try {
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Check for AppAPI level error objects
      if (data.items && Array.isArray(data.items)) {
        const errors = data.items.filter(item => item.level === 'error');
        if (errors.length > 0) {
          const msg = errors.map(e => e.messageText).join(' | ');
          throw new Error(`API Error: ${msg}`);
        }
      }

      return data;
    } catch (err) {
      console.warn(`[MikaTimingAPI] Request failed for ${endpoint}:`, err);
      throw err;
    }
  }

  /**
   * 1. Get Meetings List
   * Endpoint: GET /meetinginfo/meetings
   */
  async getMeetings(query = '') {
    const params = {};
    if (query) params.q = query;
    const data = await this.request('/meetinginfo/meetings', params);
    return data.meetings || [];
  }

  /**
   * 2. Get Races List
   * Endpoint: GET /meetinginfo/meeting/{idMeeting}/races or /meetinginfo/races
   */
  async getRaces(idMeeting) {
    const endpoint = idMeeting ? `/meetinginfo/meeting/${idMeeting}/races` : '/meetinginfo/races';
    const data = await this.request(endpoint);
    return data.races || [];
  }

  /**
   * 3. Get Events List
   * Endpoint: GET /meetinginfo/meeting/{idMeeting}/events or /meetinginfo/events
   */
  async getEvents(idMeeting) {
    const endpoint = idMeeting ? `/meetinginfo/meeting/${idMeeting}/events` : '/meetinginfo/events';
    const data = await this.request(endpoint);
    const allEvents = data.events || [];
    const uniqueEvents = [];
    const seenKeys = new Set();
    for (const e of allEvents) {
      if (!seenKeys.has(e.key)) {
        seenKeys.add(e.key);
        uniqueEvents.push(e);
      }
    }
    return uniqueEvents;
  }

  /**
   * 4. Get Race Results / Participations for specific Event Key & Meeting ID
   */
  async getRaceResults(idRace, idMeeting, eventKey) {
    const meetingId = idMeeting || 'LR3MS4JI1A59';
    const key = eventKey || 'BOG';
    const paginationParams = { pageStart: 0, pageMaxCount: 500 };

    // 1. Try Event Key Leaders Endpoint (provides live intermediate station splits and positions during active race)
    try {
      const data = await this.request(`/meetinginfo/meeting/${meetingId}/event/key/${key}/leaders`, paginationParams);
      if (data && data.leaders && data.leaders.length > 0) {
        return data.leaders;
      }
    } catch (e1) {
      console.info(`[MikaTimingAPI] /event/key/${key}/leaders info:`, e1.message);
    }

    // 2. Try Event Key Leaders Split Endpoint
    try {
      const data = await this.request(`/meetinginfo/meeting/${meetingId}/event/key/${key}/leaders/split`, paginationParams);
      if (data && data.leaders && data.leaders.length > 0) {
        return data.leaders;
      }
    } catch (e2) {
      console.info(`[MikaTimingAPI] /event/key/${key}/leaders/split info:`, e2.message);
    }

    // 3. Try Event Key Results Endpoint (provides official finish times)
    try {
      const data = await this.request(`/meetinginfo/meeting/${meetingId}/event/key/${key}/results`, paginationParams);
      if (data && data.results && data.results.length > 0) {
        return data.results;
      }
    } catch (e3) {
      console.info(`[MikaTimingAPI] /event/key/${key}/results info:`, e3.message);
    }

    // 4. Return Registered Participations from Production API (before race starts, loads all participants)
    try {
      const data = await this.request(`/meetinginfo/meeting/${meetingId}/event/key/${key}/participations`, paginationParams);
      if (data && data.participations && data.participations.length > 0) {
        return data.participations;
      }
    } catch (e4) {}

    throw new Error(`No active live results returned for Meeting ${meetingId} and Key ${key}`);
  }
}

if (typeof window !== 'undefined') {
  window.MikaTimingAPI = MikaTimingAPI;
}

const api = new MikaTimingAPI();



