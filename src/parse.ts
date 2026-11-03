import * as cheerio from 'cheerio';

export const MAKE_ORIGIN = 'https://www.make.com';

export interface MakeIntegrationItem {
    name: string;
    url: string;
    icon: string | undefined;
    color: string | undefined;
}

/**
 * Parses one page of https://www.make.com/integrations?page=N into integration items.
 * Each app is rendered as `<a href="/integrations/<slug>" data-role="App Card">` with
 * the title, icon and `--logo-bg-color` CSS variable inside.
 */
export const parseIntegrationsPage = (html: string): MakeIntegrationItem[] => {
    const $ = cheerio.load(html);
    const items: MakeIntegrationItem[] = [];

    $('a[data-role="App Card"][href^="/integrations/"]').each((_, el) => {
        const card = $(el);
        const href = card.attr('href')!;
        const slug = href.replace(/^\/integrations\//, '').replace(/\/$/, '');
        // Skip anything that is not a single app page (e.g. app pair pages like /integrations/apify/slack)
        if (!slug || slug.includes('/') || slug.includes('?')) return;

        const name = card.find('[fn-integrations-el="title-text"]').text().trim() || card.attr('data-cta')?.trim();
        if (!name) return;

        const style = card.find('[fn-integrations-el="logo"]').attr('style') ?? '';
        const color = style.match(/--logo-bg-color:\s*([^;]+)/)?.[1]?.trim();
        const icon = card.find('img[fn-integrations-el="logo-image"]').attr('src');

        items.push({
            name,
            url: `${MAKE_ORIGIN}/integrations/${slug}`,
            icon,
            color,
        });
    });

    return items;
};
