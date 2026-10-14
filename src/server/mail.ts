import { lookup } from "node:dns/promises";
import nodemailer from "nodemailer";

/** SMTP settings come only from the server env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM). */
/** The VPS has no working IPv4 route to Gmail SMTP: prefer an IPv6 address, keep TLS checking against the name. */
async function transport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT) || 465;
  const v6 = await lookup(host, { family: 6 }).then((row) => row.address).catch(() => null);
  return nodemailer.createTransport({
    host: v6 ?? host,
    port,
    secure: port === 465,
    tls: { servername: host },
    connectionTimeout: 15_000,
    auth: { user, pass },
  });
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
  const tx = await transport();
  if (!tx) {
    console.warn("mail: SMTP not configured, skipped");
    return false;
  }
  const info = await tx.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, ...input });
  console.log("mail: sent", info.messageId ?? "");
  return true;
}
