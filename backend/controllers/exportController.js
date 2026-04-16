const exportService = require('../services/exportService');

class ExportController {
  async exportToExcel(req, res) {
    try {
      const { dataInicio, dataFim, limite } = req.query;
      const filtros = {};
      if (dataInicio) filtros.dataInicio = dataInicio;
      if (dataFim) filtros.dataFim = dataFim;
      if (limite) filtros.limite = parseInt(limite);
      
      const buffer = await exportService.generateExcel(filtros);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=estacao_${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async exportToCSV(req, res) {
    try {
      const { dataInicio, dataFim, limite } = req.query;
      const filtros = {};
      if (dataInicio) filtros.dataInicio = dataInicio;
      if (dataFim) filtros.dataFim = dataFim;
      if (limite) filtros.limite = parseInt(limite);
      
      const csv = await exportService.generateCSV(filtros);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=estacao_${Date.now()}.csv`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async exportToJSON(req, res) {
    try {
      const { dataInicio, dataFim, limite } = req.query;
      const filtros = {};
      if (dataInicio) filtros.dataInicio = dataInicio;
      if (dataFim) filtros.dataFim = dataFim;
      if (limite) filtros.limite = parseInt(limite);
      
      const data = await exportService.generateJSON(filtros);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ExportController();