import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { winner, adminEmail, adminWhatsapp } = await req.json();

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️ Email credentials not found in environment variables. Email simulation only.');
      return NextResponse.json({ 
        success: false, 
        message: 'Email credentials missing. Please set EMAIL_USER and EMAIL_PASS in .env.local',
        simulated: true
      });
    }

    // Create a transporter
    // For Gmail: Use 'gmail' service
    // For others: Configure host/port
    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const subject = `🏆 Weekly Winner: ${winner.name} 🏆`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f0fdf4; border-radius: 10px;">
        <h1 style="color: #166534; text-align: center;">🏆 Weekly Winner Announcement 🏆</h1>
        <hr style="border: 1px solid #166534;" />
        <p style="font-size: 16px; color: #333;">
          We have a new champion for the week!
        </p>
        <div style="background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p><strong>👤 Name:</strong> ${winner.name}</p>
          <p><strong>⭐️ Weekly Points:</strong> ${winner.weekly_points}</p>
          <p><strong>🏅 Badges:</strong> ${winner.badges}</p>
          <p><strong>🚀 Level:</strong> ${winner.level}</p>
          <p><strong>🎁 Prize Tier:</strong> ${winner.prize_tier || 'Standard Prize'}</p>
        </div>
        <p style="margin-top: 20px; color: #555;">
          Please contact the winner to arrange their prize delivery!
        </p>
        <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
          Islamic Kids Learning Platform Auto-Notification System
        </p>
      </div>
    `;

    // Send email to Admin
    const info = await transporter.sendMail({
      from: `"Islamic Kids Platform" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: subject,
      html: html,
    });

    console.log('✅ Email sent successfully:', info.messageId);

    // Note: WhatsApp integration requires a paid API (like Twilio). 
    // We will log this for now as "Simulated WhatsApp".

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
