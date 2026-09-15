// Единственный файл, который правится руками.
// Меняй тексты и даты — остальное подтянется само.
window.SITE = {
  name: "Аня",

  // День рождения, MM-DD — от него считается обратный отсчёт на обложке
  birthday: "09-16",

  // С какого дня вы вместе, YYYY-MM-DD
  togetherSince: "2012-08-25",

  intro: {
    kicker: "16 сентября",
    subtitle: "Нажми — и дальше всё само",
    button: "Включить",
    hint: "Лучше со звуком и на весь экран",
  },

  // Реплики, которые всплывают поверх фотографий по ходу слайдшоу.
  // type: "line" — строка письма, "date" — важная дата.
  moments: [
    { type: "line", text: "Я не умею говорить такое вслух, поэтому — вот так." },
    { type: "date", label: "конец августа 2012", text: "Мы начали встречаться" },
    { type: "line", text: "Четырнадцать лет — и я до сих пор ищу тебя глазами в любой комнате." },
    { type: "date", label: "25 июля 2014", text: "Поженились" },
    { type: "line", text: "Ты сказала «да», и с тех пор я просто везучий." },
    { type: "date", label: "27 января 2019", text: "Родился Глеб" },
    { type: "line", text: "Теперь нас трое, и дом стал шумным. Так гораздо лучше." },
    { type: "line", text: "Спасибо, что ты выбираешь чудеса." },
    { type: "line", text: "С днём рождения, Аня. Люблю тебя." },
  ],

  // Порядок треков важен — в нём они и играют
  tracks: [
    { src: "assets/music/01-lana-del-rey-young-and-beautiful.mp3", title: "Young and Beautiful", artist: "Lana Del Rey" },
    { src: "assets/music/02-zaz-la-lessive.mp3", title: "La Lessive", artist: "ZAZ" },
    { src: "assets/music/03-beautiful-boys-ty-vybiraesh-chudesa.mp3", title: "Ты выбираешь чудеса", artist: "Beautiful Boys" },
  ],

  finale: {
    title: "С днём рождения",
    text: "Это только те фотографии, что нашлись. Остальное — впереди.",
    again: "Ещё раз",
    gallery: "Все фотографии",
  },

  gallery: {
    title: "Все фотографии",
    emptyText: "Фотографии скоро появятся здесь.",
    back: "Вернуться к слайдшоу",
  },
};
