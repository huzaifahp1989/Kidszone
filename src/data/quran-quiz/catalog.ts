import type { SurahCatalogEntry } from '@/data/quran-quiz/types'

/** Revelation type and key teaching hooks for every Surah in the quiz scope. */
export const SURAH_CATALOG: SurahCatalogEntry[] = [
  { number: 1, name: 'Al-Fatihah', revelation: 'Makki', themes: ['Opening of the Quran', 'Daily prayer'], fact: 'It is recited in every rakah of salah.', reference: '1:1-7' },
  { number: 2, name: 'Al-Baqarah', revelation: 'Madani', themes: ['Guidance', 'Law', 'Patience'], prophets: ['Adam', 'Ibrahim', 'Musa', 'Dawud', 'Sulaiman'], places: ['Makkah', 'Madinah'], reference: '2:255', fact: 'It contains Ayat al-Kursi, one of the greatest verses of the Quran.' },
  { number: 3, name: "Aal-Imran", revelation: 'Madani', themes: ['Family of Imran', 'Trials', 'Trust in Allah'], prophets: ['Isa', 'Musa', 'Ibrahim'], people: ['Maryam'], reference: '3:190-191', fact: 'It reminds believers to reflect on the signs of Allah in creation.' },
  { number: 4, name: 'An-Nisa', revelation: 'Madani', themes: ['Justice', 'Family rights', 'Orphans'], reference: '4:1', fact: 'Its name means "The Women" and teaches fairness in society.' },
  { number: 5, name: "Al-Ma'idah", revelation: 'Madani', themes: ['Covenant', 'Halal food', 'Justice'], prophets: ['Isa', 'Musa'], reference: '5:3', fact: 'It mentions the completion of the religion near its end.' },
  { number: 6, name: "Al-An'am", revelation: 'Makki', themes: ['Tawhid', 'Creation', 'Rejecting idols'], prophets: ['Ibrahim', 'Nuh', 'Musa', 'Isa'], reference: '6:162', fact: 'It strongly calls people away from worshipping idols.' },
  { number: 7, name: "Al-A'raf", revelation: 'Makki', themes: ['Stories of nations', 'The barrier', 'Humility'], prophets: ['Nuh', 'Hud', 'Salih', 'Shuayb', 'Musa'], story: 'Allah describes a barrier between Paradise and Hell called Al-A\'raf, where some souls wait.', reference: '7:46', fact: 'It narrates many destroyed nations who rejected their prophets.' },
  { number:  8, name: 'Al-Anfal', revelation: 'Madani', themes: ['Battle of Badr', 'Trust in Allah'], reference: '8:1', fact: 'It discusses the spoils after the first major battle of Islam.' },
  { number:  9, name: 'At-Tawbah', revelation: 'Madani', themes: ['Repentance', 'Sincerity'], reference: '9:128', fact: 'It is the only Surah that does not begin with Bismillah.' },
  { number: 10, name: 'Yunus', revelation: 'Makki', themes: ['Allah\'s mercy', 'Prophethood'], prophets: ['Yunus', 'Nuh', 'Musa'], story: 'A prophet called out to his people for years, left in frustration, and was swallowed by a huge fish before repenting.', reference: '10:98', fact: 'It is named after Prophet Yunus (Jonah).' },
  { number: 11, name: 'Hud', revelation: 'Makki', themes: ['Patience of prophets'], prophets: ['Hud', 'Nuh', 'Salih', 'Ibrahim', 'Musa'], story: 'Allah sent a prophet to the people of Ad who built tall buildings but worshipped idols and were destroyed by a violent wind.', reference: '11:50-60', fact: 'Prophet Hud preached to the people of Ad.' },
  { number: 12, name: 'Yusuf', revelation: 'Makki', themes: ['Patience', 'Forgiveness', 'Trust in Allah\'s plan'], prophets: ['Yusuf', 'Yaqub'], story: 'A young prophet was thrown into a well by jealous brothers, sold as a slave, tested with temptation, imprisoned unjustly, and later honoured as a leader.', reference: '12:3', fact: 'Allah calls it the best of stories.' },
  { number: 13, name: "Ar-Ra'd", revelation: 'Madani', themes: ['Signs in nature', 'Thunder'], reference: '13:28', fact: 'Hearts find rest in the remembrance of Allah.' },
  { number: 14, name: 'Ibrahim', revelation: 'Makki', themes: ['Gratitude', 'Du\'a of Ibrahim'], prophets: ['Ibrahim', 'Musa'], reference: '14:35-41', fact: 'It includes Ibrahim\'s beautiful dua for Makkah and his descendants.' },
  { number: 15, name: 'Al-Hijr', revelation: 'Makki', themes: ['Protection of revelation', 'Destroyed towns'], prophets: ['Ibrahim', 'Musa'], places: ['Al-Hijr'], reference: '15:9', fact: 'Allah promised to protect the Quran from corruption.' },
  { number: 16, name: 'An-Nahl', revelation: 'Makki', themes: ['Allah\'s blessings', 'Bees'], reference: '16:68-69', fact: 'It mentions the bee as a sign of Allah\'s wisdom.' },
  { number: 17, name: 'Al-Isra', revelation: 'Makki', themes: ['Night journey', 'Good character'], places: ['Masjid al-Aqsa', 'Makkah'], reference: '17:1', fact: 'It begins with the Isra, the night journey of the Prophet ﷺ.' },
  { number: 18, name: 'Al-Kahf', revelation: 'Makki', themes: ['Trials of faith', 'Youth', 'Knowledge'], prophets: ['Musa', 'Khidr'], story: 'Young believers fled idol worship and slept in a cave while Allah protected them for many years.', reference: '18:9-26', fact: 'Reciting it on Friday brings special light until the next Friday.' },
  { number: 19, name: 'Maryam', revelation: 'Makki', themes: ['Miraculous birth', 'Family of Imran'], prophets: ['Isa', 'Zakariyya'], people: ['Maryam'], story: 'A chaste mother was chosen by Allah and gave birth to Prophet Isa (AS) by a miraculous command of Allah.', reference: '19:16-21', fact: 'It is the only Surah named after a woman.' },
  { number: 20, name: 'Ta-Ha', revelation: 'Makki', themes: ['Call of Musa', 'Prayer'], prophets: ['Musa', 'Harun', 'Adam'], story: 'Allah spoke to Musa (AS) from the fire at Mount Tur and chose him to confront Pharaoh.', reference: '20:14', fact: 'It comforted the Prophet ﷺ in early Makkah.' },
  { number: 21, name: 'Al-Anbiya', revelation: 'Makki', themes: ['Stories of prophets'], prophets: ['Ibrahim', 'Nuh', 'Musa', 'Isa', 'Ayyub', 'Yunus', 'Dawud', 'Sulaiman'], reference: '21:107', fact: 'It says the Prophet ﷺ was sent as a mercy to the worlds.' },
  { number: 22, name: 'Al-Hajj', revelation: 'Madani', themes: ['Hajj', 'Resurrection'], reference: '22:27', fact: 'It mentions the rituals and purpose of Hajj.' },
  { number: 23, name: "Al-Mu'minun", revelation: 'Makki', themes: ['Qualities of believers', 'Creation stages'], reference: '23:1-11', fact: 'It lists traits of successful believers.' },
  { number: 24, name: 'An-Nur', revelation: 'Madani', themes: ['Modesty', 'Light of faith'], reference: '24:35', fact: 'It contains the verse of Nur about the light of Allah.' },
  { number: 25, name: 'Al-Furqan', revelation: 'Makki', themes: ['Criterion', 'Servants of the Most Merciful'], reference: '25:63', fact: 'It describes the beautiful manners of true servants of Allah.' },
  { number: 26, name: "Ash-Shu'ara", revelation: 'Makki', themes: ['Poets', 'Stories of prophets'], prophets: ['Musa', 'Ibrahim', 'Nuh', 'Hud', 'Salih', 'Shuayb'], reference: '26:214', fact: 'It calls the Prophet ﷺ to warn his close family first.' },
  { number: 27, name: 'An-Naml', revelation: 'Makki', themes: ['Kingdom of Sulaiman', 'Ants'], prophets: ['Musa', 'Sulaiman', 'Dawud'], people: ['Queen of Sheba'], animals: ['Ant', 'Hoopoe'], story: 'A wise king could understand the speech of birds and was gifted a vast kingdom.', reference: '27:16-19', fact: 'It mentions the ant and the hoopoe in Sulaiman\'s story.' },
  { number: 28, name: 'Al-Qasas', revelation: 'Makki', themes: ['Story of Musa', 'Trust in Allah'], prophets: ['Musa', 'Harun', 'Qarun'], story: 'A baby was placed in a basket on the river, raised in the palace of the very tyrant who feared him, and later returned to help his people.', reference: '28:7', fact: 'Its name means "The Stories."' },
  { number: 29, name: 'Al-Ankabut', revelation: 'Makki', themes: ['Trials', 'Patience'], prophets: ['Ibrahim', 'Lut', 'Nuh', 'Hud', 'Salih', 'Shuayb', 'Musa'], reference: '29:2', fact: 'It teaches that people will be tested in faith.' },
  { number: 30, name: 'Ar-Rum', revelation: 'Makki', themes: ['Signs of Allah', 'History'], places: ['Rome'], reference: '30:21', fact: 'It mentions the defeat and later victory of the Romans as a sign.' },
  { number: 31, name: 'Luqman', revelation: 'Makki', themes: ['Wisdom', 'Good advice to children'], people: ['Luqman'], reference: '31:13-19', fact: 'It contains Luqman\'s wise advice to his son.' },
  { number: 32, name: 'As-Sajdah', revelation: 'Makki', themes: ['Creation', 'Prostration'], reference: '32:15', fact: 'Reciting it is recommended in Fajr prayer on Friday.' },
  { number: 36, name: 'Ya-Sin', revelation: 'Makki', themes: ['Resurrection', 'Messengers'], prophets: ['Musa'], reference: '36:1-12', fact: 'Many scholars describe it as the heart of the Quran.' },
  { number: 37, name: 'As-Saffat', revelation: 'Makki', themes: ['Angels', 'Stories of prophets'], prophets: ['Ibrahim', 'Musa', 'Harun', 'Ilyas', 'Yunus'], reference: '37:100-111', fact: 'It describes Ibrahim\'s willingness to sacrifice his son.' },
  { number: 38, name: 'Sad', revelation: 'Makki', themes: ['Dawud and Sulaiman', 'Repentance'], prophets: ['Dawud', 'Sulaiman', 'Ayyub'], reference: '38:17', fact: 'It mentions the repentance of Dawud (AS).' },
  { number: 39, name: 'Az-Zumar', revelation: 'Makki', themes: ['Sincerity', 'Groups on Judgment Day'], reference: '39:53', fact: 'It gives hope: do not despair of Allah\'s mercy.' },
  { number: 40, name: 'Ghafir', revelation: 'Makki', themes: ['Forgiveness', 'Believer in Pharaoh\'s court'], prophets: ['Musa'], people: ['Believer from family of Fir\'awn'], story: 'A hidden believer spoke bravely in Pharaoh\'s palace, calling people to trust Allah before it was too late.', reference: '40:28-35', fact: 'Also known as Surah Al-Mu\'min.' },
  { number: 41, name: 'Fussilat', revelation: 'Makki', themes: ['Clear signs', 'Patience'], reference: '41:33', fact: 'It praises those who call to Allah with good speech and action.' },
  { number: 42, name: 'Ash-Shura', revelation: 'Makki', themes: ['Consultation', 'Unity'], reference: '42:38', fact: 'It encourages believers to decide affairs by consultation.' },
  { number: 43, name: 'Az-Zukhruf', revelation: 'Makki', themes: ['Worldly glitter', 'Truth'], reference: '43:67', fact: 'It warns against being deceived by worldly luxury.' },
  { number: 44, name: 'Ad-Dukhan', revelation: 'Makki', themes: ['Smoke', 'Favours of Allah'], reference: '44:3', fact: 'It mentions a blessed night in which the Quran was sent down.' },
  { number: 45, name: 'Al-Jathiyah', revelation: 'Makki', themes: ['Signs in creation', 'Accountability'], reference: '45:13', fact: 'It calls us to reflect on what Allah has created.' },
  { number: 46, name: 'Al-Ahqaf', revelation: 'Makki', themes: ['Jinn listening to Quran', 'Parents'], reference: '46:29-32', fact: 'A group of jinn listened to the Quran and accepted Islam.' },
  { number: 47, name: 'Muhammad', revelation: 'Madani', themes: ['Striving', 'Support of believers'], reference: '47:19', fact: 'It is named after the Prophet Muhammad ﷺ.' },
  { number: 48, name: 'Al-Fath', revelation: 'Madani', themes: ['Victory', 'Treaty of Hudaybiyyah'], reference: '48:1', fact: 'It announces a clear victory for the believers.' },
  { number: 49, name: 'Al-Hujurat', revelation: 'Madani', themes: ['Good manners', 'Brotherhood'], reference: '49:10', fact: 'It teaches Muslims are brothers and should make peace.' },
  { number: 50, name: 'Qaf', revelation: 'Makki', themes: ['Resurrection', 'Recording angels'], reference: '50:16', fact: 'Allah is closer to us than we realise.' },
  { number: 55, name: 'Ar-Rahman', revelation: 'Makki', themes: ['Allah\'s mercy', 'Creation'], reference: '55:13', fact: 'Its refrain asks: which favours of your Lord will you deny?' },
  { number: 56, name: "Al-Waqi'ah", revelation: 'Makki', themes: ['Day of Judgment', 'Three groups'], reference: '56:1-3', fact: 'It describes three groups of people on the Last Day.' },
  { number: 57, name: 'Al-Hadid', revelation: 'Madani', themes: ['Spending in Allah\'s cause', 'Light'], reference: '57:4', fact: 'It encourages charity and trust in Allah.' },
  { number: 67, name: 'Al-Mulk', revelation: 'Makki', themes: ['Kingdom of Allah', 'Life and death test'], reference: '67:2', fact: 'Reciting it before sleep brings protection.' },
  { number: 68, name: 'Al-Qalam', revelation: 'Makki', themes: ['Good character', 'Trial of wealth'], reference: '68:4', fact: 'It praises the noble character of the Prophet ﷺ.' },
  { number: 69, name: 'Al-Haqqah', revelation: 'Makki', themes: ['Reality of Judgment Day'], reference: '69:19-24', fact: 'It describes the joy of those who receive their book in the right hand.' },
  { number: 71, name: 'Nuh', revelation: 'Makki', themes: ['Calling to Allah', 'Persistence'], prophets: ['Nuh'], story: 'A prophet preached for centuries, built a huge ship by Allah\'s command, and was saved with the believers when the flood came.', reference: '71:1-4', fact: 'Prophet Nuh called his people day and night for a very long time.' },
  { number: 72, name: 'Al-Jinn', revelation: 'Makki', themes: ['Jinn listening to Quran'], reference: '72:1-2', fact: 'A group of jinn heard the Quran and believed.' },
  { number: 78, name: 'An-Naba', revelation: 'Makki', themes: ['Great news of resurrection'], reference: '78:1-3', fact: 'It asks about the great news people dispute over.' },
  { number: 96, name: "Al-Alaq", revelation: 'Makki', themes: ['First revelation', 'Knowledge'], reference: '96:1-5', fact: 'The first verses revealed began with "Read in the name of your Lord."' },
  { number: 97, name: 'Al-Qadr', revelation: 'Makki', themes: ['Laylat al-Qadr'], reference: '97:1-5', fact: 'It describes the Night of Decree as better than a thousand months.' },
  { number: 98, name: 'Al-Bayyinah', revelation: 'Madani', themes: ['Clear proof', 'Pure religion'], reference: '98:5', fact: 'It describes the purpose of worship and charity.' },
  { number: 103, name: 'Al-Asr', revelation: 'Makki', themes: ['Time', 'Success through faith and patience'], reference: '103:1-3', fact: 'Imam Shafi\'i said if people reflected on this Surah alone, it would be enough.' },
  { number: 105, name: 'Al-Fil', revelation: 'Makki', themes: ['Allah\'s protection of the Ka\'bah'], places: ['Makkah'], story: 'An army came with elephants to destroy the Ka\'bah, but Allah sent birds that defeated them.', reference: '105:1-5', fact: 'It describes the Year of the Elephant.' },
  { number: 106, name: 'Quraysh', revelation: 'Makki', themes: ['Blessings of security and trade'], places: ['Makkah'], reference: '106:1-4', fact: 'It reminds Quraysh of Allah\'s favours upon them.' },
  { number: 108, name: 'Al-Kawthar', revelation: 'Makki', themes: ['Abundance', 'Prayer and sacrifice'], reference: '108:1-3', fact: 'It is the shortest Surah in the Quran.' },
  { number: 109, name: 'Al-Kafirun', revelation: 'Makki', themes: ['Clear worship', 'Sincerity'], reference: '109:1-6', fact: 'It teaches us to worship Allah alone without compromise.' },
  { number: 110, name: 'An-Nasr', revelation: 'Madani', themes: ['Victory', 'Glory of Allah'], reference: '110:1-3', fact: 'It was revealed near the end of the Prophet\'s life ﷺ.' },
  { number: 111, name: 'Al-Masad', revelation: 'Makki', themes: ['Opposition to Islam', 'Justice'], people: ['Abu Lahab'], reference: '111:1-5', fact: 'It speaks about Abu Lahab who opposed the Prophet ﷺ.' },
  { number: 112, name: 'Al-Ikhlas', revelation: 'Makki', themes: ['Pure monotheism'], reference: '112:1-4', fact: 'It equals one third of the Quran in reward according to authentic hadith.' },
  { number: 113, name: 'Al-Falaq', revelation: 'Makki', themes: ['Seeking protection'], reference: '113:1-5', fact: 'It is among the Surahs of protection recited for safety.' },
  { number: 114, name: 'An-Nas', revelation: 'Makki', themes: ['Seeking refuge in Allah'], reference: '114:1-6', fact: 'It asks Allah to protect us from the whispers of Shaytan.' },
]

export const SURAH_BY_NUMBER = new Map(SURAH_CATALOG.map((entry) => [entry.number, entry]))
export const SURAH_BY_NAME = new Map(SURAH_CATALOG.map((entry) => [entry.name.toLowerCase(), entry]))

export function pickOtherSurahNames(correctName: string, count = 3): string[] {
  const pool = SURAH_CATALOG.filter((entry) => entry.name !== correctName).map((entry) => `Surah ${entry.name}`)
  const picked: string[] = []
  let seed = correctName.length
  while (picked.length < count && pool.length > 0) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    const index = seed % pool.length
    const choice = pool.splice(index, 1)[0]
    if (!picked.includes(choice)) picked.push(choice)
  }
  return picked
}
