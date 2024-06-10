const cheerio = require('cheerio');

async function extractData(html) {
  const $ = cheerio.load(html);
  const articles = [];

  $('.gs_r.gs_or.gs_scl').each((index, element) => {
    const title = $(element).find('.gs_rt a').text();
    const authors = $(element).find('.gs_a').text();
    const abstract = $(element).find('.gs_rs').text();
    const link = $(element).find('.gs_rt a').attr('href');
    const citationCount = $(element).find('.gs_fl a').first().text().match(/\d+/);

    articles.push({
      title,
      authors,
      abstract,
      link,
      citationCount: citationCount ? parseInt(citationCount[0]) : 0
    });
  });

  return articles;
}

module.exports = extractData;
