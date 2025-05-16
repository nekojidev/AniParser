const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Задержка между запросами (мс)
 */
const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Получить список аниме со всех основных разделов Anidub
 * @param {number} maxPages - сколько страниц парсить в каждом разделе
 * @returns {Promise<Array<{title: string, link: string, poster: string, section: string}>>}
 */
async function getAnimeList(maxPages = 1) {
  const sections = [
    'anime_tv',
    'anime_movie',
    'anime_ova',
    'anime_ona',
    'anime_ongoing',
    'full'
  ];
  const baseUrl = 'https://anidub.biz';
  const animeList = [];

  for (const section of sections) {
    for (let page = 1; page <= maxPages; page++) {
      const url = `${baseUrl}/${section}/page/${page}/`;
      try {
        const { data: html } = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(html);
        // Новый селектор карточек аниме
        $('.th-item.js-blurred-target').each((i, el) => {
          const a = $(el).find('a.th-in');
          const link = a.attr('href');
          let poster = $(el).find('.th-img img').attr('src');
          if (poster && !poster.startsWith('http')) poster = baseUrl + poster;
          // Название: основной title и alt у постера
          let title = $(el).find('.th-title').text().trim();
          if (!title) title = $(el).find('.th-img img').attr('alt')?.trim() || '';
          if (title && link) {
            animeList.push({ title, link, poster, section });
          }
        });
        await delay(1000); // задержка между запросами
      } catch (err) {
        // Если страница не найдена или другая ошибка — пропускаем
        continue;
      }
    }
  }
  return animeList;
}

/**
 * Получить подробную информацию об аниме с Anidub
 * @param {string} animeUrl - URL страницы аниме
 * @returns {Promise<Object>} - Объект с подробной информацией
 */
async function getAnimeDetails(animeUrl) {
  const { data: html } = await axios.get(animeUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const $ = cheerio.load(html);

  // Основные поля
  const title = $('.content-title').text().trim() || $('.title').text().trim();
  const poster = $('.poster img').attr('src') || $('.fullimg img').attr('src');
  const description = $('.full-story').text().trim() || $('.full-text').text().trim();

  // Пример парсинга дополнительных полей (жанры, год и т.д.)
  let year = null;
  let genres = [];
  $('.full-story').each((i, el) => {
    const text = $(el).text();
    const yearMatch = text.match(/Год выпуска:\s*(\d{4})/);
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