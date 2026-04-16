// Serviço de API
const API = {
  async request(endpoint, options = {}) {
    try {
      const url = `${CONFIG.API_BASE_URL}${endpoint}`;
      console.log('📡 Requisição:', url);
      
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log('✅ Resposta:', data);
      return data;
    } catch (error) {
      console.error(`❌ API Error [${endpoint}]:`, error);
      throw error;
    }
  },

  async getLatest() {
    return this.request('/weather/latest');
  },

  async getHistory(limit = CONFIG.MAX_HISTORY) {
    return this.request(`/weather/history/${limit}`);
  },

  async saveConfig(channelId, readApiKey) {
    return this.request('/weather/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, readApiKey })
    });
  },

  async exportExcel(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    window.location.href = `${CONFIG.API_BASE_URL}/export/excel${params ? '?' + params : ''}`;
  },

  async exportCSV(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    window.location.href = `${CONFIG.API_BASE_URL}/export/csv${params ? '?' + params : ''}`;
  },

  async exportJSON(filters = {}) {
    return this.request(`/export/json${params ? '?' + params : ''}`);
  }
};