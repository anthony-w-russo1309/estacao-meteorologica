// Configurações globais
const CONFIG = {
  API_BASE_URL: '/api',  // mudado para relativo
  UPDATE_INTERVAL: 15000,
  MAX_HISTORY: 120,
  CHART_COLORS: {
    temp: '#ff6384',
    hum: '#36a2eb',
    pres: '#ffce56'
  }
};

// Estado global
let AppState = {
  history: { temp: [], hum: [], pres: [] },
  currentSection: 'home',
  currentUltimaTab: 'temp',
  charts: { temp: null, hum: null, pres: null, ultimas: null },
  abortController: null
};