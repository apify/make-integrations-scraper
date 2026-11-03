## Make Integrations Scraper

This Apify Actor scrapes the list of integrations from the [Make integrations page](https://www.make.com/integrations).
It loads the server-rendered pages `https://www.make.com/integrations?page=N` (30 apps per page) until it reaches an empty page.
The data are stored in a key-value store as JSON list under the defined key.

## Input schema

The input schema defines the following properties:

- **keyValueStore**: The id of the key-value store to insert results into. If not provided, the results will be stored in the default key-value store.
- **key**: The key under which the results will be stored in the key-value store.
- **maxConcurrentRequests**: The number of list pages to load in parallel.
- **minItems**: If fewer integrations are scraped, the run fails and the stored data is not overwritten (default 1000).

## Example input

```json
{
    "keyValueStore": "my-key-value-store",
    "key": "make",
    "maxConcurrentRequests": 5,
    "minItems": 1000
}
```

## Example output

```json
[
  {
    "name": "Google Sheets",
    "url": "https://www.make.com/integrations/google-sheets",
    "icon": "https://cdn.make.com/cms/app-icons/google-sheets.avif",
    "color": "#0fa763"
  },
  {
    "name": "Gmail",
    "url": "https://www.make.com/integrations/google-email",
    "icon": "https://cdn.make.com/cms/app-icons/google-email.avif",
    "color": "#f14336"
  }
]
```
