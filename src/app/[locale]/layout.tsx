import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Inter, Cairo } from 'next/font/google';
import '../globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AccentColorProvider } from '@/components/AccentColorProvider';
import TokenRefresher from '@/components/TokenRefresher';
import { Metadata, Viewport } from 'next';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cairo = Cairo({ subsets: ['arabic'], variable: '--font-cairo' });

export const viewport: Viewport = {
    themeColor: "#0D0D0D",
};

export const metadata: Metadata = {
    title: "Task Manager — Real-Time Task & Team Collaboration",
    description: "Task Manager brings your team's tasks and conversations into one real-time workspace. Assign work, track progress, and message teammates — all without switching tabs.",
    keywords: ["task manager", "team collaboration", "real-time chat", "project management", "task tracking"],
    authors: [{ name: "Task Manager" }],
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Task Manager",
    },
    openGraph: {
        type: "website",
        url: "https://expserco.pro/",
        title: "Task Manager — Real-Time Task & Team Collaboration",
        description: "Assign tasks, chat in real time, and keep your whole team in sync — from one clean workspace.",
        siteName: "Task Manager",
        locale: "en_US",
        images: [
            {
                url: "/opengraph-image.png",
                width: 1200,
                height: 630,
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Task Manager — Real-Time Task & Team Collaboration",
        description: "Assign tasks, chat in real time, and keep your whole team in sync — from one clean workspace.",
        site: "@taskmanagerapp",
        creator: "@taskmanagerapp",
        images: ["/opengraph-image.png"],
    },
};

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    if (!routing.locales.includes(locale as any)) {
        notFound();
    }

    const messages = await getMessages();
    const direction = locale === 'ar' ? 'rtl' : 'ltr';

    return (
        <html lang={locale} dir={direction} suppressHydrationWarning>
            <body className={`${inter.variable} ${cairo.variable}`}>
                <NextIntlClientProvider messages={messages}>
                    <ThemeProvider>
                        <AccentColorProvider />
                        <TokenRefresher />
                        {children}
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
