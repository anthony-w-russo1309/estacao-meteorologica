const XLSX = require('xlsx');
const database = require('../database');

class ExportService {
  async fetchFilteredData(filtros = {}) {
    return await database.buscarLeituras(filtros);
  }

  async generateExcel(filtros = {}) {
    const data = await this.fetchFilteredData(filtros);
    
    // Dados brutos
    const wsData = [
      ['Timestamp', 'Temperatura (°C)', 'Umidade (%)', 'Pressão (hPa)'],
      ...data.map(d => [
        new Date(d.timestamp).toLocaleString('pt-BR'),
        d.temperatura || '',
        d.umidade || '',
        d.pressao || ''
      ])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Ajustar largura das colunas
    ws['!cols'] = [{wch:20}, {wch:15}, {wch:12}, {wch:12}];
    
    // Estatísticas
    const stats = await database.obterEstatisticas(filtros.dataInicio, filtros.dataFim);
    const wsStats = XLSX.utils.aoa_to_sheet([
      ['Estatísticas do Período'],
      ['Total de leituras', stats.total || 0],
      ['Temperatura - Média', stats.temp_media ? stats.temp_media.toFixed(1) + ' °C' : '--'],
      ['Temperatura - Mínima', stats.temp_min ? stats.temp_min.toFixed(1) + ' °C' : '--'],
      ['Temperatura - Máxima', stats.temp_max ? stats.temp_max.toFixed(1) + ' °C' : '--'],
      ['Umidade - Média', stats.hum_media ? stats.hum_media.toFixed(1) + ' %' : '--'],
      ['Umidade - Mínima', stats.hum_min ? stats.hum_min.toFixed(1) + ' %' : '--'],
      ['Umidade - Máxima', stats.hum_max ? stats.hum_max.toFixed(1) + ' %' : '--'],
      ['Pressão - Média', stats.pres_media ? stats.pres_media.toFixed(1) + ' hPa' : '--'],
      ['Pressão - Mínima', stats.pres_min ? stats.pres_min.toFixed(1) + ' hPa' : '--'],
      ['Pressão - Máxima', stats.pres_max ? stats.pres_max.toFixed(1) + ' hPa' : '--']
    ]);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    XLSX.utils.book_append_sheet(wb, wsStats, 'Estatísticas');
    
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async generateCSV(filtros = {}) {
    const data = await this.fetchFilteredData(filtros);
    const headers = ['Timestamp,Temperatura (°C),Umidade (%),Pressão (hPa)'];
    const rows = data.map(d => 
      `${new Date(d.timestamp).toLocaleString('pt-BR')},${d.temperatura || ''},${d.umidade || ''},${d.pressao || ''}`
    );
    return [...headers, ...rows].join('\n');
  }

  async generateJSON(filtros = {}) {
    return this.fetchFilteredData(filtros);
  }
}

module.exports = new ExportService();