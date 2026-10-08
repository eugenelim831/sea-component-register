# S.E.A. Metal Component Register — GitHub Pages

This package follows your previous hosting method:

- Upload the website files to **GitHub Pages**.
- Paste **worker.js** into a **Cloudflare Worker** using Edit code.
- Configure the Worker in the Cloudflare dashboard.

There is no wrangler.jsonc, public subfolder, npm installation or build command. The component register's screens, catalogue, processing deductions, product codes and Excel exports are retained. The Factory Transfer Register's content has not been copied into this app.

## Files

All files are together inside the extracted sea-component-register folder:

| File | Purpose |
| --- | --- |
| index.html | Website entry page; contains the Worker address setting |
| styles.css | Website appearance |
| app.js | Complete compiled component register |
| worker.js | Complete Cloudflare API code |
| database.sql | Creates the stock database tables |
| README.md | These instructions |

The component register uses a D1 database for its shared stock ledger. This preserves its existing stock validation, transaction history and retry handling.

## 1. Upload to GitHub

1. Extract the ZIP.
2. Create a GitHub repository named **sea-component-register**, or use the new repository you created for this component register. Use a repository where your GitHub plan supports Pages; a public repository works with GitHub Free.
3. Choose **Add file → Upload files**.
4. Upload the contents of the extracted folder to the repository's top level. In particular, **index.html**, **styles.css** and **app.js** must be at the top level together.
5. Commit to **main**.

Keep your existing Factory Transfer Register repository and Worker separate.

## 2. Turn on GitHub Pages

1. Open the repository's **Settings → Pages**.
2. Set **Source** to **Deploy from a branch**.
3. Choose **main** and **/(root)**.
4. Click **Save**.
5. Copy the website address displayed by GitHub once the Pages deployment finishes.

Example website address:

```text
https://YOUR-USERNAME.github.io/sea-component-register/
```

The page will show that the register service is not connected until step 6 is complete.

## 3. Set up the stock database

1. Open Cloudflare → **D1 SQL Database → Create database**.
2. Name it **sea-component-register**.
3. Open that database's **Console**.
4. Open **database.sql** as plain text. On GitHub, you can open the file and select **Raw** to copy all its contents.
5. Paste the whole SQL file into the Console and click **Execute** once.

The database should now have **components**, **control**, **events**, **stocks** and **transfers** tables.

Run this SQL only on a new empty database. If you already created and initialised this component register's D1 during the earlier setup, reuse it and skip this step. Do not reset or recreate populated tables.

## 4. Create the Cloudflare Worker

1. Open **Cloudflare → Workers & Pages → Create application**.
2. Choose the dashboard **Hello World** option to create a Worker. Name it **sea-component-api** and deploy it.
3. Open the Worker and select **Edit code**.
4. Delete the sample code. Open **worker.js**, copy its entire contents, and paste it into the editor.
5. Click **Deploy**.
6. Copy the Worker's address shown by Cloudflare, for example:

```text
https://sea-component-api.YOUR-SUBDOMAIN.workers.dev
```

This address is an example; use the actual address Cloudflare gives you. Visiting it directly shows a short API message. The register interface opens through your GitHub Pages address.

## 5. Add the Worker's database and website settings

In the Worker, open **Bindings → Add binding → D1 database**.

| Setting | Value |
| --- | --- |
| Variable / binding name | DB |
| D1 database | sea-component-register |

Save the binding. Then open **Settings → Variables and Secrets** and add a **Text** variable:

| Name | Value |
| --- | --- |
| ALLOWED_ORIGIN | https://YOUR-USERNAME.github.io |

Use the beginning of your actual GitHub Pages address: only the scheme and hostname, without the repository name or trailing slash. For example, if the website is `https://example.github.io/sea-component-register/`, the value is `https://example.github.io`.

If your Pages site uses a custom domain, use its exact HTTPS origin instead. Save and deploy the changes when prompted. This package does not need a GitHub token because the stock records are stored in D1.

## 6. Put the Worker address into the website

1. On GitHub, open **index.html** and click the pencil icon to edit it.
2. Near the top, find:

```js
const WORKER_URL = "";
```

3. Paste the actual Worker address between those quotation marks, for example:

```js
const WORKER_URL = "https://sea-component-api.YOUR-SUBDOMAIN.workers.dev";
```

4. Keep only the base Worker address. The app adds `/api/register` automatically.
5. Click **Commit changes** and save to main.
6. Wait for the GitHub Pages deployment to finish, then refresh your website.

Operators do not need to enter an API address. This is a one-time setup in index.html.

## 7. Open and use the register

Open your **GitHub Pages website address**, choose the PIC, and open **Stock Balances**. All 237 active catalogue items have product codes. Dropdowns show descriptions; the stock list and Excel export retain codes.

A newly created database starts with **zero stock and no transaction history**. Live stock, signatures, saved custom changes and records from the original hosted register are not part of this ZIP. They need a separate data migration. Browser-only drafts and favourites also do not move automatically between website addresses.

## Access behaviour

This package keeps PIC selection without adding a PIN or login screen. PIC selection is not authentication. The origin setting allows browser calls from your Pages hostname, but it does not make the API private: other callers can imitate that origin and select a PIC, including Eugene. The previous owner-private Sites restriction is not included. Use a separately configured authentication layer if you need verified users or private stock access; that layer must support this cross-origin API.

A Worker login/Access redirect is not compatible with this package's current cookie-free API calls. The earlier instructions for hosting the whole app behind Worker Access apply to the previous package, not this Pages package.

## If the website does not connect

| What you see | Check |
| --- | --- |
| Service has not been connected | WORKER_URL in index.html is still blank or is not the actual HTTPS Worker address |
| Failed to fetch / connection error | ALLOWED_ORIGIN matches the Pages origin; the Worker is deployed and reachable without a login redirect |
| Stock records could not be loaded | DB binding exists and database.sql was run successfully |
| GitHub Pages shows 404 | Pages uses main and /(root), and index.html is at the repository root |
| Old screen after an update | Wait for the Pages deployment, then refresh the browser |

## Checks and provenance

Packaged on 8 October 2026 from component register version 31, source commit b6b37caa58c6033651fa28839da360e85b9a0a2f. Changes are limited to the separate website/API connection, cross-origin handling, relative asset paths and keeping pending management saves separate for each API and PIC.

TypeScript and frontend build checks passed. The packaged Worker was checked against a local SQLite-backed D1 test adapter for schema setup, all API read modes, preview, stock save, retry deduplication, origin/preflight handling and error responses. This package has not been deployed to your GitHub or Cloudflare account.

References: [GitHub Pages source settings](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [Cloudflare dashboard](https://developers.cloudflare.com/workers/get-started/dashboard/), [D1 setup and bindings](https://developers.cloudflare.com/d1/get-started/).
