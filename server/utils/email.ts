import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';

const siteConfigPath = path.join(process.cwd(), 'server', 'data', 'site-config.json');

const fallbackTransport = {
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: 'johathan.muller46@ethereal.email', pass: 'Hj7X5X1X1X1X1X1X1X' },
    from: '"Tunidex" <noreply@tunidex.tn>'
};

const readMailerConfig = async () => {
    try {
        const raw = await fs.readFile(siteConfigPath, 'utf8');
        const config = JSON.parse(raw);
        if (config?.smtpHost && config?.smtpPort && config?.smtpEmailId) {
            return {
                host: config.smtpHost,
                port: Number(config.smtpPort),
                secure: config.smtpEncryption === 'ssl',
                auth: config.smtpUsername || config.smtpPassword ? {
                    user: config.smtpUsername || config.smtpEmailId,
                    pass: config.smtpPassword || ''
                } : undefined,
                from: `"${config.smtpMailerName || 'Tunidex'}" <${config.smtpEmailId}>`
            };
        }
    } catch (error) {
        console.warn('[email] fallback transport in use', error);
    }

    return fallbackTransport;
};

const createTransporter = async () => {
    const config = await readMailerConfig();
    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
    });
};

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const config = await readMailerConfig();
        const transporter = await createTransporter();
        const info = await transporter.sendMail({ from: config.from, to, subject, html });
        console.log("📧 Preview Email:", nodemailer.getTestMessageUrl(info));
        return info;
    } catch (e) {
        console.error("Email error:", e);
        throw e;
    }
};
