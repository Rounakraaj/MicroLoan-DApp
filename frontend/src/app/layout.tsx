import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MicroLend — Peer to peer micro loans",
  description: "Request or fund transparent, peer to peer micro loans on Ethereum.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
