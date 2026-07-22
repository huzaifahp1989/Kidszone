export interface IslamicMonth {
  /** 1-based month number in the Hijri year. */
  number: number;
  /** Kid-friendly English spelling used across the app. */
  name: string;
  /** Arabic script name. */
  arabic: string;
  /** Short meaning / what the name refers to. */
  meaning: string;
  /** A friendly emoji to represent the month. */
  emoji: string;
  /** One or two sentence summary a child can understand. */
  summary: string;
  /** Bite-size facts kids can learn about the month. */
  facts: string[];
  /** True for the four sacred months (fighting was forbidden). */
  sacred?: boolean;
}

export const ISLAMIC_MONTHS: IslamicMonth[] = [
  {
    number: 1,
    name: 'Muharram',
    arabic: 'ٱلْمُحَرَّم',
    meaning: 'The Forbidden / Sacred month',
    emoji: '🌙',
    summary:
      'Muharram is the very first month of the Islamic year. It is one of the four sacred months and a special time to do good.',
    facts: [
      'It is the start of the Islamic (Hijri) New Year.',
      'The 10th day is called the Day of Ashura.',
      'Many Muslims fast on the Day of Ashura to thank Allah.',
      'It is one of the four sacred months in Islam.',
    ],
    sacred: true,
  },
  {
    number: 2,
    name: 'Safar',
    arabic: 'صَفَر',
    meaning: 'Empty / whistling wind',
    emoji: '🍃',
    summary:
      'Safar is the second month. Long ago the Arabs left their homes to travel during this month, so it means "empty".',
    facts: [
      'It is the second month of the Hijri calendar.',
      'There is nothing unlucky about this month — Islam teaches us not to believe in bad omens.',
      'It is a normal month to keep learning and doing good deeds.',
    ],
  },
  {
    number: 3,
    name: 'Rabi al-Awwal',
    arabic: 'رَبِيع ٱلْأَوَّل',
    meaning: 'The first spring',
    emoji: '🌸',
    summary:
      'Rabi al-Awwal is the third month. Our beloved Prophet Muhammad ﷺ was born in this month.',
    facts: [
      'The Prophet Muhammad ﷺ was born in this month.',
      'The name means "the first spring".',
      'Muslims love to send extra blessings (salawat) on the Prophet ﷺ.',
    ],
  },
  {
    number: 4,
    name: 'Rabi al-Thani',
    arabic: 'رَبِيع ٱلْآخِر',
    meaning: 'The second spring',
    emoji: '🌷',
    summary: 'Rabi al-Thani is the fourth month, meaning "the second spring".',
    facts: [
      'It is the fourth month of the Hijri calendar.',
      'It comes right after Rabi al-Awwal.',
      'A good time to keep up your daily prayers and kindness.',
    ],
  },
  {
    number: 5,
    name: 'Jumada al-Awwal',
    arabic: 'جُمَادَىٰ ٱلْأُولَىٰ',
    meaning: 'The first of dry land / frozen',
    emoji: '❄️',
    summary:
      'Jumada al-Awwal is the fifth month. Its name comes from the cold, dry season when water would freeze.',
    facts: [
      'It is the fifth month of the Hijri calendar.',
      'The name is linked to cold, dry weather.',
      'Keep warming your heart with good deeds!',
    ],
  },
  {
    number: 6,
    name: 'Jumada al-Thani',
    arabic: 'جُمَادَىٰ ٱلْآخِرَة',
    meaning: 'The second of dry land',
    emoji: '🧊',
    summary: 'Jumada al-Thani is the sixth month, the second of the two "Jumada" months.',
    facts: [
      'It is the sixth month of the Hijri calendar.',
      'It is the halfway point of the Islamic year.',
      'A great time to check your good-deed goals.',
    ],
  },
  {
    number: 7,
    name: 'Rajab',
    arabic: 'رَجَب',
    meaning: 'To respect / honour',
    emoji: '✨',
    summary:
      'Rajab is the seventh month and one of the four sacred months. Muslims prepare their hearts as Ramadan gets closer.',
    facts: [
      'It is one of the four sacred months.',
      'The name means to honour and respect.',
      'The amazing Night Journey (Isra and Mi‘raj) is remembered in this month.',
      'Many people start getting ready for Ramadan.',
    ],
    sacred: true,
  },
  {
    number: 8,
    name: "Sha'ban",
    arabic: 'شَعْبَان',
    meaning: 'To scatter / spread out',
    emoji: '🌟',
    summary:
      "Sha'ban is the eighth month, just before Ramadan. The Prophet ﷺ used to fast a lot during this month.",
    facts: [
      'It comes right before Ramadan.',
      'The Prophet ﷺ loved to fast in this month.',
      'A perfect time to practise for Ramadan.',
    ],
  },
  {
    number: 9,
    name: 'Ramadan',
    arabic: 'رَمَضَان',
    meaning: 'Burning heat',
    emoji: '🌙',
    summary:
      'Ramadan is the ninth month — the month of fasting! The Holy Quran was first revealed in this blessed month.',
    facts: [
      'Muslims fast from dawn (Fajr) until sunset (Maghrib).',
      'The Holy Quran was first revealed in this month.',
      'It has a very special night called Laylatul Qadr (the Night of Power).',
      'Fasting is one of the five pillars of Islam.',
    ],
  },
  {
    number: 10,
    name: 'Shawwal',
    arabic: 'شَوَّال',
    meaning: 'To lift / carry',
    emoji: '🎉',
    summary:
      'Shawwal is the tenth month. It begins with a happy celebration — Eid al-Fitr!',
    facts: [
      'The 1st day is Eid al-Fitr, the festival after Ramadan.',
      'Many Muslims fast six extra days in Shawwal for great reward.',
      'It is a time of joy, gifts, and thanking Allah.',
    ],
  },
  {
    number: 11,
    name: 'Dhul-Qadah',
    arabic: 'ذُو ٱلْقَعْدَة',
    meaning: 'The one of sitting / truce',
    emoji: '🕊️',
    summary:
      'Dhul-Qadah is the eleventh month and one of the four sacred months. People would rest and stop fighting.',
    facts: [
      'It is one of the four sacred months.',
      'The name means "the month of sitting" (staying home in peace).',
      'It comes just before the month of Hajj.',
    ],
    sacred: true,
  },
  {
    number: 12,
    name: 'Dhul-Hijjah',
    arabic: 'ذُو ٱلْحِجَّة',
    meaning: 'The one of Hajj (pilgrimage)',
    emoji: '🕋',
    summary:
      'Dhul-Hijjah is the twelfth and last month. It is the month of Hajj and the celebration of Eid al-Adha.',
    facts: [
      'The great pilgrimage of Hajj takes place in this month.',
      'The 9th day is the Day of Arafah.',
      'The 10th day is Eid al-Adha, the festival of sacrifice.',
      'The first ten days are among the best days of the whole year.',
    ],
    sacred: true,
  },
];

/** Look up a month by its 1-based Hijri number. */
export function getIslamicMonth(number: number): IslamicMonth | undefined {
  return ISLAMIC_MONTHS.find((m) => m.number === number);
}
