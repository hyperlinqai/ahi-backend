import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (options: {
    email: string;
    subject: string;
    message: string;
}) => {
    await resend.emails.send({
        from: process.env.FROM_EMAIL || "Ahi Jewellery <no-reply@ahijewellery.com>",
        to: options.email,
        subject: options.subject,
        html: options.message,
    });
};
