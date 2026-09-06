module.exports = {
  emailVerification: {
    subject: 'Verify your email — {{businessName}}',
    bodyHtml: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#c1531b;">Welcome to {{businessName}}, {{name}}!</h2>
        <p>Please confirm your email address to activate your account.</p>
        <p><a href="{{verifyUrl}}" style="background:#c1531b;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;">Verify Email</a></p>
        <p style="color:#888;font-size:12px;">This link expires in {{ttlHours}} hours.</p>
      </div>`,
  },
  passwordReset: {
    subject: 'Reset your password — {{businessName}}',
    bodyHtml: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#c1531b;">Password reset requested</h2>
        <p>Hi {{name}}, click below to set a new password. If you didn't request this, ignore this email.</p>
        <p><a href="{{resetUrl}}" style="background:#c1531b;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;">Reset Password</a></p>
        <p style="color:#888;font-size:12px;">This link expires in {{ttlHours}} hour(s).</p>
      </div>`,
  },
  appointmentConfirmation: {
    subject: 'Your appointment is booked — {{businessName}}',
    bodyHtml: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#c1531b;">You're booked in, {{name}}!</h2>
        <p>{{date}} at {{startTime}} with {{barberName}}.</p>
        <p>Services: {{servicesList}}</p>
        <p>Total: {{total}}</p>
      </div>`,
  },
  appointmentStatusChanged: {
    subject: 'Update on your appointment — {{businessName}}',
    bodyHtml: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#c1531b;">Appointment {{status}}</h2>
        <p>Hi {{name}}, your appointment on {{date}} at {{startTime}} is now <b>{{status}}</b>.</p>
      </div>`,
  },
};
