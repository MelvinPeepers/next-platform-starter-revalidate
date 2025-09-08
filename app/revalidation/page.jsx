import { revalidateTag } from 'next/cache';
import { SubmitButton } from '../../components/submit-button';
import { Markdown } from '../../components/markdown';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'On-Demand Revalidation'
};

const tagName = 'randomWiki';
const randomWikiUrl = 'https://en.wikipedia.org/api/rest_v1/page/random/summary';
const maxExtractLength = 200;
const revalidateTTL = 60;

// Helper that won't crash the build if Wikipedia is slow/unreachable.
async function fetchRandomWiki() {
  try {
    const res = await fetch(randomWikiUrl, {
      next: { revalidate: revalidateTTL, tags: [tagName] },
      // Hard timeout so build won't hang on network
      signal: AbortSignal.timeout(4000),
      // Wikipedia recommends a descriptive UA
      headers: { 'User-Agent': 'Netlify-ISR-Demo/1.0 (+https://revalidate.netlify.app/)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    // Safe fallback to keep the build green
    return {
      title: 'Random article unavailable',
      description: 'Wikipedia endpoint timed out during build.',
      extract: 'We will try again on the next request or after background revalidation.',
      content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Special:Random' } },
    };
  }
}

const explainer = `
This page perfoms a \`fetch\` on the server to get a random article from Wikipedia. 
The fetched data is then cached with a tag named "${tagName}" and a maximum age of ${revalidateTTL} seconds.

~~~jsx
const url = 'https://en.wikipedia.org/api/rest_v1/page/random/summary';

async function RandomArticleComponent() {
    const randomArticle = await fetch(url, {
        next: { revalidate: ${revalidateTTL}, tags: ['${tagName}'] }
    });
    // ...render
}
~~~

After the set time has passed, the first request for this page would trigger its rebuild in the background. When the new page is ready, subsequent requests would return the new page - 
see [\`stale-white-revalidate\`](https://www.netlify.com/blog/swr-and-fine-grained-cache-control/).

Alternatively, if the cache tag is explicitly invalidated by \`revalidateTag('${tagName}')\`, any page using that tag would be rebuilt in the background when requested.

In real-life applications, tags are typically invalidated when data has changed in an external system (e.g., the CMS notifies the site about content changes via a webhook), or after a data mutation made through the site.

For this functionality to work, Next.js uses the [fine-grained caching headers](https://docs.netlify.com/platform/caching/) available on Netlify - but you can use these features on basically any Netlify site!
`;

export default async function Page() {
    async function revalidateWiki() {
        'use server';
        revalidateTag(tagName);
    }

    return (
        <>
            <h1>Revalidation Basics</h1>
            <Markdown content={explainer} />
            <form className="mt-4" action={revalidateWiki}>
                <SubmitButton text="Click to Revalidate" />
            </form>
            <RandomWikiArticle />
        </>
    );
}

async function RandomWikiArticle() {
    const randomWiki = await fetch(randomWikiUrl, {
        next: { revalidate: revalidateTTL, tags: [tagName] }
    });

    // const content = await randomWiki.json();
    const content = await fetchRandomWiki();
    let extract = content.extract;
    if (extract.length > maxExtractLength) {
        extract = extract.slice(0, extract.slice(0, maxExtractLength).lastIndexOf(' ')) + ' [...]';
    }

    return (
        <div className="bg-white text-neutral-600 card my-6 max-w-2xl">
            <div className="px-8 pt-4 text-sm text-gray-500">Last fetched: {new Date().toUTCString()}</div>
            <div className="card-title text-3xl px-8 pt-8">{content.title}</div>
            <div className="card-body py-4">
                <div className="text-lg font-bold">{content.description}</div>
                <p className="italic">{extract}</p>
                <a target="_blank" rel="noopener noreferrer" href={content.content_urls.desktop.page}>
                    From Wikipedia
                </a>
            </div>
        </div>
    );
}
