import nodemailer from "nodemailer";

const getTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    throw new Error("EMAIL_USER hoặc EMAIL_PASSWORD không được cấu hình");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
};

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// gửi OTP qua email
export const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = getTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Mã xác minh OTP - WebConnect RT",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Xác minh Email</h2>
          <p style="color: #666; font-size: 16px;">
            Cảm ơn bạn đã đăng ký với WebConnect RT. Vui lòng sử dụng mã OTP dưới đây để xác minh email của bạn:
          </p>
          <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">
              ${otp}
            </h1>
          </div>
          <p style="color: #666; font-size: 14px;">
            Mã này sẽ hết hạn trong 10 phút.
          </p>
          <p style="color: #999; font-size: 12px;">
            Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
          </p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Lỗi khi gửi email OTP:", error);
    throw error;
  }
};

export const sendTwoFactorOTPEmail = async (email, otp, purpose) => {
  try {
    const transporter = getTransporter();
    const content = {
      login: {
        subject: "Mã xác thực đăng nhập - WebConnect RT",
        title: "Xác thực đăng nhập",
        message:
          "Tài khoản của bạn vừa yêu cầu đăng nhập. Nhập mã xác minh dưới đây để hoàn tất xác thực hai bước:",
        warning:
          "Nếu bạn không thực hiện đăng nhập này, hãy đổi mật khẩu và đăng xuất các thiết bị khác.",
      },
      enable: {
        subject: "Xác nhận bật xác thực hai bước - WebConnect RT",
        title: "Bật xác thực hai bước",
        message:
          "Bạn đang yêu cầu bật xác thực hai bước cho tài khoản WebConnect RT. Nhập mã dưới đây để xác nhận:",
        warning:
          "Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email và kiểm tra bảo mật tài khoản.",
      },
      disable: {
        subject: "Xác nhận tắt xác thực hai bước - WebConnect RT",
        title: "Tắt xác thực hai bước",
        message:
          "Bạn đang yêu cầu tắt xác thực hai bước cho tài khoản WebConnect RT. Nhập mã dưới đây để xác nhận:",
        warning:
          "Nếu bạn không thực hiện thao tác này, vui lòng bỏ qua email và bảo vệ tài khoản của mình.",
      },
    };
    const selected =
      purpose === "enable"
        ? content.enable
        : purpose === "disable"
          ? content.disable
          : content.login;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: selected.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${selected.title}</h2>
          <p style="color: #666; font-size: 16px;">
            ${selected.message}
          </p>
          <div style="background: #eef4ff; border: 1px solid #d9e5ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #2563eb; letter-spacing: 5px; margin: 0;">
              ${otp}
            </h1>
          </div>
          <p style="color: #666; font-size: 14px;">
            Mã xác minh chỉ có hiệu lực trong 10 phút.
          </p>
          <p style="color: #999; font-size: 14px;">
            ${selected.warning}
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Lỗi khi gửi email xác thực hai bước:", error);
    throw error;
  }
};

export const sendAccountLockedEmail = async (email, isLocked) => {
  try {
    const transporter = getTransporter();
    const subject = isLocked
      ? "Thông báo khóa tài khoản - WebConnect RT"
      : "Thông báo mở khóa tài khoản - WebConnect RT";

    const content = isLocked
      ? `
        <h2 style="color: #d9534f;">Tài khoản của bạn đã bị khóa</h2>
        <p>
          Chúng tôi thông báo rằng tài khoản WebConnect RT của bạn đã bị khóa do vi phạm điều khoản sử dụng hoặc lý do bảo mật.
        </p>
        <p>
          Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ với bộ phận hỗ trợ của chúng tôi.
        </p>
      `
      : `
        <h2 style="color: #28a745;">Tài khoản của bạn đã được mở khóa</h2>
        <p>
          Tài khoản WebConnect RT của bạn đã được kích hoạt trở lại. Bạn có thể đăng nhập và sử dụng dịch vụ bình thường.
        </p>
      `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
          ${content}
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Đây là email tự động, vui lòng không trả lời email này.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Lỗi khi gửi email thông báo khóa tài khoản:", error);

    return false;
  }
};
