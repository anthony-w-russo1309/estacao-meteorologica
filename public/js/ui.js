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
    
    if (dataInfo.is_offline) {
      statusHtml = '<span style="color: #ff6666;">🔴 OFFLINE - Sem conexão com a ESP</span>';
    } else if (dataInfo.from_cache && dataInfo.is_stale) {
      statusHtml = `<span style="color: #ffaa44;">⚠️ Dados antigos (${dataInfo.data_age}) - ESP pode estar offline</span>`;
    } else if (dataInfo.from_cache) {
      statusHtml = `<span style="color: #ffaa44;">📦 Dados do cache (${dataInfo.data_age})</span>`;
    } else {
      statusHtml = `<span style="color: #66ff66;">🟢 Online - Dados em tempo real</span>`;
    }
    
    this.elements.homeTimestamp.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 5px;">
        <span>🕐 ${now.toLocaleTimeString('pt-BR')}</span>
        <span style="font-size: 0.7rem;">${statusHtml}</span>
      </div>
    `;
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

// Função global de navegação
window.navegarPara = (sectionId) => UIManager.navigateTo(sectionId);