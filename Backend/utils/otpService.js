const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Get OTP expiration time (10 minutes from now)
 */
const getOTPExpiration = () => {
  const expirationTime = new Date();
  expirationTime.setMinutes(expirationTime.getMinutes() + 10);
  return expirationTime;
};

/**
 * Verify if OTP is valid and not expired
 */
const verifyOTP = (storedOTP, providedOTP, expiresAt) => {
  if (!storedOTP || !providedOTP) {
    return { valid: false, message: 'OTP is required' };
  }

  if (storedOTP !== providedOTP) {
    return { valid: false, message: 'Invalid OTP' };
  }

  if (new Date() > new Date(expiresAt)) {
    return { valid: false, message: 'OTP has expired' };
  }

  return { valid: true, message: 'OTP verified successfully' };
};

/**
 * Create email transporter (Ethereal for development, real SMTP for production)
 */
const createTransporter = async () => {
  // Check if we're in production with real email credentials
  if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    // Production: Use real email service (Gmail, SendGrid, etc.)
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE, // 'gmail', 'sendgrid', etc.
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else {
    // Development: Use Ethereal (fake SMTP)
    console.log('📧 Using Ethereal SMTP for development...');
    const testAccount = await nodemailer.createTestAccount();
    
    const transporter = nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    console.log('✅ Ethereal account created:');
    console.log('   User:', testAccount.user);
    console.log('   Pass:', testAccount.pass);
    
    return transporter;
  }
};

/**
 * Send OTP via email using Ethereal SMTP (development) or real SMTP (production)
 */
const sendOTPEmail = async (email, otp, userName) => {
  try {
    // Create transporter (Ethereal or real SMTP)
    const transporter = await createTransporter();
    
    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@biztrack.com',
      to: email,
      subject: '🔐 Your BizTrack Login OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .otp-box { background: #f0fdfa; border: 2px dashed #14b8a6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
            .otp-code { font-size: 36px; font-weight: bold; color: #14b8a6; letter-spacing: 8px; margin: 10px 0; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 BizTrack Security</h1>
            </div>
            <div class="content">
              <h2 style="color: #1f2937; margin-top: 0;">Hello ${userName}!</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                You requested to login to your BizTrack account. Please use the following One-Time Password (OTP) to complete your login:
              </p>
              
              <div class="otp-box">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Your OTP Code</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Valid for 10 minutes</p>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> Never share this code with anyone. BizTrack staff will never ask for your OTP.
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} BizTrack - Inventory & Business Management System</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        BizTrack Login Verification
        
        Hello ${userName},
        
        Your OTP code is: ${otp}
        
        This code will expire in 10 minutes.
        
        If you didn't request this code, please ignore this email.
        
        © ${new Date().getFullYear()} BizTrack
      `
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    // Log success
    console.log('✅ OTP Email sent successfully!');
    console.log('   To:', email);
    console.log('   OTP:', otp);
    console.log('   Message ID:', info.messageId);
    
    // If using Ethereal, provide preview URL
    if (info.messageId && !process.env.EMAIL_SERVICE) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('📧 Preview email at:', previewUrl);
      console.log('   ⚠️  IMPORTANT: Copy this URL to view the email in browser!');
    }
    
    return { 
      success: true, 
      message: 'OTP sent successfully',
      previewUrl: nodemailer.getTestMessageUrl(info) // For Ethereal preview
    };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    
    // Fallback: Log OTP to console if email fails
    console.log(`
      ========================================
      ⚠️  EMAIL FAILED - CONSOLE FALLBACK
      ========================================
      OTP for ${userName} (${email}): ${otp}
      Valid for 10 minutes
      ========================================
    `);
    
    return { success: false, message: 'Failed to send OTP', error: error.message };
  }
};

/**
 * Send OTP via SMS (mock implementation)
 * In production, integrate with SMS service like Twilio, AWS SNS
 */
const sendOTPSMS = async (phoneNumber, otp, userName) => {
  try {
    // TODO: Integrate with actual SMS service
    console.log(`
      ========================================
      OTP SMS for ${userName} (${phoneNumber})
      ========================================
      Your BizTrack OTP: ${otp}
      Valid for 10 minutes.
      ========================================
    `);

    // For development, we'll just log the OTP
    // In production, replace this with actual SMS sending:
    /*
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body: `Your BizTrack login OTP is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    */

    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Error sending OTP SMS:', error);
    return { success: false, message: 'Failed to send OTP' };
  }
};

module.exports = {
  generateOTP,
  getOTPExpiration,
  verifyOTP,
  sendOTPEmail,
  sendOTPSMS,
};
