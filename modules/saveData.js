const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const ExcelJS = require('exceljs');
const logger = require('./logger');

function saveToJson(articles, filename) {
  fs.writeFileSync(filename, JSON.stringify(articles, null, 2));
  logger.info(`Dados salvos em ${filename}`);
}

async function saveToCsv(articlesByQuery, filename) {
  const csvWriter = createCsvWriter({
    path: filename,
    header: [
      { id: 'title', title: 'Title' },
      { id: 'authors', title: 'Authors' },
      { id: 'abstract', title: 'Abstract' },
      { id: 'link', title: 'Link' },
      { id: 'citationCount', title: 'Citations' }
    ]
  });

  let records = [];
  articlesByQuery.forEach((articles, index) => {
    records = records.concat(articles);
    if (index < articlesByQuery.length - 1) {
      records.push({ title: '', authors: '', abstract: '', link: '', citationCount: '' });
      records.push({ title: '', authors: '', abstract: '', link: '', citationCount: '' });
    }
  });

  await csvWriter.writeRecords(records);
  logger.info(`Dados salvos em ${filename}`);
}

async function saveToExcel(articlesByQuery, filename) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Articles');

  worksheet.columns = [
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Authors', key: 'authors', width: 30 },
    { header: 'Abstract', key: 'abstract', width: 50 },
    { header: 'Link', key: 'link', width: 30 },
    { header: 'Citations', key: 'citationCount', width: 10 }
  ];

  articlesByQuery.forEach((articles, index) => {
    articles.forEach(article => worksheet.addRow(article));
    if (index < articlesByQuery.length - 1) {
      worksheet.addRow({});
      worksheet.addRow({});
    }
  });

  await workbook.xlsx.writeFile(filename);
  logger.info(`Dados salvos em ${filename}`);
}

module.exports = {
  saveToJson,
  saveToCsv,
  saveToExcel
};
