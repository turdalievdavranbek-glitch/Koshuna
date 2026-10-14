import nodemailer from "nodemailer";

/** SMTP settings come only from the server env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM). */
function transport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT) || 465;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  attachments?: Array<{ filename: string; path: string }>;
}): Promise<boolean> {
  const tx = transport();
  if (!tx) {
    console.warn("mail: SMTP not configured, skipped");
    return false;
  }
  await tx.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, ...input });
  return true;
}
