const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Задержка между запросами (мс)
 */
const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Получить список аниме с главной и страниц пагинации AnimeVost
 * @param {number} maxPages - сколько страниц парсить
 * @returns {Promise<Array<{title: string, link: string, poster: string}>>}
 */
async function getAnimeList(maxPages = 1) {
  const baseUrl = 'https://animevost.org';
  const animeList = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? `${baseUrl}/` : `${baseUrl}/page/${page}/`;
    try {
      const { data: html } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const $ = cheerio.load(html);
      $('.shortstory').each((i, el) => {
        const a = $(el).find('.shortstoryHead h2 a');
        let link = a.attr('href');
        if (link && !link.startsWith('http')) link = baseUrl + link;
        const title = a.text().trim();
        let poster = $(el).find('.short-img img').attr('src');
        if (poster && !poster.startsWith('http')) poster = baseUrl + poster;
        if (title && link) {
          animeList.push({ title, link, poster });
        }
      });
      await delay(1000);
    } catch (err) {
      continue;
    }
  }
  return animeList;
}

/**
 * Получить подробную информацию об аниме с AnimeVost
 * @param {string} animeUrl - URL страницы аниме
 * @returns {Promise<Object>} - Объект с подробной информацией
 */
async function getAnimeDetails(animeUrl) {
  const { data: html } = await axios.get(animeUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const $ = cheerio.load(html);

  // Основные поля
  const title = $('.title').first().text().trim();
  const poster = $('.short-img img').attr('src');
  const description = $('.short-story').text().trim();

  // Пример парсинга дополнительных полей (жанры, год и т.д.)
  let year = null;
  let genres = [];
  $('.short-info').each((i, el) => {
    const text = $(el).text();
    const yearMatch = text.match(/Год:\s*(\d{4})/);
    if (yearMatch) year = parseInt(yearMatch[1], 10);
    const genresMatch = text.match(/Жанр:\s*([\w\s,]+)/);
    if (genresMatch) genres = genresMatch[1].split(',').map(g => g.trim());
  });

  // Возвращаем объект максимально приближенный к структуре Anilibria
  return {
    _id: uuidv4(),
    apiId: null,
    title,
    titles: {
      ru: title,
      en: null,
      alternative: null
    },
    poster,
    description,
    year,
    type: null,
    type_code: null,
    status: null,
    status_string: null,
    episodes: null,
    genres,
    team: {
      voice: [],
      translator: [],
      editing: [],
      decor: [],
      timing: []
    },
    player: {
      episodes: {
        first: null,
        last: null,
        string: null
      },
      list: {},
      alternative_player: null,
      host: null,
      is_rutube: false
    },
    torrents: {
      episodes: {
        first: null,
        last: null,
        string: null
      },
      list: []
    },
    lastChange: null,
    updated: null,
    season: {
      string: null,
      code: null,
      year: null,
      week_day: null
    },
    franchises: [],
    blocked: {
      copyrights: false,
      geoip: false,
      geoip_list: []
    },
    in_favorites: null,
    code: null,
    announce: null,
    createdAt: null
  };
}

module.exports = { getAnimeList, getAnimeDetails, delay }; 