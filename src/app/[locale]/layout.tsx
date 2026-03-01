import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Inter, Cairo } from 'next/font/google';
import '../globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AccentColorProvider } from '@/components/AccentColorProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cairo = Cairo({ subsets: ['arabic'], variable: '--font-cairo' });

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
                        {children}
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
