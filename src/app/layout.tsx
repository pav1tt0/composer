import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Material Composer",
  description: "Generate textile blend candidates"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="app-shell">
          <header className="app-header">
            <h1 className="app-title">AI Material Composer</h1>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
