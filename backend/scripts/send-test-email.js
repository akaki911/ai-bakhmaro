const { getFirestore } = require('firebase-admin/firestore');
const mailRuntime = require('../services/mailRuntimeService');
const mailAccounts = require('../services/mailAccountService');

const GURULO_USER_ID = 'Tj4gYW6hlDSjkUIwHx4gqcxRb9u1';
const TEST_RECIPIENT = 'akaki.cincadze@gmail.com';

async function sendTestEmail() {
  console.log('📧 Sending test email from Gurulo...');

  const db = getFirestore();
  const account = await mailAccounts.getDefaultAccount(GURULO_USER_ID, { includeDecryptedPass: true });

  if (!account) {
    throw new Error('No default mail account found for Gurulo');
  }

  console.log(`✅ Found account: ${account.email}`);

  const config = mailAccounts.buildRuntimeConfig(account);

  console.log('🔍 Testing connection...');
  const testResult = await mailRuntime.testConnection(config);
  console.log('Connection test result:', testResult);

  if (!testResult.smtp.ok) {
    throw new Error('SMTP connection failed: ' + testResult.smtp.error);
  }

  console.log('📤 Sending email...');
  const emailData = {
    to: TEST_RECIPIENT,
    subject: 'გამარჯობა Gurulo-დან! 🤖',
    text: `გამარჯობა!

ეს არის ტესტური შეტყობინება Gurulo AI-ს მაილის სისტემიდან.

მაილის ინტეგრაცია წარმატებით მუშაობს! ახლა გურულოს შეუძლია:
✅ IMAP/SMTP ანგარიშების მართვა
✅ Inbox-ის სინქრონიზაცია და წაკითხვა
✅ Email-ების გაგზავნა
✅ ავტომატური შეტყობინებები და daily summaries

--
Gurulo AI
gurulo@bakhmaro.co
https://ai-bakhmaro.co`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #0a1628 0%, #1a2642 100%); color: white; border-radius: 16px;">
  <h2 style="color: #06b6d4; margin-bottom: 20px;">🤖 გამარჯობა Gurulo-დან!</h2>
  
  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
    ეს არის ტესტური შეტყობინება <strong>Gurulo AI</strong>-ს მაილის სისტემიდან.
  </p>
  
  <div style="background: rgba(6, 182, 212, 0.1); border-left: 3px solid #06b6d4; padding: 15px; margin: 20px 0; border-radius: 8px;">
    <p style="margin: 0; font-size: 15px;"><strong>✅ მაილის ინტეგრაცია წარმატებით მუშაობს!</strong></p>
  </div>
  
  <p style="font-size: 15px; line-height: 1.6;">ახლა გურულოს შეუძლია:</p>
  <ul style="font-size: 15px; line-height: 1.8;">
    <li>✅ IMAP/SMTP ანგარიშების მართვა</li>
    <li>✅ Inbox-ის სინქრონიზაცია და წაკითხვა</li>
    <li>✅ Email-ების გაგზავნა</li>
    <li>✅ ავტომატური შეტყობინებები და daily summaries</li>
  </ul>
  
  <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;">
  
  <p style="font-size: 13px; color: #94a3b8; margin: 0;">
    <strong>Gurulo AI</strong><br>
    <a href="mailto:gurulo@bakhmaro.co" style="color: #06b6d4; text-decoration: none;">gurulo@bakhmaro.co</a><br>
    <a href="https://ai-bakhmaro.co" style="color: #06b6d4; text-decoration: none;">https://ai-bakhmaro.co</a>
  </p>
</div>`,
  };

  const result = await mailRuntime.sendEmail(config, emailData);
  console.log('✅ Email sent successfully!');
  console.log('Message ID:', result.messageId);
  console.log('Accepted:', result.accepted);
  console.log('Response:', result.response);

  return result;
}

module.exports = { sendTestEmail };

if (require.main === module) {
  const admin = require('firebase-admin');
  
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  sendTestEmail()
    .then((result) => {
      console.log('🎉 Test email sent successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to send test email:', error);
      process.exit(1);
    });
}
