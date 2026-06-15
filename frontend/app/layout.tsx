import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BEagent",
  description: "Multi-modal AI agent with file system access",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen overflow-hidden bg-surface text-zinc-200">
        {children}
      </body>
    </html>
  );
}
