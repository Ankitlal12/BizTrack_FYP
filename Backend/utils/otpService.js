// ==================== IMPORTS ====================
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// ==================== OTP GENERATION & VERIFICATION ====================

/**
 * Generate a cryptographically random 6-digit OTP
 * @returns {string}
 */
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

/**
 * Get OTP expiration time (10 minutes from now)
 * @returns {Date}
 */
const getOTPExpiration = () => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
};

/**
 * Verify an OTP against the stored value and expiry
 * @param {string} storedOTP
 * @param {string} providedOTP
 * @param {Date} expiresAt
 * @returns {{ valid: boolean, message: string }}
 */
const verifyOTP = (storedOTP, providedOTP, expiresAt) => {
  if (!storedOTP || !providedOTP) return { valid: false, message: 'OTP is required' };
  if (storedOTP !== providedOTP) return { valid: false, message: 'Invalid OTP' };
  if (new Date() > new Date(expiresAt)) return { valid: false, message: 'OTP has expired' };
  return { valid: true, message: 'OTP verified successfully' };
};

// ==================== EMAIL TRANSPORT ====================

/**
 * Create a nodemailer transporter.
 * Uses real SMTP in production (when EMAIL_* env vars are set),
 * falls back to Ethereal (fake SMTP) in development.
 * @returns {Promise<nodemailer.Transporter>}
 */
const createTransporter = async () => {
  if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    });
  }

  // Development fallback: Ethereal fake SMTP
  console.log('📧 Using Ethereal SMTP for development...');
  const testAccount = await nodemailer.createTestAccount();
  console.log('✅ Ethereal account created:', testAccount.user);

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
};

// ==================== EMAIL SENDING ====================

/**
 * Send an OTP to the user's email address
 * @param {string} email
 * @param {string} otp
 * @param {string} userName
 * @returns {Promise<{ success: boolean, message: string, previewUrl?: string }>}
 */
const sendOTPEmail = async (email, otp, userName) => {
  try {
    const transporter = await createTransporter();

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
            <div class="header"><h1>🔐 BizTrack Security</h1></div>
            <div class="content">
              <h2 style="color: #1f2937; margin-top: 0;">Hello ${userName}!</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                You requested to login to your BizTrack account. Use the OTP below to complete your login:
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
                If you didn't request this code, please ignore this email or contact support.
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
      text: `BizTrack Login Verification\n\nHello ${userName},\n\nYour OTP code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\n© ${new Date().getFullYear()} BizTrack`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent to:', email, '| Message ID:', info.messageId);

    // Provide Ethereal preview URL in development
    const previewUrl = !process.env.EMAIL_SERVICE ? nodemailer.getTestMessageUrl(info) : undefined;
    if (previewUrl) console.log('📧 Preview email at:', previewUrl);

    return { success: true, message: 'OTP sent successfully', previewUrl };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    // Console fallback so development is never fully blocked
    console.log(`\n========================================\n⚠️  EMAIL FAILED - CONSOLE FALLBACK\nOTP for ${userName} (${email}): ${otp}\nValid for 10 minutes\n========================================\n`);
    return { success: false, message: 'Failed to send OTP', error: error.message };
  }
};

/**
 * Send new account credentials email
 * @param {string} email
 * @param {string} userName
 * @param {string} username
 * @param {string} password
 * @param {string} role
 * @returns {Promise<{ success: boolean, message: string, previewUrl?: string }>}
 */
const sendCredentialsEmail = async (email, userName, username, password, role = 'staff') => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@biztrack.com',
      to: email,
      subject: 'Welcome to BizTrack - Your Login Credentials',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { padding: 32px 28px; }
            .credential-box { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 18px; margin: 18px 0; }
            .row { margin: 8px 0; color: #1f2937; }
            .label { font-weight: bold; display: inline-block; min-width: 90px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-top: 16px; border-radius: 4px; }
            .footer { background: #f9fafb; padding: 18px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Welcome to BizTrack</h1></div>
            <div class="content">
              <h2 style="margin-top:0;color:#111827;">Hi ${userName},</h2>
              <p style="color:#4b5563;line-height:1.6;">Your account has been created. You can now sign in using these credentials:</p>

              <div class="credential-box">
                <div class="row"><span class="label">Username:</span> ${username}</div>
                <div class="row"><span class="label">Password:</span> ${password}</div>
                <div class="row"><span class="label">Role:</span> ${role}</div>
              </div>

              <div class="warning">
                <strong>Security tip:</strong> Please change your password after your first login.
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} BizTrack - Inventory & Business Management System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to BizTrack\n\nHello ${userName},\n\nYour account has been created.\nUsername: ${username}\nPassword: ${password}\nRole: ${role}\n\nPlease change your password after first login.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Credential email sent to:', email, '| Message ID:', info.messageId);

    const previewUrl = !process.env.EMAIL_SERVICE ? nodemailer.getTestMessageUrl(info) : undefined;
    if (previewUrl) console.log('📧 Preview email at:', previewUrl);

    return { success: true, message: 'Credential email sent successfully', previewUrl };
  } catch (error) {
    console.error('❌ Error sending credential email:', error);
    return { success: false, message: 'Failed to send credential email', error: error.message };
  }
};

/**
 * Send SaaS signup confirmation email
 * @param {string} email
 * @param {string} ownerName
 * @param {string} businessName
 * @returns {Promise<{ success: boolean, message: string, previewUrl?: string }>}
 */
const sendSignupConfirmationEmail = async (email, ownerName, businessName) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@biztrack.com',
      to: email,
      subject: 'Your BizTrack workspace is ready',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 640px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { padding: 34px 30px; }
            .box { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 18px; margin: 18px 0; }
            .footer { background: #f9fafb; padding: 18px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Welcome to BizTrack</h1></div>
            <div class="content">
              <h2 style="margin-top:0;color:#111827;">Hi ${ownerName},</h2>
              <p style="color:#4b5563;line-height:1.6;">Your BizTrack workspace for <strong>${businessName}</strong> has been created successfully.</p>
              <div class="box">
                <p style="margin:0;color:#111827;font-weight:600;">You can now log in using your Google account and the password you set during signup.</p>
              </div>
              <p style="color:#4b5563;line-height:1.6;">Start by adding your staff, inventory, customers, and suppliers. Your workspace data is isolated from other businesses.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} BizTrack - Inventory & Business Management System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to BizTrack\n\nHi ${ownerName},\n\nYour BizTrack workspace for ${businessName} has been created successfully.\nYou can now log in using your Google account and the password you set during signup.\n\n© ${new Date().getFullYear()} BizTrack`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Signup confirmation email sent to:', email, '| Message ID:', info.messageId);

    const previewUrl = !process.env.EMAIL_SERVICE ? nodemailer.getTestMessageUrl(info) : undefined;
    if (previewUrl) console.log('📧 Preview email at:', previewUrl);

    return { success: true, message: 'Signup confirmation email sent successfully', previewUrl };
  } catch (error) {
    console.error('❌ Error sending signup confirmation email:', error);
    return { success: false, message: 'Failed to send signup confirmation email', error: error.message };
  }
};

// ==================== SMS SENDING (stub) ====================

/**
 * Send OTP via SMS — stub implementation.
 * Replace with Twilio / AWS SNS in production.
 * @param {string} phoneNumber
 * @param {string} otp
 * @param {string} userName
 * @returns {Promise<{ success: boolean, message: string }>}
 */
const sendOTPSMS = async (phoneNumber, otp, userName) => {
  try {
    // TODO: Integrate with Twilio or AWS SNS for production SMS
    console.log(`\n========================================\nOTP SMS for ${userName} (${phoneNumber})\nYour BizTrack OTP: ${otp}\nValid for 10 minutes.\n========================================\n`);
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
  sendCredentialsEmail,
  sendSignupConfirmationEmail,
  sendOTPSMS,
};
