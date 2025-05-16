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
    console.log('\nПолучаем список аниме с AnimeVost...');
    const vostList = await getVostList(300);
    console.log(`Найдено аниме: ${vostList.length}`);
    await fs.writeFile('animevost_list.json', JSON.stringify(vostList, null, 2), 'utf-8');
    console.log('Список аниме сохранён в animevost_list.json');


    for (let i = 0; i < vostList.length; i++) {
      const anime = vostList[i];
      try {
        console.log(`[${i+1}/${vostList.length}] Парсим: ${anime.title}`);
        const details = await getVostDetails(anime.link);
        const fileName = path.join('animevost_details', `${details._id || i}.json`);
        await fs.mkdir('animevost_details', { recursive: true });
        await fs.writeFile(fileName, JSON.stringify(details, null, 2), 'utf-8');
        await vostDelay(200); // задержка между запросами
      } catch (err) {
        console.error(`Ошибка при парсинге ${anime.link}:`, err.message);
      }
    }
    console.log('Все подробности сохранены в папке animevost_details');
  } catch (err) {
    console.error('Ошибка:', err);
  }
})();
