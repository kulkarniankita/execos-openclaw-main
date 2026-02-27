import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "ExecOS - AI Executive Assistant",
  description: "Your autonomous AI assistant for email and calendar management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ baseTheme: shadcn }}>
      <html lang="en">
        <body
          className={`${montserrat.className} antialiased`}
        >

          {children}
          <footer className="footer-wrapper">
            <div className="section-heading">
              <p className="text-center text-sm text-muted-foreground">
                © {new Date().getFullYear()} ExecOS.
              </p>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
