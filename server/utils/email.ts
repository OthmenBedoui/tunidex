import nodemailer from 'nodemailer';

const createTransporter = async () => {
    return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, 
        auth: { user: 'johathan.muller46@ethereal.email', pass: 'Hj7X5X1X1X1X1X1X1X' },
    });
};

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const transporter = await createTransporter();
        const info = await transporter.sendMail({ from: '"Tunidex" <noreply@tunidex.tn>', to, subject, html });
        console.log("📧 Preview Email:", nodemailer.getTestMessageUrl(info));
    } catch (e) { console.error("Email error:", e); }
};