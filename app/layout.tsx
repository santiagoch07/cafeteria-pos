import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cafetería POS",
  description: "Sistema de punto de venta para cafetería",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body className={`${inter.className} antialiased bg-gray-50 flex flex-col h-screen`}>
        <NavBar />
        {/* flex-1 + overflow-hidden deja que cada página controle su propio scroll */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
