import type { VideoCategory } from '@/lib/video-categories';

/** Starter YouTube videos for Kids Channel (verified public kids Islamic content). */
export const KIDS_CHANNEL_SEED: Array<{
  youtubeId: string;
  category: VideoCategory;
  fallbackTitle: string;
  description: string;
  points_reward: number;
}> = [
  {
    youtubeId: 'EuPHP9rHYTg',
    category: 'story',
    fallbackTitle: 'Ibrahim & Ismail build the Kaaba | Storytime with Zaky',
    description: 'Kids Islamic story with Zaky.',
    points_reward: 25,
  },
  {
    youtubeId: 'T8GrguVA1zM',
    category: 'story',
    fallbackTitle: 'The Story of Prophet Adam with Zaky',
    description: 'Prophet Adam story for children.',
    points_reward: 25,
  },
  {
    youtubeId: 'ROx9i2Sc52Y',
    category: 'story',
    fallbackTitle: 'The Story of Prophet Nuh with Zaky',
    description: 'Prophet Nuh (Noah) story for children.',
    points_reward: 25,
  },
  {
    youtubeId: 'c2I-MdrBkUY',
    category: 'story',
    fallbackTitle: 'The Story of Prophet Yunus with Zaky',
    description: 'Prophet Yunus story — Muslim cartoon for kids.',
    points_reward: 25,
  },
  {
    youtubeId: 'CSoCd1Q-z_8',
    category: 'nasheed',
    fallbackTitle: 'Prophet Yunus Song for Children with Zaky',
    description: 'Kids nasheed / song.',
    points_reward: 25,
  },
  {
    youtubeId: 'F-ZgxRR4VZ4',
    category: 'story',
    fallbackTitle: 'The Story of Prophet Ibrahim FULL MOVIE',
    description: 'Longer Ibrahim story for kids.',
    points_reward: 25,
  },
  {
    youtubeId: 'mOyl9h6q1Z4',
    category: 'quran',
    fallbackTitle: 'Quran For Kids & Prophet Adam — Yusuf Estes',
    description: 'Quran learning episode for children.',
    points_reward: 25,
  },
];
