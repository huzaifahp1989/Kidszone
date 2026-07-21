'use client';

import { OrderStepsGame } from '@/components/OrderStepsGame';
import { WUDU_STEPS } from '@/data/kids-new-activities';

export default function WuduStepsPage() {
  return (
    <OrderStepsGame
      title="Wudu Steps"
      emoji="💧"
      blurb="Put the steps of wudu in the correct order"
      gameId="wudu-steps"
      steps={WUDU_STEPS}
      accent="sky"
    />
  );
}
