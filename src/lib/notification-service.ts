import { supabase } from './supabase';

interface WinnerDetails {
  user_id: string;
  name: string;
  weekly_points: number;
  badges: number;
  level: number;
  week_date: string;
  prize_tier: string;
}

const ADMIN_EMAIL = 'imediac786@gmail.com';
const ADMIN_WHATSAPP = '07447999284';

export const NotificationService = {
  /**
   * Simulate sending a notification to the admin/winner
   */
  async notifyWinner(winner: WinnerDetails) {
    console.log('🔔 [NotificationService] Processing winner notification:', winner);
    
    try {
      // Call the Next.js API route to send the email
      const response = await fetch('/api/notify-winner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winner,
          adminEmail: ADMIN_EMAIL,
          adminWhatsapp: ADMIN_WHATSAPP
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Email notification sent to ${ADMIN_EMAIL}`);
      } else {
        console.error('⚠️ Email notification failed:', result.message || result.error);
        if (result.simulated) {
          console.warn('👉 Action Required: Set EMAIL_USER and EMAIL_PASS in your .env.local file to enable real emails.');
        }
      }

      // Log "WhatsApp Sent" (Still simulated until Twilio integration)
      console.log(`📱 WHATSAPP (Simulated) to ${ADMIN_WHATSAPP}: Winner is ${winner.name}`);

      return {
        success: result.success,
        emailSent: result.success,
        whatsappSent: true, // Simulated
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error calling notification API:', error);
      return {
        success: false,
        emailSent: false,
        whatsappSent: false,
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * Previously: Check Friday and trigger a random weekly winner.
   * Weekly random draw is now disabled. Winners are managed manually in Admin.
   */
  async checkAndGenerateWeeklyWinner() {
    console.log('📅 Weekly random winner auto-draw is disabled. Choose winners manually in Admin -> Weekly winners.');
    return { success: true, is_new: false, message: 'Automatic weekly random draw is disabled.' };
  },

  /**
   * Previously: Force a random weekly winner (for testing buttons).
   * Weekly random draw is now disabled. This now returns a clear error.
   */
  async forceGenerateWinner() {
    const err = new Error('Automatic weekly winner draw is disabled. Use Admin -> Weekly winners to pick winners manually.');
    console.error('❌ Force generation disabled:', err.message);
    throw err;
  },

  /**
   * Reset the current week's winner (for testing)
   */
  async resetWinner() {
    try {
        const response = await fetch('/api/debug/reset-winner', { method: 'POST' });
        const result = await response.json();
        return result;
    } catch (err) {
        console.error('❌ Reset winner failed:', err);
        return { success: false, message: 'Failed to call reset API' };
    }
  }
};
