// Exportação de dados
const ExportManager = {
  async exportExcel(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = `/api/export/excel${params ? '?' + params : ''}`;
      window.location.href = url;
    } catch (error) {
      console.error('Erro na exportação:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    }
  },

  async exportCSV(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = `/api/export/csv${params ? '?' + params : ''}`;
      window.location.href = url;
    } catch (error) {
      console.error('Erro na exportação:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    }
  },

  async exportJSON(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await fetch(`/api/export/json${params ? '?' + params : ''}`);
      return await response.json();
    } catch (error) {
      console.error('Erro na exportação:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    }
  }
};