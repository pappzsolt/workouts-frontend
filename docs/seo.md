# Search visibility

The public, static Hungarian introduction is `/edzestervezo/`, canonical URL `https://workouts.hevexora.com/edzestervezo/`. It has meaningful content, semantic headings, links to the existing login and registration flows, Open Graph/Twitter metadata and truthful WebSite/WebPage/WebApplication JSON-LD. No price, rating, testimonials or rich-result eligibility is invented. Both content and metadata are present without JavaScript.

All existing Angular routes and the `/` → `/login` redirect are unchanged. Login, registration, recovery, reset, account deletion and authenticated screens keep `noindex, follow` in the original SPA HTML. Robots must be allowed to crawl those pages to read noindex. `/robots.txt` only blocks the API and documentation; `/sitemap.xml` lists the indexable introduction, not account pages. Assets remain crawlable. Metadata follows navigation and the active UI language and never contains reset tokens or private account IDs.

Deploy the normal production build and its `public` assets together using the existing Dockerfile/NGINX configuration. No backend change, new service or runtime dependency is required. NGINX serves `/edzestervezo/index.html` directly; its directory URL ends in `/`. The landing page uses a small local stylesheet and font, with no JavaScript bundle, third-party font or tracking script.

After deployment, verify the live canonical URL, robots file and sitemap, then submit `https://workouts.hevexora.com/sitemap.xml` in the domain owner's Google Search Console and request indexing of the introduction. Search Console verification requires the site owner's account; the code does not attempt to access it. Search positions depend on content relevance and other signals and cannot be guaranteed.

References: [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
