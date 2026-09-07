import { type EmailSender } from "@wasp.sh/spec";

export const emailSender: EmailSender = {
  provider: process.env.NODE_ENV === "production" ? "SMTP" : "Dummy",
  defaultFrom: {
    name: "SaaS Satu Smart School",
    email: "noreply@sekolah.suhendararyadi.com",
  },
};
