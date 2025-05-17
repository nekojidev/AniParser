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
      await delay(200);
    } catch (err) {
      break;
    }
  }
  return animeList;
}

async function getAnimeDetails(animeUrl) {
  const baseUrl = 'https://animevost.org';
  const { data: html } = await axios.get(animeUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(html);

  // Extract iframe and video sources
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

  // Title
  const headerText = $('.shortstoryHead h1').first().text().trim();
  const title = headerText.split('[')[0].trim();

  // Poster
  let poster = $('img.imgRadius').first().attr('src') || null;
  if (poster && !poster.startsWith('http')) poster = baseUrl + poster;

  // Static info: release date, views, comments, uploader
  const releaseDate = $('.staticInfoLeftData').first().text().trim() || null;
  const viewCount = parseInt($('.staticInfoRightSmotr').first().text().replace(/\D/g, ''), 10) || null;
  const commentsCount = parseInt($('a#dle-comm-link').first().text().replace(/\D/g, ''), 10) || null;
  const uploader = $('.staticInfoLeft a').first().text().trim() || null;

  // Description
  const description = $('[itemprop="description"]').first().text().trim() || null;

  // Year
  let year = null;
  const yearMatch = $('p:contains("Год выхода")').text().match(/Год выхода:\s*(\d{4})/);
  if (yearMatch) year = parseInt(yearMatch[1], 10);

  // Genres
  let genres = [];
  const genreText = $('p:contains("Жанр")').text().replace('Жанр:', '').trim();
  if (genreText) genres = genreText.split(',').map(g => g.trim());

  // Type
  const typeText = $('p:contains("Тип")').text().replace('Тип:', '').trim() || null;

  // Episode count
  let episodesCount = null;
  const episodesMatch = $('p:contains("Количество серий")').text().match(/Количество серий:\s*(\d+)/);
  if (episodesMatch) episodesCount = parseInt(episodesMatch[1], 10);

  // Director(s)
  const directors = $('p:contains("Режиссёр") a').map((i, el) => $(el).text().trim()).get();

  // Tags
  const tags = $('#shortstoryContentTegi a').map((i, el) => $(el).text().trim()).get();

  // Categories
  const categories = $('.shortstoryFuter span a').map((i, el) => $(el).text().trim()).get();

  // Franchises (спиноффы)
  const franchises = [];
  $('.text_spoiler ol li a').each((i, el) => {
    const name = $(el).text().trim();
    let link = $(el).attr('href');
    if (link && !link.startsWith('http')) link = baseUrl + link;
    if (name) franchises.push({ name, link });
  });

  // Episodes list from embedded script
  const episodesList = {};
  const scriptTag = $('script').filter((i, el) => $(el).html().includes('var data')).first().html() || '';
  const dataMatch = scriptTag.match(/var\s+data\s*=\s*(\{[\s\S]*?\});/);
  if (dataMatch) {
    try {
      const epData = JSON.parse(dataMatch[1]);
      Object.entries(epData).forEach(([key, val]) => {
        const numMatch = key.match(/(\d+)/);
        const num = numMatch ? parseInt(numMatch[1], 10) : null;
        if (num !== null) {
          episodesList[num] = {
            episode: num,
            name: key,
            uuid: uuidv4(),
            created_timestamp: null,
            preview: val ? `https://media.aniland.org/img/${val}.jpg` : null,
            skips: { opening: [], ending: [] },
            hls: null
          };
        }
      });
    } catch (e) {
      // ignore parse errors
    }
  }

  // Build player object
  const player = {
    episodes: {
      first: episodesCount ? 1 : null,
      last: episodesCount,
      string: episodesCount ? `1-${episodesCount}` : null
    },
    list: episodesList,
    alternative_player: iframes.length ? iframes : null,
    sources: videoSources.length ? videoSources : null,
    host: iframes[0] ? new URL(iframes[0]).host : null,
    is_rutube: false
  };

  // Assemble and return detailed anime object
  return {
    _id: uuidv4(),
    apiId: "animevost",
    title,
    titles: { ru: title, en: null, alternative: null },
    poster,
    description,
    year,
    type: typeText,
    type_code: null,
    status: null,
    status_string: null,
    episodes: episodesCount,
    genres,
    team: {
      voice: [],
      translator: [],
      editing: [],
      decor: [],
      timing: []
    },
    player,
    torrents: { episodes: { first: null, last: null, string: null }, list: [] },
    releaseDate,
    viewCount,
    commentsCount,
    uploader,
    tags,
    categories,
    franchises,
    directors,
    createdAt: releaseDate
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