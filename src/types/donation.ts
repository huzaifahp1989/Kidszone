export type DonationType =
  | 'money'
  | 'food'
  | 'clothes'
  | 'toys'
  | 'help'
  | 'other';

export type DonationEntry = {
  id: string;
  userId: string;
  donationType: DonationType;
  amountPence: number;
  description: string;
  createdAt: string;
  stripeCheckoutSessionId?: string | null;
};

export type DonationLeaderboardEntry = {
  userId: string;
  name: string;
  madrasahName: string;
  donationCount: number;
  totalAmountPence: number;
  winnerTick?: boolean;
};
