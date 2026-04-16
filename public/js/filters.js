// Gerenciador de filtros para exportação
const FilterManager = {
  showFilterModal() {
    const modal = document.getElementById('filterModal');
    if (modal) modal.classList.add('active');
  },

  hideFilterModal() {
    const modal = document.getElementById('filterModal');
    if (modal) modal.classList.remove('active');
  },

  getFilters() {
    const dataInicio = document.getElementById('filterDataInicio')?.value;
    const dataFim = document.getElementById('filterDataFim')?.value;
    const limite = document.getElementById('filterLimite')?.value;
    
    const params = new URLSearchParams();
    if (dataInicio) params.append('dataInicio', dataInicio);
    if (dataFim) params.append('dataFim', dataFim);
    if (limite && limite !== 'all') params.append('limite', limite);
    
    return params.toString();
  },

  async exportWithFilters(format = 'excel') {
    const params = this.getFilters();
    const url = `/api/export/${format}${params ? '?' + params : ''}`;
    
    if (format === 'json') {
      const response = await fetch(url);
      const data = await response.json();
      console.log('Dados exportados:', data);
      return data;
    } else {
      window.location.href = url;
    }
  },

  setupEventListeners() {
    const exportBtns = ['exportExcelBtn', 'exportExcelBtnTemp', 'exportExcelBtnHum', 'exportExcelBtnPres', 'exportExcelBtnUltimas'];
    exportBtns.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showFilterModal();
        });
      }
    });
    
    const applyBtn = document.getElementById('applyFilterBtn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.exportWithFilters('excel');
        this.hideFilterModal();
      });
    }
    
    const cancelBtn = document.getElementById('cancelFilterBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.hideFilterModal();
      });
    }
  }
};