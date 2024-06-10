require('dotenv').config();
const fs = require('fs');
const cheerio = require('cheerio');
const { Command } = require('commander');
const { saveToJson, saveToCsv, saveToExcel } = require('./modules/saveData');
const generateReport = require('./modules/generateReport');
const fetchPage = require('./modules/fetchPage');
const extractData = require('./modules/extractData');
const logger = require('./modules/logger');
const { delay } = require('./modules/utils');

// Função para carregar a configuração
function loadConfig() {
  const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
  return config;
}

// Função para lidar com a paginação
async function fetchAllPages(query, config) {
  let pageNumber = 0;
  let articles = [];
  let url = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;

  while (pageNumber < config.maxPages) {
    try {
      const html = await fetchPage(url, config);
      const newArticles = await extractData(html);
      articles = articles.concat(newArticles);

      const $ = cheerio.load(html);
      const nextPageLink = $('td a.gs_nma').last().attr('href');
      if (!nextPageLink) break;

      url = `https://scholar.google.com${nextPageLink}`;
      pageNumber++;

      // Atraso configurável entre requisições
      await delay(config.delayBetweenRequests);
    } catch (error) {
      logger.error(`Erro ao processar a página ${pageNumber}: ${error.message}`);
      break;
    }
  }

  return articles;
}

// Função principal para testar a extração com entrada de consultas
async function main(queries, outputFormat) {
  const config = loadConfig();
  let allArticles = [];
  let articlesByQuery = [];

  for (const query of queries) {
    logger.info(`Buscando artigos para a consulta: ${query}`);
    const articles = await fetchAllPages(query, config);
    allArticles = allArticles.concat(articles);
    articlesByQuery.push(articles);
  }

  // Salvar os dados no formato especificado
  if (outputFormat === 'json') {
    saveToJson(allArticles, 'articles.json');
  } else if (outputFormat === 'csv') {
    await saveToCsv(articlesByQuery, 'articles.csv');
  } else if (outputFormat === 'excel') {
    await saveToExcel(articlesByQuery, 'articles.xlsx');
  }

  // Gerar relatório detalhado
  generateReport(articlesByQuery);
}

const program = new Command();

program
  .version('1.0.0')
  .description('Google Scholar Crawler')
  .option('-q, --queries <queries>', 'Consultas de pesquisa separadas por vírgula', val => val.split(','))
  .option('-f, --format <format>', 'Formato de saída (json, csv, excel)', 'json')
  .parse(process.argv);

const options = program.opts();

if (!options.queries) {
  console.error('Por favor, forneça as consultas de pesquisa usando a opção -q ou --queries.');
  process.exit(1);
}

main(options.queries, options.format);
