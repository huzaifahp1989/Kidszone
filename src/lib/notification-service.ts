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
   * Check if it's Friday and trigger winner generation if needed
   */
  async checkAndGenerateWeeklyWinner() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday
    
    // Logic: If it's Friday (5) or later (weekend), ensure a winner exists for this week.
    // We'll be lenient and allow it to run any day for testing if forced, 
    // but automatically only on Fri/Sat/Sun.
    const isWeekend = dayOfWeek >= 5 || dayOfWeek === 0;
    
    if (!isWeekend) {
      console.log('📅 Not Friday yet, skipping auto-generation.');
      return null;
    }

    try {
      // Call the idempotent function
      const { data, error } = await supabase.rpc('generate_weekly_winner');
      
      if (error) {
        console.error('❌ Error generating winner:', error);
        return null;
      }

      if (data.success && data.is_new) {
        // New winner generated! Notify.
        // Fetch full details first
        const { data: winnerDetails } = await supabase.rpc('get_current_weekly_winner');
        
        if (winnerDetails) {
          await this.notifyWinner(winnerDetails);
        }
        return data;
      } else {
        // Winner already exists
        return data;
      }
    } catch (err) {
      console.error('❌ Exception in checkAndGenerateWeeklyWinner:', err);
      return null;
    }
  },

  /**
   * Force generate a winner (for testing button)
   */
  async forceGenerateWinner() {
    try {
      const { data, error } = await supabase.rpc('generate_weekly_winner');
      if (error) throw error;
      
      if (data.success) {
        const { data: winnerDetails } = await supabase.rpc('get_current_weekly_winner');
        if (winnerDetails) {
          await this.notifyWinner(winnerDetails);
        }
      }
      return data;
    } catch (err) {
      console.error('❌ Force generation failed:', err);
      // Log full details if available
      if (typeof err === 'object' && err !== null) {
         console.error('Error details:', JSON.stringify(err, null, 2));
      }
      throw err;
    }
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
