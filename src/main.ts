import axios from 'axios';
import { Actor } from 'apify';
import axiosRetry from 'axios-retry';

await Actor.init();

const BASE_URL = 'https://www.make.com/pw-api/integrations/search-apps?name=&nativeApps=true&addOnApps=true&sort=Most+Popular&category=&isCategory=false&isSubCategory=false';
const KV_STORE_KEY = 'make_integrations';

interface Input {
    keyValueStore: string;
    pageSize: number;
    maxConcurrentRequests: number;
}

interface MakeIntegrationItem {
    name: string;
    url: string;
    icon: string;
    color: string;
}

interface MakeIntegrationsResponse {
    total: number;
    entities: {
        slug: string;
        name: string;
        theme: string;
        icon: {
            url: string;
        };
    }[];
    limit: number;
    offset: number;
}

const input = await Actor.getInput<Input>();
if (!input) throw new Error('Input is missing!');

const {
    keyValueStore,
    pageSize = 100,
    maxConcurrentRequests = 5,
} = input;

// Configure axios-retry
axiosRetry(axios, {
    retries: 3, // Number of retry attempts
    retryDelay: (retryCount) => {
        return retryCount * 1000; // Exponential backoff (1000ms, 2000ms, 3000ms, ...)
    },
    retryCondition: (error) => {
        // Retry on network errors or 5xx responses
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || (error.response?.status || 200) >= 500;
    },
});

const loadStats = async () => {
    const url = `${BASE_URL}&limit=10&offset0`;
    const response = await axios.get<MakeIntegrationsResponse>(url);
    return response.data.total;
};

const loadPage = async (offset: number): Promise<MakeIntegrationItem[]> => {
    const url = `${BASE_URL}&limit=${pageSize}&offset=${offset}`;
    const response = await axios.get<MakeIntegrationsResponse>(url);
    return response.data.entities.map((entity) => ({
        name: entity.name,
        url: `https://www.make.com/integrations/${entity.slug}`,
        icon: entity.icon?.url,
        color: entity.theme,
    }));
};

// Utility to run promises with limited concurrency
const asyncPool = async <T>(limit: number, tasks: (() => Promise<T>)[]): Promise<T[]> => {
    const executing: Promise<void>[] = [];
    const results: T[] = [];

    for (const task of tasks) {
        // Wrap each task in a Promise that captures its result
        const p = task().then((result) => {
            results.push(result);
        }).finally(() => {
            // eslint-disable-next-line
            executing.splice(executing.indexOf(p), 1);
        });

        executing.push(p);

        if (executing.length >= limit) {
            // Wait for the first task to complete if we reach the concurrency limit
            await Promise.race(executing);
        }
    }

    // Wait for all remaining tasks to complete
    await Promise.all(executing);

    return results;
};

const totalItems = await loadStats();
const totalPages = Math.ceil(totalItems / pageSize);

console.log(`Total items: ${totalItems}, Total pages: ${totalPages}`);

// Generate the tasks for each page load
const tasks = Array.from({ length: totalPages }, (_, i) => () => loadPage(i * pageSize));

// Run tasks with concurrency limit
const pages = await asyncPool(maxConcurrentRequests, tasks);

const items = pages.flat();
const store = await Actor.openKeyValueStore(keyValueStore);
await store.setValue(KV_STORE_KEY, items);

await Actor.exit();
