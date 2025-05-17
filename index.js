const { getAnimeList: getAnidubList, getAnimeDetails: getAnidubDetails, delay } = require('./parsers/anidub');
const { getAnimeList: getVostList, getAnimeDetails: getVostDetails, delay: vostDelay } = require('./parsers/animevost');
const fs = require('fs/promises');
const path = require('path');

(async () => {
  try {
    // Anidub
    // console.log('Получаем список аниме с Anidub...');
    // const list = await getAnidubList(1);
    // console.log(`Найдено аниме: ${list.length}`);
    // if (list.length > 0) {
    //   console.log('Получаем подробную информацию о первом аниме...');
    //   const details = await getAnidubDetails(list[0].link);
    //   console.dir(details, { depth: null });
    // }
    // AnimeVost
    // Определяем, сколько страниц доступно
    const totalPages = await require('./parsers/animevost').getMaxPages();
    console.log(`Всего страниц в пагинации AnimeVost: ${totalPages}`);
    console.log('Получаем список аниме со всех страниц...');
    const vostList = await getVostList();
    console.log(`Найдено аниме: ${vostList.length}`);
    await fs.writeFile('animevost_list.json', JSON.stringify(vostList, null, 2), 'utf-8');
    console.log('Список аниме сохранён в animevost_list.json');

    // 2. Читаем этот файл, парсим подробности по каждому аниме и сохраняем всё в один файл
    const rawList = await fs.readFile('animevost_list.json', 'utf-8');
    const animeList = JSON.parse(rawList);
    const detailsList = [];
    for (let i = 0; i < animeList.length; i++) {
      const anime = animeList[i];
      try {
        console.log(`[${i+1}/${animeList.length}] Парсим: ${anime.title}`);
        const details = await getVostDetails(anime.link);
        detailsList.push(details);
        await vostDelay(20); // задержка между запросами
      } catch (err) {
        console.error(`Ошибка при парсинге ${anime.link}:`, err.message);
      }
    }
    await fs.writeFile('animevost.json', JSON.stringify(detailsList, null, 2), 'utf-8');
    console.log('Все подробности сохранены в одном файле animevost.json');
  } catch (err) {
    console.error('Ошибка:', err);
  }
})();
