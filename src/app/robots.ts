import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ormanipomeri.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/wardrobes', '/account'],
      },
      {
        userAgent: ['Googlebot', 'Googlebot-Image', 'Googlebot-Mobile'],
        allow: '/',
      },
      {
        userAgent: ['Bingbot', 'BingPreview'],
        allow: '/',
      },
      {
        userAgent: 'Slurp', // Yahoo
        allow: '/',
      },
      {
        userAgent: 'DuckDuckBot',
        allow: '/',
      },
      {
        userAgent: 'YandexBot',
        allow: '/',
      },
      {
        userAgent: 'Baiduspider',
        allow: '/',
      },
      {
        userAgent: ['facebookexternalhit', 'Twitterbot', 'LinkedInBot'],
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
