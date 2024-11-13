## Make Integrations Scraper

This Apify Actor scrapes the list of integrations from the Make Integrations page.
The data are stored in a key-value store as JSON list under the key `make_integrations`.

## Input schema

The input schema defines the following properties:

- **keyValueStore**: The id of the key-value store to insert results into. If not provided, the results will be stored in the default key-value store.
- **pageSize**: The number of items to get in one request.
- **maxConcurrentRequests**: The number of concurrent requests to make to the server.

## Example input

```json
{
    "keyValueStore": "my-key-value-store",
    "pageSize": 100,
    "maxConcurrentRequests": 5
}
```

## Example output

```json
[
  {
    "name": "Google Sheets",
    "url": "https://www.make.com/integrations/google-sheets",
    "icon": "https://images.ctfassets.net/un655fb9wln6/appIcon-google-sheets/a35859cd17514e0649a5f42db3d68713/google-sheets.png",
    "color": "#0fa763"
  },
  {
    "name": "OpenAI (ChatGPT, Whisper, DALL-E)",
    "url": "https://www.make.com/integrations/openai-gpt-3",
    "icon": "https://images.ctfassets.net/un655fb9wln6/appIcon-openai-gpt-3/111cec0b89ab249dfbf43af27e391e4a/openai-gpt-3.png",
    "color": "#10a37f"
  }
]
```
