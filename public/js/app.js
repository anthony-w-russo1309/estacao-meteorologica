// Aplicação principal
// Função corrigida para formatar timestamp no gráfico
function formatTimestampForChart(timestamp) {
  if (!timestamp) return '--:--:--';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '--:--:--';
  return date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
}
// O resto do arquivo permanece igual...
(async function() {
  'use strict';

  console.log('🚀 Iniciando aplicação...');

  // ==================== FUNÇÕES DE DADOS ====================
  function calcStats(arr) {
    if (!arr.length) return { media: '--', variacao: '--' };
    const sum = arr.reduce((a, b) => a + b, 0);
    const media = (sum / arr.length).toFixed(1);
    const variacao = (Math.max(...arr) - Math.min(...arr)).toFixed(1);
    return { media, variacao };
  }

  function formatTimestampForChart(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }

  async function fetchAndUpdate() {
    console.log('🔄 Buscando dados...');
    UIManager.showLoading();
    
    try {
      const response = await API.getLatest();
      console.log('📊 Dados recebidos:', response);
      
      if (response && response.success && response.data) {
        const data = response.data;
        const temp = data.field1 ? parseFloat(data.field1) : null;
        const hum = data.field2 ? parseFloat(data.field2) : null;
        const pres = data.field3 ? parseFloat(data.field3) : null;
        const isOffline = response.offline || false;
        const fromCache = data.from_cache || false;
        const isStale = data.is_stale || false;
        const dataAge = data.data_age || null;
        
        console.log(`🌡️ Temp: ${temp}, 💧 Hum: ${hum}, 📊 Pres: ${pres}`);
        console.log(`📦 Cache: ${fromCache}, 📡 Obsoleto: ${isStale}, ⏱️ Idade: ${dataAge}`);
        
        UIManager.updateHomeDisplay({ temp, hum, pres });
        UIManager.updateCurrentValues(temp, hum, pres);
        
        // Atualizar timestamp com status
        UIManager.updateTimestamp({
          from_cache: fromCache,
          is_stale: isStale,
          data_age: dataAge,
          is_offline: isOffline
        });
        
        // Adicionar ao histórico APENAS se os dados são novos (não do cache antigo)
        const now = new Date();
        const dataTimestamp = data.created_at ? new Date(data.created_at) : now;
        
        if (!fromCache || (fromCache && !isStale)) {
          if (temp !== null) AppState.history.temp.push({ value: temp, timestamp: dataTimestamp });
          if (hum !== null) AppState.history.hum.push({ value: hum, timestamp: dataTimestamp });
          if (pres !== null) AppState.history.pres.push({ value: pres, timestamp: dataTimestamp });
          console.log('📝 Dados adicionados ao histórico');
        } else if (temp !== null && AppState.history.temp.length === 0) {
          // Primeira carga, usar cache
          if (temp !== null) AppState.history.temp.push({ value: temp, timestamp: dataTimestamp });
          if (hum !== null) AppState.history.hum.push({ value: hum, timestamp: dataTimestamp });
          if (pres !== null) AppState.history.pres.push({ value: pres, timestamp: dataTimestamp });
          console.log('📝 Primeira carga - usando cache');
        }
        
        // Limitar histórico
        if (AppState.history.temp.length > CONFIG.MAX_HISTORY) AppState.history.temp.shift();
        if (AppState.history.hum.length > CONFIG.MAX_HISTORY) AppState.history.hum.shift();
        if (AppState.history.pres.length > CONFIG.MAX_HISTORY) AppState.history.pres.shift();
        
        // Calcular estatísticas
        const stats = {
          temp: calcStats(AppState.history.temp.map(v => v.value)),
          hum: calcStats(AppState.history.hum.map(v => v.value)),
          pres: calcStats(AppState.history.pres.map(v => v.value))
        };
        UIManager.updateStats(stats);
        
        // Preparar timestamps para os gráficos (com hora:minuto:segundo)
        const timestamps = AppState.history.temp.map(t => 
          formatTimestampForChart(t.timestamp)
        );
        
        // Atualizar gráficos
        ChartManager.updateChart(AppState.charts.temp, AppState.history.temp.map(v => v.value), timestamps);
        ChartManager.updateChart(AppState.charts.hum, AppState.history.hum.map(v => v.value), timestamps);
        ChartManager.updateChart(AppState.charts.pres, AppState.history.pres.map(v => v.value), timestamps);
        
        if (AppState.charts.ultimas) {
          let dataValues;
          if (AppState.currentUltimaTab === 'temp') dataValues = AppState.history.temp.map(v => v.value);
          else if (AppState.currentUltimaTab === 'hum') dataValues = AppState.history.hum.map(v => v.value);
          else dataValues = AppState.history.pres.map(v => v.value);
          
          const ultimaTimestamps = AppState.history[AppState.currentUltimaTab].map(t => 
            formatTimestampForChart(t.timestamp)
          );
          
          AppState.charts.ultimas.data.datasets[0].data = dataValues;
          AppState.charts.ultimas.data.labels = ultimaTimestamps;
          AppState.charts.ultimas.update();
        }
      } else if (response && response.offline) {
        UIManager.updateTimestamp({ is_offline: true });
      }
    } catch (error) {
      console.error('❌ Erro na atualização:', error);
      UIManager.updateTimestamp({ is_offline: true });
    } finally {
      UIManager.hideLoading();
    }
  }

  // ==================== INICIALIZAÇÃO DOS GRÁFICOS ====================
  function initCharts() {
    console.log('📈 Inicializando gráficos...');
    AppState.charts.temp = ChartManager.initChart('tempChartPage', 'Temperatura (°C)', [], CONFIG.CHART_COLORS.temp);
    AppState.charts.hum = ChartManager.initChart('humChartPage', 'Umidade (%)', [], CONFIG.CHART_COLORS.hum);
    AppState.charts.pres = ChartManager.initChart('presChartPage', 'Pressão (hPa)', [], CONFIG.CHART_COLORS.pres);
    AppState.charts.ultimas = ChartManager.initChart('ultimasChart', 'Temperatura (°C)', [], CONFIG.CHART_COLORS.temp);
  }

  // ==================== MENU LATERAL ====================
  function setupMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('menuOverlay');
    const closeBtn = document.getElementById('closeDrawer');
    const graficosHeader = document.getElementById('graficosHeader');
    const graficosSubmenu = document.getElementById('graficosSubmenu');
    const configHeader = document.getElementById('configHeader');
    const configSubmenu = document.getElementById('configSubmenu');
    const inicioHeader = document.getElementById('inicioHeader');
    const menuItems = document.querySelectorAll('#graficosSubmenu li[data-section]');
    const apiConfigItem = document.getElementById('apiConfigItem');
    const toggleParticlesItem = document.getElementById('toggleParticlesMenuItem');
    const cancelApiBtn = document.getElementById('cancelApiBtn');
    const saveApiBtn = document.getElementById('saveApiBtn');
    const channelIdInput = document.getElementById('channelIdInput');
    
    function openMenu() {
      drawer.classList.add('open');
      overlay.classList.add('active');
    }
    
    function closeMenu() {
      drawer.classList.remove('open');
      overlay.classList.remove('active');
    }
    
    if (menuToggle) menuToggle.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);
    if (inicioHeader) inicioHeader.addEventListener('click', () => UIManager.navigateTo('home'));
    
    if (menuItems) {
      menuItems.forEach(item => {
        item.addEventListener('click', () => {
          const section = item.dataset.section;
          UIManager.navigateTo(section);
          closeMenu();
        });
      });
    }
    
    function toggleSubmenu(header, submenu) {
      if (!header || !submenu) return;
      header.classList.toggle('collapsed');
      submenu.classList.toggle('collapsed');
    }
    
    if (graficosHeader && graficosSubmenu) {
      graficosHeader.addEventListener('click', () => toggleSubmenu(graficosHeader, graficosSubmenu));
    }
    if (configHeader && configSubmenu) {
      configHeader.addEventListener('click', () => toggleSubmenu(configHeader, configSubmenu));
    }
    
    // Configuração de API
    if (apiConfigItem) {
      apiConfigItem.addEventListener('click', () => UIManager.showModal('apiModal'));
    }
    if (cancelApiBtn) {
      cancelApiBtn.addEventListener('click', () => UIManager.hideModal('apiModal'));
    }
    if (saveApiBtn && channelIdInput) {
      saveApiBtn.addEventListener('click', async () => {
        const newId = channelIdInput.value.trim();
        if (newId) {
          await API.saveConfig(newId, '');
          AppState.history = { temp: [], hum: [], pres: [] };
          fetchAndUpdate();
        }
        UIManager.hideModal('apiModal');
      });
    }
    
    // Partículas
    let particlesOn = true;
    if (toggleParticlesItem) {
      toggleParticlesItem.addEventListener('click', () => {
        particlesOn = !particlesOn;
        document.body.classList.toggle('particles-off', !particlesOn);
        toggleParticlesItem.innerHTML = particlesOn 
          ? '<svg class="icon icon-particles" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><circle cx="12" cy="12" r="2"/></svg> Desativar partículas'
          : '<svg class="icon icon-particles" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><circle cx="12" cy="12" r="2"/></svg> Ativar partículas';
        closeMenu();
      });
    }
  }

  // ==================== TEMAS ====================
  function setupThemes() {
    const themeItems = document.querySelectorAll('#temasSubmenuConfig li[data-theme]');
    const body = document.body;
    
    function applyTheme(themeName) {
      body.className = body.className.replace(/theme-\w+/g, '').trim();
      body.classList.add(`theme-${themeName}`);
      localStorage.setItem('station-theme', themeName);
      console.log('🎨 Tema aplicado:', themeName);
    }
    
    const savedTheme = localStorage.getItem('station-theme') || 'classic';
    applyTheme(savedTheme);
    
    if (themeItems) {
      themeItems.forEach(item => {
        item.addEventListener('click', () => {
          applyTheme(item.dataset.theme);
        });
      });
    }
  }

  // ==================== ÚLTIMAS HORAS ====================
  function setupUltimasTabs() {
    const tabs = document.querySelectorAll('.ultimas-tab');
    if (!tabs.length) return;
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tipo = tab.dataset.ultima;
        AppState.currentUltimaTab = tipo;
        
        if (AppState.charts.ultimas) {
          let dataValues, label, color;
          if (tipo === 'temp') {
            dataValues = AppState.history.temp.map(v => v.value);
            label = 'Temperatura (°C)';
            color = CONFIG.CHART_COLORS.temp;
          } else if (tipo === 'hum') {
            dataValues = AppState.history.hum.map(v => v.value);
            label = 'Umidade (%)';
            color = CONFIG.CHART_COLORS.hum;
          } else {
            dataValues = AppState.history.pres.map(v => v.value);
            label = 'Pressão (hPa)';
            color = CONFIG.CHART_COLORS.pres;
          }
          const timestamps = AppState.history[tipo].map(t => 
            formatTimestampForChart(t.timestamp)
          );
          AppState.charts.ultimas.data.datasets[0].label = label;
          AppState.charts.ultimas.data.datasets[0].data = dataValues;
          AppState.charts.ultimas.data.datasets[0].borderColor = color;
          AppState.charts.ultimas.data.labels = timestamps;
          AppState.charts.ultimas.update();
        }
      });
    });
  }

  // ==================== INICIALIZAÇÃO ====================
  console.log('🎯 Inicializando componentes...');
  
  initCharts();
  setupMenu();
  setupThemes();
  setupUltimasTabs();
  
  // Configurar filtros
  if (typeof FilterManager !== 'undefined' && FilterManager.setupEventListeners) {
    FilterManager.setupEventListeners();
  }
  
  // Primeira busca
  await fetchAndUpdate();
  
  // Atualização periódica
  setInterval(fetchAndUpdate, CONFIG.UPDATE_INTERVAL);
  
  console.log('✅ Aplicação inicializada com sucesso!');
})();