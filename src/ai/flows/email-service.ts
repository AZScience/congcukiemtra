
'use server';

import nodemailer from 'nodemailer';

export async function sendEmailNotification(
    recipients: string[],
    subject: string,
    body: string,
    attachments: { name: string, url: string }[],
    config: {
        host: string;
        port: string;
        user: string;
        pass: string;
        fromName: string;
    }
) {
    if (!config.host || !config.user || !config.pass) {
        console.warn("SMTP configuration is missing. Skipping email notification.");
        return { success: false, message: "Cấu hình SMTP chưa hoàn thiện." };
    }

    try {
        console.log(`Attempting to send email to: ${recipients.join(', ')}`);
        console.log(`SMTP Config: Host=${config.host}, Port=${config.port}, User=${config.user}`);
        
        const transporterConfig: any = {
            host: config.host,
            port: parseInt(config.port),
            secure: config.port === '465',
            auth: {
                user: config.user,
                pass: config.pass,
            },
        };

        if (config.host.toLowerCase().includes('gmail.com')) {
            transporterConfig.service = 'gmail';
        }

        const transporter = nodemailer.createTransport(transporterConfig);

        const attachmentHtml = attachments.length > 0 
            ? `<div style="margin-top: 20px; padding: 10px; background: #f4f4f4; border-radius: 5px;">
                <p style="margin: 0; font-weight: bold;">Tệp đính kèm:</p>
                <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                    ${attachments.map(a => `<li><a href="${a.url}">${a.name}</a></li>`).join('')}
                </ul>
               </div>`
            : '';

        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                <div style="background: #0056b3; color: white; padding: 20px; text-align: center;">
                    <h2 style="margin: 0;">Thông báo từ Hệ thống Kiểm tra nội bộ</h2>
                </div>
                <div style="padding: 20px;">
                    <p>Chào bạn,</p>
                    <p>Bạn vừa nhận được một tin nhắn nội bộ mới với tiêu đề:</p>
                    <h3 style="color: #0056b3;">${subject}</h3>
                    <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #0056b3; margin: 20px 0;">
                        ${body}
                    </div>
                    ${attachmentHtml}
                    <p style="margin-top: 30px;">Vui lòng đăng nhập vào hệ thống để xem chi tiết và phản hồi.</p>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://kiemtranoibo.ntt.edu.vn" style="background: #0056b3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Truy cập Hệ thống</a>
                    </div>
                </div>
                <div style="background: #f4f4f4; color: #777; padding: 15px; text-align: center; font-size: 12px;">
                    <p style="margin: 0;">Đây là email tự động, vui lòng không trả lời email này.</p>
                    <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} ${config.fromName}</p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"${config.fromName}" <${config.user}>`,
            to: recipients.join(', '),
            subject: `[Thông báo] ${subject}`,
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, message: `Gửi Email thành công. ID: ${info.messageId}` };
    } catch (error: any) {
        console.error("Error sending email:", error);
        let errorMsg = error.message || "Lỗi không xác định.";
        if (errorMsg.includes("EAUTH")) errorMsg = "Lỗi xác thực (Sai Username hoặc Password).";
        else if (errorMsg.includes("ECONNREFUSED")) errorMsg = "Kết nối bị từ chối (Sai Host hoặc Port).";
        else if (errorMsg.includes("ETIMEDOUT")) errorMsg = "Kết nối quá hạn (Kiểm tra Firewall hoặc mạng).";
        
        return { success: false, message: errorMsg };
    }
}

export async function verifySMTPConnection(config: {
    host: string;
    port: string;
    user: string;
    pass: string;
}) {
    try {
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: parseInt(config.port),
            secure: config.port === '465',
            auth: {
                user: config.user,
                pass: config.pass,
            },
        });
        await transporter.verify();
        return { success: true, message: "Kết nối SMTP thành công." };
    } catch (error: any) {
        let errorMsg = error.message || "Không thể kết nối máy chủ SMTP.";
        if (errorMsg.includes("EAUTH")) errorMsg = "Lỗi xác thực (Sai Username hoặc Password).";
        else if (errorMsg.includes("ECONNREFUSED")) errorMsg = "Kết nối bị từ chối (Sai Host hoặc Port).";
        
        return { success: false, message: errorMsg };
    }
}
