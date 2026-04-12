// Utility functions for the app

export const calculateLevel = (points: number): string => {
  if (points < 100) return 'Beginner';
  if (points < 250) return 'Learner';
  if (points < 400) return 'Explorer';
  return 'Young Scholar';
};

export const getNextLevelPoints = (points: number): { next: string; remaining: number } => {
  if (points < 100) {
    return { next: 'Learner', remaining: 100 - points };
  }
  if (points < 250) {
    return { next: 'Explorer', remaining: 250 - points };
  }
  if (points < 400) {
    return { next: 'Young Scholar', remaining: 400 - points };
  }
  return { next: 'Max Level', remaining: 0 };
};

export const formatDate = (date?: string | Date | null): string => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getDaysSince = (date: string | Date): number => {
  const start = new Date(date);
  const end = new Date();
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const generateRandomQuiz = (quizzes: any[], count: number = 5) => {
  const shuffled = [...quizzes].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const validateUsername = (username: string): boolean => {
  const minLength = 3;
  const maxLength = 20;
  const hasOnlyAlphanumeric = /^[a-zA-Z0-9_]+$/.test(username);
  
  return (
    username.length >= minLength &&
    username.length <= maxLength &&
    hasOnlyAlphanumeric
  );
};

export const getAgeGroup = (age: number): 'young' | 'middle' | 'older' => {
  if (age <= 7) return 'young';
  if (age <= 10) return 'middle';
  return 'older';
};
