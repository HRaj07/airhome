import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import { ThemeProvider } from "@/lib/theme-context";
import { LocaleProvider } from "@/lib/locale-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "airhome | Holiday rentals, cabins, beach houses & more",
  description: "An Airbnb-style marketplace for booking unique stays, experiences and services around the world.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <ToastProvider>
            <LocaleProvider>
              <AuthProvider>
                <div className="flex min-h-screen flex-col">
                  <Navbar />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
              </AuthProvider>
            </LocaleProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
