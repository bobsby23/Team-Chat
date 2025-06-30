import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Bobsby Chat - Real-time Secure Messaging",
  description:
    "No registration required. Real-time chat with reactions and typing indicators. Messages auto-delete after 24 hours.",
  keywords: ["chat", "messaging", "real-time", "secure", "privacy", "no registration", "PWA", "reactions"],
  authors: [{ name: "Bobsby Chat Team" }],
  creator: "Bobsby Chat",
  publisher: "Bobsby Chat",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://bobsby-chat.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Bobsby Chat - Real-time Secure Messaging",
    description: "No registration required. Real-time chat with reactions and typing indicators.",
    url: "https://bobsby-chat.vercel.app",
    siteName: "Bobsby Chat",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Bobsby Chat - Real-time Secure Messaging",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bobsby Chat - Real-time Secure Messaging",
    description: "No registration required. Real-time chat with reactions and typing indicators.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Bobsby Chat" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
