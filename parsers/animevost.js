const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Задержка между запросами (мс)
 */
const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Получить список аниме со всех страниц AnimeVost, автоматический перебор до пустой страницы
 * @returns {Promise<Array<{title: string, link: string, poster: string}>>}
 */
async function getAnimeList() {
  const baseUrl = 'https://animevost.org';
  const animeList = [];
  let page = 1;
  while (true) {
    const url = page === 1 ? `${baseUrl}/` : `${baseUrl}/page/${page}/`;
    try {
      const { data: html } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const $ = cheerio.load(html);
      const items = $('.shortstory');
      if (!items.length) break;
      items.each((i, el) => {
        const a = $(el).find('.shortstoryHead h2 a');
        let link = a.attr('href');
        if (link && !link.startsWith('http')) link = baseUrl + link;
        const title = a.text().trim();
        let poster = $(el).find('.short-img img').attr('src');
        if (poster && !poster.startsWith('http')) poster = baseUrl + poster;
        if (title && link) animeList.push({ title, link, poster });
      });
      page += 1;
      await delay(1000);
    } catch (err) {
      break;
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
  const baseUrl = 'https://animevost.org';
  const { data: html } = await axios.get(animeUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(html);

  // Заголовок и постер
  const title = $('.shortstoryHead h2 a').first().text().trim();
  let poster = $('.short-img img').attr('src');
  if (poster && !poster.startsWith('http')) poster = baseUrl + poster;

  // Описание
  let description = $('.shortstoryContent').text().trim();
  if (!description) description = $('.short-story').text().trim();

  // Дата релиза (первый статик-инфо элемент)
  const releaseDate = $('.staticInfoLeftData').first().text().trim() || null;

  // Ссылки плеера: iframe и video source
  const iframes = $('iframe').map((i, el) => {
    let src = $(el).attr('src');
    if (src && !src.startsWith('http')) src = baseUrl + src;
    return src;
  }).get().filter(Boolean);
  const videoSources = $('video source').map((i, el) => {
    let src = $(el).attr('src');
    if (src && !src.startsWith('http')) src = baseUrl + src;
    return src;
  }).get().filter(Boolean);

  const player = {
    alternative_player: iframes.length ? iframes : null,
    sources: videoSources.length ? videoSources : null,
    host: iframes[0] ? new URL(iframes[0]).host : null
  };

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

  // Возвращаем объект с дополнительными полями
  return {
    _id: uuidv4(),
    apiId: null,
    title,
    titles: { ru: title, en: null, alternative: null },
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
    player,
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

/**
 * Определить максимальное количество страниц пагинации на сайте AnimeVost
 * @returns {Promise<number>} - Максимальный номер страницы
 */
async function getMaxPages() {
  const baseUrl = 'https://animevost.org';
  const { data: html } = await axios.get(`${baseUrl}/`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const $ = cheerio.load(html);
  // Собирать номера страниц из ссылок пагинации
  const pageNums = $('a[href^="/page/"]').map((i, el) => {
    const href = $(el).attr('href');
    const match = href.match(/\/page\/(\d+)\//);
    return match ? parseInt(match[1], 10) : null;
  }).get().filter(n => n);
  return pageNums.length ? Math.max(...pageNums) : 1;
}

module.exports = { getAnimeList, getAnimeDetails, getMaxPages, delay }; 