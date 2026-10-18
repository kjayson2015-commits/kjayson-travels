# KJayson Travels

Travel threads by Jayson Kemboi ([@kjayson_](https://x.com/kjayson_)): trips and fun, written like X threads, built to be found on Google.

## How it works

- **Write** in the editor at `/editor/` (only you can publish; it needs your GitHub token).
- **Publish** saves your thread to `content/threads/` and your photos to `images/` in this repo.
- **GitHub Actions** rebuilds the site and puts it live in about a minute.

No database, no monthly bill. Every thread is a real, fast HTML page, which is what Google ranks best.

## One-time setup

1. **Turn on GitHub Pages:** repo **Settings → Pages → Build and deployment → Source: GitHub Actions**. Then open the **Actions** tab and re-run the latest workflow if it failed before Pages was on.
2. **Make an editor token:** GitHub → Settings → Developer settings → [Fine-grained tokens](https://github.com/settings/personal-access-tokens/new) → *Only select repositories*: `kjayson-travels` → *Repository permissions → Contents: Read and write*.
3. Open `https://kjayson2015-commits.github.io/kjayson-travels/editor/`, paste the token, and write your first thread.

## Get on Google

1. Go to [Google Search Console](https://search.google.com/search-console), add the property using **URL prefix** with your site address.
2. Choose the **HTML tag** method, copy only the `content="…"` code into `googleSiteVerification` in `site.config.json`, commit, wait a minute, then click Verify.
3. In Search Console → **Sitemaps**, submit `sitemap.xml`.
4. For each new thread, paste its link into **URL inspection → Request indexing**, and share it on X and Facebook the same day.

## Use your own domain (recommended for SEO)

To move to `travel.kjayson.online`:

1. In Namecheap → Advanced DNS add a **CNAME** record: host `travel`, value `kjayson2015-commits.github.io`.
2. In the repo **Settings → Pages → Custom domain**, enter `travel.kjayson.online` and tick **Enforce HTTPS**.
3. In `site.config.json` change `siteUrl` to `https://travel.kjayson.online/`. Commit. Every link, canonical tag and sitemap entry updates by itself.

## Edit the site details

Everything about you (name, bio, X, Facebook, website) is in `site.config.json`. Add your Facebook profile link to `author.facebook` so Google connects all your profiles.

## Preview on your computer

```
node scripts/build.mjs --drafts --local
npx serve _site -l 3000
```
