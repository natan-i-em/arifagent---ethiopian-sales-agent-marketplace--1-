import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://azwari.com.et';
  const lastModified = new Date();

  return [
    { url: baseUrl, lastModified },
    { url: `${baseUrl}/how-it-works`, lastModified },
    { url: `${baseUrl}/for-merchants`, lastModified },
    { url: `${baseUrl}/for-agents`, lastModified },
    { url: `${baseUrl}/about`, lastModified },
    { url: `${baseUrl}/contact`, lastModified },
    { url: `${baseUrl}/faq`, lastModified },
  ];
}
