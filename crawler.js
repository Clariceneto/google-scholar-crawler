const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { createLogger, transports, format } = require('winston');

// Logger Configuration

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'crawler.log' })
    ]
});

// Function to load the configuration

function loadConfig() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
    return config;
}

// Function to send request to Google Scholar using Puppeteer

async function fetchPage(url) {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const content = await page.content();
        await browser.close();

        return content;
    } catch (error) {
        logger.error(`Erro ao buscar a página: ${error.message}`);
        throw error;
    }
}

// Function to extract data using cheerio

async function extractData(html) {
    const $ = cheerio.load(html);
    const articles = [];

    $('.gs_r.gs_or.gs_scl').each((index, element) => {
        const title = $(element).find('.gs_rt a').text();
        const authors = $(element).find('.gs_a').text();
        const abstract = $(element).find('.gs_rs').text();
        const link = $(element).find('.gs_rt a').attr('href');

        articles.push({
            title,
            authors,
            abstract,
            link
        });
    });

    return articles;
}

// Function to add a delay between requests

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to handle pagination

async function fetchAllPages(query, config) {
    let pageNumber = 0;
    let articles = [];
    let url = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;

    while (pageNumber < config.maxPages) {
        try {
            const html = await fetchPage(url);
            const newArticles = await extractData(html);
            articles = articles.concat(newArticles);

            const $ = cheerio.load(html);
            const nextPageLink = $('td a.gs_nma').last().attr('href');
            if (!nextPageLink) break;

            url = `https://scholar.google.com${nextPageLink}`;
            pageNumber++;

            // Configurable delay between requests

            await delay(config.delayBetweenRequests);
        } catch (error) {
            logger.error(`Erro ao processar a página ${pageNumber}: ${error.message}`);
            break;
        }
    }

    return articles;
}

// Function to save data in JSON

function saveToJson(articles, filename) {
    fs.writeFileSync(filename, JSON.stringify(articles, null, 2));
    logger.info(`Dados salvos em ${filename}`);
}

// Function to save data in CSV with delimiters

async function saveToCsv(articlesByQuery, filename) {
    const csvWriter = createCsvWriter({
        path: filename,
        header: [
            { id: 'title', title: 'Title' },
            { id: 'authors', title: 'Authors' },
            { id: 'abstract', title: 'Abstract' },
            { id: 'link', title: 'Link' }
        ]
    });

    let records = [];
    articlesByQuery.forEach((articles, index) => {
        records = records.concat(articles);
        if (index < articlesByQuery.length - 1) {
            records.push({ title: '', authors: '', abstract: '', link: '' });
            records.push({ title: '', authors: '', abstract: '', link: '' });
        }
    });

    await csvWriter.writeRecords(records);
    logger.info(`Dados salvos em ${filename}`);
}

// Main function to test extraction with query input

async function main() {
    const config = loadConfig();
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Digite suas consultas de pesquisa separadas por vírgula: ', async (queries) => {
        const queriesArray = queries.split(',').map(query => query.trim());
        let allArticles = [];
        let articlesByQuery = [];

        for (const query of queriesArray) {
            logger.info(`Buscando artigos para a consulta: ${query}`);
            const articles = await fetchAllPages(query, config);
            allArticles = allArticles.concat(articles);
            articlesByQuery.push(articles);
        }

        // Save the data to a JSON file

        saveToJson(allArticles, 'articles.json');

        // Save the data to a CSV file with delimiters
        await saveToCsv(articlesByQuery, 'articles.csv');

        rl.close();
    });
}

main();
