import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { getUsuarioActual } from "@/lib/auth-server";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SQNAR · Claridad financiera para tu negocio",
  description: "Sistema de punto de venta y salud financiera para cafeterías y restaurantes en México.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const usuario = await getUsuarioActual();
  const rol = usuario?.rol ?? null;

  return (
    <html lang="es-MX" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-bg text-text flex flex-col h-screen`}>
        <NavBar rol={rol} />
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
