// ==================== public/js/ui.js (COMPLETO) ====================
// Interface do usuário

const UIManager = {
  elements: {
    homeTemp: document.getElementById('home-temp'),
    homeHum: document.getElementById('home-hum'),
    homePres: document.getElementById('home-pres'),
    homeTimestamp: document.getElementById('home-timestamp'),
    tempMedia: document.getElementById('temp-media'),
    tempVariacao: document.getElementById('temp-variacao'),
    tempAtual: document.getElementById('temp-atual'),
    humMedia: document.getElementById('hum-media'),
    humVariacao: document.getElementById('hum-variacao'),
    humAtual: document.getElementById('hum-atual'),
    presMedia: document.getElementById('pres-media'),
    presVariacao: document.getElementById('pres-variacao'),
    presAtual: document.getElementById('pres-atual')
  },

  showLoading() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => card.classList.add('skeleton'));
    if (this.elements.homeTimestamp) {
      this.elements.homeTimestamp.innerHTML = '<span class="spinner"></span>';
    }
  },

  hideLoading() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => card.classList.remove('skeleton'));
  },

  updateTimestamp(dataInfo) {
    if (!this.elements.homeTimestamp) return;
    
    const now = new Date();
    let statusHtml = '';
    let statusClass = '';
    
    if (dataInfo.is_online === true) {
      statusHtml = `
        <span style="color: #66ff66;">🟢 ONLINE</span>
        <span style="color: #66ff66; font-size: 0.65rem;">ESP32 conectada - Dados em tempo real</span>
      `;
      statusClass = 'online';
    } else if (dataInfo.is_online === false && dataInfo.from_cache) {
      statusHtml = `
        <span style="color: #ffaa44;">🟡 OFFLINE</span>
        <span style="color: #ffaa44; font-size: 0.65rem;">ESP32 desconectada - Dados de ${dataInfo.data_age}</span>
      `;
      statusClass = 'offline';
    } else if (dataInfo.is_online === false) {
      statusHtml = `
        <span style="color: #ff6666;">🔴 OFFLINE</span>
        <span style="color: #ff6666; font-size: 0.65rem;">Sem conexão com a ESP32</span>
      `;
      statusClass = 'offline';
    } else {
      statusHtml = `
        <span style="color: #ffaa44;">🟡 VERIFICANDO...</span>
        <span style="color: #ffaa44; font-size: 0.65rem;">Aguardando resposta da ESP32</span>
      `;
      statusClass = 'checking';
    }
    
    this.elements.homeTimestamp.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 5px; text-align: center;">
        <span style="font-size: 0.7rem;">🕐 ${now.toLocaleTimeString('pt-BR')}</span>
        <div style="display: flex; flex-direction: column; gap: 3px;">
          ${statusHtml}
        </div>
      </div>
    `;
    
    // Adicionar classe ao body para estilização global
    document.body.classList.remove('online-status', 'offline-status', 'checking-status');
    document.body.classList.add(`${statusClass}-status`);
    
    // Atualizar badge de status
    this.updateStatusBadge(dataInfo.is_online, dataInfo.message);
  },

  updateStatusBadge(isOnline, message) {
    let badge = document.getElementById('statusBadge');
    let dot = document.getElementById('statusDot');
    let text = document.getElementById('statusText');
    
    if (!badge) {
      // Criar badge se não existir
      const container = document.createElement('div');
      container.id = 'statusBadge';
      container.className = 'status-badge';
      container.innerHTML = `
        <div class="status-dot checking" id="statusDot"></div>
        <span id="statusText">Verificando ESP32...</span>
      `;
      document.body.appendChild(container);
      badge = container;
      dot = document.getElementById('statusDot');
      text = document.getElementById('statusText');
    }
    
    if (dot && text) {
      if (isOnline === true) {
        dot.className = 'status-dot online';
        text.innerText = 'ESP32 Online';
        text.style.color = '#66ff66';
      } else if (isOnline === false) {
        dot.className = 'status-dot offline';
        text.innerText = message || 'ESP32 Offline';
        text.style.color = '#ff6666';
      } else {
        dot.className = 'status-dot checking';
        text.innerText = 'Verificando ESP32...';
        text.style.color = '#ffaa44';
      }
    }
  },

  showAlerts(alerts) {
    if (!alerts || alerts.length === 0) return;
    
    // Criar container de alertas se não existir
    let alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
      alertContainer = document.createElement('div');
      alertContainer.id = 'alert-container';
      alertContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(alertContainer);
    }
    
    alerts.forEach(alert => {
      const alertDiv = document.createElement('div');
      const isCritical = alert.includes('⚠️');
      const isDiscrepancy = alert.includes('🔍');
      
      let borderColor = '#ffaa44';
      if (isCritical) borderColor = '#ff4444';
      if (isDiscrepancy) borderColor = '#44aaff';
      
      alertDiv.style.cssText = `
        background: rgba(0,0,0,0.9);
        backdrop-filter: blur(10px);
        border-left: 4px solid ${borderColor};
        padding: 12px 16px;
        border-radius: 12px;
        color: white;
        font-size: 0.85rem;
        animation: slideIn 0.3s ease;
        pointer-events: auto;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        font-family: 'Inter', sans-serif;
      `;
      alertDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span>${alert.includes('⚠️') ? '⚠️' : alert.includes('🔍') ? '🔍' : 'ℹ️'}</span>
          <span style="flex: 1;">${alert}</span>
          <span style="font-size: 12px; opacity: 0.6;">✕</span>
        </div>
      `;
      
      alertDiv.onclick = (e) => {
        if (e.target !== alertDiv) return;
        alertDiv.style.animation = 'fadeOut 0.2s ease';
        setTimeout(() => alertDiv.remove(), 200);
      };
      
      alertContainer.appendChild(alertDiv);
      
      // Remover após 10 segundos
      setTimeout(() => {
        if (alertDiv.parentNode) {
          alertDiv.style.animation = 'fadeOut 0.2s ease';
          setTimeout(() => alertDiv.remove(), 200);
        }
      }, 10000);
    });
  },

  updateHomeDisplay(data) {
    if (this.elements.homeTemp) {
      this.elements.homeTemp.innerText = data.temp !== null ? data.temp + ' °C' : '--';
    }
    if (this.elements.homeHum) {
      this.elements.homeHum.innerText = data.hum !== null ? data.hum + ' %' : '--';
    }
    if (this.elements.homePres) {
      this.elements.homePres.innerText = data.pres !== null ? data.pres + ' hPa' : '--';
    }
  },

  updateStats(stats) {
    if (this.elements.tempMedia) {
      this.elements.tempMedia.innerText = stats.temp.media !== '--' ? stats.temp.media + ' °C' : '--';
      this.elements.tempVariacao.innerText = stats.temp.variacao !== '--' ? stats.temp.variacao + ' °C' : '--';
    }
    if (this.elements.humMedia) {
      this.elements.humMedia.innerText = stats.hum.media !== '--' ? stats.hum.media + ' %' : '--';
      this.elements.humVariacao.innerText = stats.hum.variacao !== '--' ? stats.hum.variacao + ' %' : '--';
    }
    if (this.elements.presMedia) {
      this.elements.presMedia.innerText = stats.pres.media !== '--' ? stats.pres.media + ' hPa' : '--';
      this.elements.presVariacao.innerText = stats.pres.variacao !== '--' ? stats.pres.variacao + ' hPa' : '--';
    }
  },

  updateCurrentValues(temp, hum, pres) {
    if (this.elements.tempAtual) {
      this.elements.tempAtual.innerText = temp !== null ? temp + ' °C' : '--';
    }
    if (this.elements.humAtual) {
      this.elements.humAtual.innerText = hum !== null ? hum + ' %' : '--';
    }
    if (this.elements.presAtual) {
      this.elements.presAtual.innerText = pres !== null ? pres + ' hPa' : '--';
    }
  },

  navigateTo(sectionId) {
    const sections = {
      home: document.getElementById('home-section'),
      temp: document.getElementById('grafico-temp-section'),
      hum: document.getElementById('grafico-hum-section'),
      pres: document.getElementById('grafico-pres-section'),
      ultimas: document.getElementById('grafico-ultimas-section')
    };
    
    Object.values(sections).forEach(s => {
      if (s) s.classList.remove('active');
    });
    if (sections[sectionId]) sections[sectionId].classList.add('active');
    AppState.currentSection = sectionId;
    
    this.updateMenuActive(sectionId);
  },

  updateMenuActive(sectionId) {
    const menuItems = document.querySelectorAll('#graficosSubmenu li[data-section]');
    menuItems.forEach(item => item.classList.remove('active'));
    if (sectionId !== 'home' && sectionId !== 'ultimas') {
      const activeItem = Array.from(menuItems).find(item => item.dataset.section === sectionId);
      if (activeItem) activeItem.classList.add('active');
    }
    if (sectionId === 'ultimas') {
      const ultimasItem = Array.from(menuItems).find(item => item.dataset.section === 'ultimas');
      if (ultimasItem) ultimasItem.classList.add('active');
    }
  },

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }
};

// Adicionar animações CSS dinamicamente
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes fadeOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
  
  .status-badge {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(8px);
    padding: 8px 16px;
    border-radius: 30px;
    font-size: 0.75rem;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Inter', sans-serif;
    border: 1px solid rgba(255,255,255,0.1);
    pointer-events: none;
  }
  
  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    animation: pulse 1.5s infinite;
  }
  
  .status-dot.online {
    background: #66ff66;
    box-shadow: 0 0 8px #66ff66;
  }
  
  .status-dot.offline {
    background: #ff6666;
    box-shadow: 0 0 8px #ff6666;
  }
  
  .status-dot.checking {
    background: #ffaa44;
    box-shadow: 0 0 8px #ffaa44;
    animation: pulse 0.8s infinite;
  }
  
  @keyframes pulse {
    0% { opacity: 0.5; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.2); }
    100% { opacity: 0.5; transform: scale(0.8); }
  }
  
  /* Status das bordas dos cards */
  .online-status .card {
    border-left: 3px solid #66ff66;
  }
  
  .offline-status .card {
    border-left: 3px solid #ffaa44;
  }
  
  /* Efeito de loading nos cards */
  .card.skeleton {
    position: relative;
    overflow: hidden;
  }
  
  .card.skeleton::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
    animation: shimmer 1.5s infinite;
  }
  
  @keyframes shimmer {
    100% { left: 100%; }
  }
  
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255,255,255,0.1);
    border-top-color: var(--card-hover-border, #ff6666);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    display: inline-block;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

// Função global de navegação
window.navegarPara = (sectionId) => UIManager.navigateTo(sectionId);