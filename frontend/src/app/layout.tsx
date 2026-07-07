import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GrowEasy AI CRM Importer',
  description:
    'Upload any CSV file and let AI intelligently extract and map lead data to GrowEasy CRM format. Supports Facebook Leads, Google Ads, Excel exports, and more.',
  keywords: ['CRM', 'CSV Import', 'Lead Management', 'AI', 'GrowEasy'],
  openGraph: {
    title: 'GrowEasy AI CRM Importer',
    description: 'AI-powered CSV to CRM field mapping',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
