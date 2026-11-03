import axios from 'axios';
import { Actor } from 'apify';
import axiosRetry from 'axios-retry';
import { MAKE_ORIGIN, MakeIntegrationItem, parseIntegrationsPage } from './parse.js';

await Actor.init();

// Make moved its website to Webflow and the old `/pw-api/integrations/search-apps` JSON API
// now returns 404. The app catalog is server-rendered at /integrations?page=N (30 apps per page).
const LIST_URL = `${MAKE_ORIGIN}/integrations`;
const DEFAULT_KV_STORE_KEY = 'make';
// Safety cap so a pagination change on Make's side can't make the Actor loop forever.
const MAX_PAGES = 1000;

interface Input {
    keyValueStore?: string;
    key?: string;
    maxConcurrentRequests?: number;
    minItems?: number;
}

const input = await Actor.getInput<Input>();
if (!input) throw new Error('Input is missing!');

const {
    keyValueStore,
    key = DEFAULT_KV_STORE_KEY,
    maxConcurrentRequests = 5,
    minItems = 1000,
} = input;

axiosRetry(axios, {
    retries: 3,
    retryDelay: (retryCount) => retryCount * 1000,
    retryCondition: (error) => {
        // Retry on network errors, 5xx and rate limiting
        const status = error.response?.status ?? 200;
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || status >= 500 || status === 429;
    },
});

const loadPage = async (page: number): Promise<MakeIntegrationItem[]> => {
    const response = await axios.get<string>(LIST_URL, {
        params: { page },
        responseType: 'text',
        headers: {
            Accept: 'text/html,application/xhtml+xml',
            'User-Agent': 'Mozilla/5.0 (compatible; ApifyMakeIntegrationsScraper/1.0)',
        },
    });
    return parseIntegrationsPage(response.data);
};

const items: MakeIntegrationItem[] = [];

// The total number of pages is not exposed, so load pages in batches until one comes back empty.
let page = 1;
let pagesWithItems = 0;
let reachedEnd = false;
while (!reachedEnd && page <= MAX_PAGES) {
    const batchStart = page;
    const batch = Array.from({ length: maxConcurrentRequests }, (_, i) => batchStart + i);
    const results = await Promise.all(batch.map(loadPage));
    for (const pageItems of results) {
        if (pageItems.length === 0) {
            reachedEnd = true;
            break;
        }
        pagesWithItems++;
        items.push(...pageItems);
    }
    page += maxConcurrentRequests;
}

console.log(`Loaded ${items.length} integrations from ${pagesWithItems} pages`);

// Remove duplicates based on `url`
const uniqueItems = Array.from(
    new Map(items.map((item) => [item.url, item])).values(),
);

// Refuse to overwrite good data with a partial result (e.g. if Make changes its markup again).
// Failing the run makes the problem visible on the schedule instead of silently storing junk.
if (uniqueItems.length < minItems) {
    throw new Error(`Scraped only ${uniqueItems.length} integrations, expected at least ${minItems}. `
        + 'Make probably changed its integrations page; not overwriting the stored data.');
}

const store = await Actor.openKeyValueStore(keyValueStore);
await store.setValue(key, uniqueItems);

console.log(`Stored ${uniqueItems.length} integrations`);

await Actor.exit();
