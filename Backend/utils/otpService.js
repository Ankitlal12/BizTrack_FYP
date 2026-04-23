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

/**
 * Send payment confirmation email
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {number} amount - Payment amount
 * @param {string} paymentType - "initial" or "renewal"
 * @param {Date} expiryDate - Subscription expiry date
 * @param {number} days - Days granted
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendPaymentConfirmationEmail = async (email, name, amount, paymentType, expiryDate, days) => {
  try {
    const transporter = await createTransporter();
    const isInitial = paymentType === "initial";
    
    const mailOptions = {
      from: `"BizTrack" <${process.env.EMAIL_USER || 'noreply@biztrack.com'}>`,
      to: email,
      subject: isInitial ? '✅ Payment Successful - Welcome to BizTrack!' : '✅ Subscription Renewed - BizTrack',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-badge { background: #10b981; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .info-label { font-weight: bold; color: #6b7280; }
            .info-value { color: #111827; }
            .button { background: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 ${isInitial ? 'Welcome to BizTrack!' : 'Subscription Renewed!'}</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              
              <div class="success-badge">
                ✅ Payment Successful
              </div>
              
              <p>${isInitial 
                ? 'Thank you for choosing BizTrack! Your payment has been successfully processed and your account is now active.' 
                : 'Your subscription has been successfully renewed. Thank you for continuing with BizTrack!'
              }</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #0d9488;">Payment Details</h3>
                <div class="info-row">
                  <span class="info-label">Amount Paid:</span>
                  <span class="info-value">NPR ${amount}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Payment Type:</span>
                  <span class="info-value">${isInitial ? 'Initial Subscription' : 'Renewal'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Subscription Period:</span>
                  <span class="info-value">${days} Days</span>
                </div>
                <div class="info-row" style="border-bottom: none;">
                  <span class="info-label">Valid Until:</span>
                  <span class="info-value">${new Date(expiryDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              </div>
              
              ${isInitial ? `
                <p><strong>What's Next?</strong></p>
                <ul>
                  <li>Login to your BizTrack dashboard</li>
                  <li>Set up your inventory</li>
                  <li>Add your team members</li>
                  <li>Start managing your business!</li>
                </ul>
                
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">
                  Go to Dashboard
                </a>
              ` : `
                <p>Your subscription has been extended and you can continue using all BizTrack features without interruption.</p>
                
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="button">
                  Go to Dashboard
                </a>
              `}
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0;"><strong>⏰ Reminder:</strong> Your subscription will expire on ${new Date(expiryDate).toLocaleDateString()}. We'll send you a reminder before it expires.</p>
              </div>
              
              <p style="margin-top: 30px;">If you have any questions or need assistance, feel free to contact our support team.</p>
              
              <p>Best regards,<br><strong>The BizTrack Team</strong></p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} BizTrack. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Payment confirmation email sent to ${email}:`, info.messageId);
    
    if (process.env.NODE_ENV !== 'production' && info.messageId) {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, message: 'Payment confirmation email sent successfully' };
  } catch (error) {
    console.error('❌ Failed to send payment confirmation email:', error);
    return { success: false, message: 'Failed to send payment confirmation email' };
  }
};

/**
 * Send account status change email (frozen/deleted/reactivated)
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} status - "frozen", "deleted", or "reactivated"
 * @param {string} message - Additional message
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendAccountStatusEmail = async (email, name, status, message) => {
  try {
    const transporter = await createTransporter();
    
    const statusConfig = {
      frozen: {
        subject: '⚠️ Account Frozen - BizTrack',
        color: '#f59e0b',
        icon: '❄️',
        title: 'Account Frozen',
        action: 'Contact support to reactivate your account.',
      },
      deleted: {
        subject: '🗑️ Account Deleted - BizTrack',
        color: '#ef4444',
        icon: '🗑️',
        title: 'Account Deleted',
        action: 'If you believe this is an error, please contact support immediately.',
      },
      reactivated: {
        subject: '✅ Account Reactivated - BizTrack',
        color: '#10b981',
        icon: '✅',
        title: 'Account Reactivated',
        action: 'You can now login and access all features.',
      },
    };

    const config = statusConfig[status] || statusConfig.frozen;
    
    const mailOptions = {
      from: `"BizTrack" <${process.env.EMAIL_USER || 'noreply@biztrack.com'}>`,
      to: email,
      subject: config.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${config.color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${config.color}; }
            .button { background: ${config.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${config.icon} ${config.title}</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              
              <div class="alert-box">
                <p><strong>${message}</strong></p>
              </div>
              
              <p>${config.action}</p>
              
              ${status === 'reactivated' ? `
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">
                  Login to Dashboard
                </a>
              ` : `
                <p>If you have any questions or concerns, please contact our support team.</p>
              `}
              
              <p style="margin-top: 30px;">Best regards,<br><strong>The BizTrack Team</strong></p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} BizTrack. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Account status email sent to ${email}:`, info.messageId);
    
    if (process.env.NODE_ENV !== 'production' && info.messageId) {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, message: 'Account status email sent successfully' };
  } catch (error) {
    console.error('❌ Failed to send account status email:', error);
    return { success: false, message: 'Failed to send account status email' };
  }
};

/**
 * Send subscription expiry warning email
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {number} daysLeft - Days remaining until expiry
 * @param {Date} expiryDate - Subscription expiry date
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendSubscriptionExpiryWarningEmail = async (email, name, daysLeft, expiryDate) => {
  try {
    const transporter = await createTransporter();
    
    const renewalUrl = process.env.SAAS_RENEWAL_URL || 'http://localhost:5173/renew';
    const formattedDate = expiryDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; color: #ffffff; text-align: center; }
          .content { padding: 32px; }
          .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 8px; }
          .info-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .cta-button { display: inline-block; margin-top: 20px; padding: 14px 28px; background: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
          .cta-button:hover { background: #d97706; }
          .footer { padding: 20px 32px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">⚠️ Subscription Expiring Soon</h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.95;">Action Required</p>
          </div>
          <div class="content">
            <p style="margin: 0 0 16px; font-size: 16px; color: #111827;">Hi ${name},</p>
            
            <div class="warning-box">
              <p style="margin: 0; font-weight: 600; color: #92400e; font-size: 15px;">
                Your BizTrack subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}!
              </p>
            </div>

            <p style="margin: 0 0 16px; color: #4b5563; line-height: 1.6;">
              Your 10-day subscription will expire on <strong>${formattedDate}</strong>. 
              After expiry, your account will be automatically frozen and you won't be able to access your workspace.
            </p>

            <div class="info-card">
              <h3 style="margin: 0 0 12px; color: #111827; font-size: 18px;">What happens next?</h3>
              <ul style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
                <li>Your account will be frozen after expiry</li>
                <li>All team members will lose access</li>
                <li>Your data will be preserved</li>
                <li>You can reactivate anytime by renewing</li>
              </ul>
            </div>

            <p style="margin: 20px 0 0; color: #111827; font-weight: 600; font-size: 16px;">
              Renew now to continue using BizTrack without interruption:
            </p>

            <div style="text-align: center;">
              <a href="${renewalUrl}" class="cta-button">
                Renew Subscription (NPR 999)
              </a>
            </div>

            <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
              The renewal will extend your subscription by another 10 days from your current expiry date.
            </p>
          </div>
          <div class="footer">
            <p style="margin: 0;">This is an automated message from BizTrack.</p>
            <p style="margin: 8px 0 0;">If you have any questions, please contact support.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER || 'noreply@biztrack.com',
      to: email,
      subject: `⚠️ Your BizTrack subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      text: `Hi ${name},\n\nYour BizTrack subscription expires in ${daysLeft} day(s) on ${formattedDate}.\n\nRenew now to avoid service interruption: ${renewalUrl}\n\nAfter expiry, your account will be frozen and you won't be able to access your workspace.\n\nBest regards,\nBizTrack Team`,
      html: htmlContent,
    });

    if (!process.env.EMAIL_SERVICE) {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, message: 'Expiry warning email sent successfully' };
  } catch (error) {
    console.error('❌ Failed to send expiry warning email:', error);
    return { success: false, message: 'Failed to send expiry warning email' };
  }
};

module.exports = {
  generateOTP,
  getOTPExpiration,
  verifyOTP,
  sendOTPEmail,
  sendCredentialsEmail,
  sendSignupConfirmationEmail,
  sendPaymentConfirmationEmail,
  sendAccountStatusEmail,
  sendSubscriptionExpiryWarningEmail,
  sendOTPSMS,
};
