const path = require('path');
const { spawn } = require('child_process');
const nodemailer = require('nodemailer');

const PYTHON_SCRIPT_PATH = path.join(__dirname, 'mail_imap_client.py');
const PY_TIMEOUT_MS = 30_000;

const runPythonCommand = (payload) =>
  new Promise((resolve, reject) => {
    const child = spawn('python3', [PYTHON_SCRIPT_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('IMAP command timed out'));
    }, PY_TIMEOUT_MS);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', () => {
      clearTimeout(timer);
      if (!stdout) {
        if (stderr) {
          return reject(new Error(stderr.trim()));
        }
        return reject(new Error('No response from IMAP helper'));
      }
      try {
        const parsed = JSON.parse(stdout);
        if (parsed.ok === false) {
          const error = new Error(parsed.error || 'IMAP operation failed');
          error.details = parsed;
          return reject(error);
        }
        return resolve(parsed);
      } catch (error) {
        return reject(new Error(`Failed to parse IMAP response: ${error.message}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });

const buildSmtpTransportOptions = (config) => {
  if (!config?.smtpHost || !config?.smtpPort || !config?.user || !config?.pass) {
    throw new Error('SMTP configuration incomplete');
  }
  return {
    host: config.smtpHost,
    port: Number(config.smtpPort),
    secure: config.useSecureSmtp ?? Number(config.smtpPort) === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  };
};

const testConnection = async (config) => {
  const result = {
    imap: { ok: false },
    smtp: { ok: false },
  };

  try {
    const response = await runPythonCommand({ action: 'test', config });
    result.imap.ok = Boolean(response.imap);
  } catch (error) {
    result.imap.error = error.message;
  }

  try {
    const transporter = nodemailer.createTransport(buildSmtpTransportOptions(config));
    await transporter.verify();
    result.smtp.ok = true;
  } catch (error) {
    result.smtp.error = error.message;
  }

  if (!result.imap.ok && !result.smtp.ok) {
    const error = new Error('Both IMAP and SMTP checks failed');
    error.details = result;
    throw error;
  }

  return result;
};

const fetchEmails = async (config, folderName, limit = 20) => {
  const response = await runPythonCommand({
    action: 'fetch',
    config,
    folderName,
    limit,
  });
  return response.messages || [];
};

const sendEmail = async (config, emailData) => {
  const transporter = nodemailer.createTransport(buildSmtpTransportOptions(config));
  const payload = {
    from: emailData.from || config.email || config.user,
    to: emailData.to,
    cc: emailData.cc,
    bcc: emailData.bcc,
    subject: emailData.subject,
    text: emailData.text,
    html: emailData.html,
    attachments: emailData.attachments,
  };

  const info = await transporter.sendMail(payload);
  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  };
};

const moveEmail = async (config, emailId, targetFolder) => {
  const response = await runPythonCommand({
    action: 'move',
    config,
    emailId,
    targetFolder,
  });
  return response.moved;
};

module.exports = {
  testConnection,
  fetchEmails,
  sendEmail,
  moveEmail,
};
