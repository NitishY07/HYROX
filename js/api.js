/**
 * Mika Timing AppAPI Engine
 * Bypasses browser CORS using built-in Server Proxy /api/proxy
 */
class MikaTimingAPI {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'https://apihub-staging.mikatiming.net/ah/rest/appapi';
    this.apiKey = config.apiKey || 'sportvot';
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
   * Endpoint: GET /meetinginfo/races
   */
  async getRaces() {
    const data = await this.request('/meetinginfo/races');
    return data.races || [];
  }

  /**
   * 3. Get Events List
   * Endpoint: GET /meetinginfo/events
   */
  async getEvents() {
    const data = await this.request('/meetinginfo/events');
    return data.events || [];
  }

  /**
   * 4. Get Race Results / Participations
   */
  async getRaceResults(idRace, idMeeting, eventKey) {
    try {
      if (idRace) {
        const data = await this.request(`/meetinginfo/race/${idRace}/results`);
        if (data && data.results) return data.results;
      }
    } catch (e1) {
      if (idMeeting && eventKey) {
        try {
          const data = await this.request(`/meetinginfo/meeting/${idMeeting}/event/key/${eventKey}/leaders`);
          if (data && data.leaders) return data.leaders;
        } catch (e2) {
          if (idMeeting) {
            const data = await this.request(`/meetinginfo/meeting/${idMeeting}/participations/basic`);
            if (data && data.participations) return data.participations;
          }
        }
      }
    }
    throw new Error('Results endpoint restricted or no active race results on this API key');
  }
}

if (typeof window !== 'undefined') {
  window.MikaTimingAPI = MikaTimingAPI;
}
