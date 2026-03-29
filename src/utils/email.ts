import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const LOGO_URL = `${process.env.FRONTEND_URL || "https://www.ahijewellery.com"}/ahi-logo.svg`;

export const sendEmail = async (options: {
    email: string;
    subject: string;
    message: string;
}) => {
    await resend.emails.send({
        from: process.env.FROM_EMAIL || "Ahi Jewellery <no-reply@ahijewellery.com>",
        to: options.email,
        subject: options.subject,
        html: `
            <div style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.6; background: #faf8f4; padding: 32px 16px;">
                <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #f1e7d3; border-radius: 20px; overflow: hidden;">
                    <div style="padding: 28px 32px 20px; text-align: center; border-bottom: 1px solid #f7f0e3;">
                        <img src="${LOGO_URL}" alt="Ahi Jewellery" style="height: 72px; width: auto; max-width: 220px;" />
                    </div>
                    <div style="padding: 28px 32px 32px;">
                        ${options.message}
                    </div>
                </div>
            </div>
        `,
    });
};
