import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

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
            <h1 className="app-title">
              AI Material Composer
              <small>READ ONLY</small>
            </h1>
            <nav className="app-nav">
              <Link className="nav-pill" href="/">Composer</Link>
              <Link className="nav-pill" href="/history">History</Link>
            </nav>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
