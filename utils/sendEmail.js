import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try{
  await transporter.sendMail({
    from: `"EcomCart Support" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
  }catch (err) {
  console.error("Email error:", err);
  throw new Error("Email failed");
}
};

export default sendEmail;
