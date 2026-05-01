export interface User {
  id: string;
  username: string;
  ageGroup: 'young' | 'middle' | 'older'; // 5-7, 8-10, 11-14
  totalPoints: number;
  level: 'Beginner' | 'Learner' | 'Explorer' | 'Young Scholar';
  streak: number;
  lastActivityDate: string;
  createdAt: string;
  parentEmail?: string;
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: 'Quran' | 'Hadith' | 'Salah' | 'Akhlaq' | 'Seerah' | 'Hajj' | 'Prophets' | 'Sahabah' | 'Duas' | 'Sunnah';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
}

export interface Game {
  id: string;
  type: 'matching' | 'memory' | 'trueFalse' | 'multipleChoice';
  question: string;
  content: any;
  points: number;
  category: string;
}

export interface Surah {
  id: string;
  number: number;
  arabicName: string;
  englishName: string;
  intro: string;
  ayahs: Ayah[];
  mainLesson: string;
  whyRead: string;
  facts: string[];
}

export interface Ayah {
  number: number;
  arabic: string;
  english: string;
}

export interface Hadith {
  id: string;
  arabic?: string;
  english: string;
  meaning: string;
  source: string;
  practicalExample: string;
  topic: 'Kindness' | 'Honesty' | 'Parents' | 'Salah' | 'Manners';
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  points: number;
  level: string;
  rank: number;
}

export interface UserQuizProgress {
  userId: string;
  quizId: string;
  answered: boolean;
  score: number;
  date: string;
}
