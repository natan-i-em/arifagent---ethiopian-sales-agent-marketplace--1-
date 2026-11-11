import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://azwari.com.et';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/track',
          '/portal/',
          '/api/',
        ],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'anthropic-ai',
          'Google-Extended',
          'PerplexityBot',
          'Applebot-Extended',
          'cohere-ai',
          'OAI-SearchBot',
          'CCBot',
        ],
        allow: [
          '/',
          '/llms.txt',
          '/llms-full.txt',
          '/signin',
          '/signup',
          '/offline',
          '/forgot-password',
        ],
        disallow: [
          '/track',
          '/portal/',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

