import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 2026-09-28 01:00, IMAP + MIME parsing for the import mailbox use Node internals; load natively
  serverExternalPackages: ["imapflow", "mailparser", "nodemailer"],
};

export default nextConfig;
