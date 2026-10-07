# Go-live checklist

Everything Claude can do without your login is done. These two steps need you, because they require your registrar password and creating a new account — both are things Claude is never allowed to do, even with permission.

## 1. DNS — point jreebs.com at the site

Go to your domain registrar (wherever you bought jreebs.com) → **DNS settings** (may be called "DNS Management," "Advanced DNS," or "Name Server Settings").

**Delete** any existing A record or CNAME record on `@` or `www` first.

**Add these 5 records:**

| Type | Host/Name | Value/Points to |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | jreebuman.github.io |

Save. Takes 10 minutes to a few hours to work (rarely up to 24h).

**When it's done**, message Claude "DNS is set" — it'll check, and once confirmed, turn on HTTPS (the padlock) for you automatically.

## 2. Business email — hello@jreebs.com

1. Go to [zoho.com/mail](https://www.zoho.com/mail/) → **Business Email** → **Forever Free Plan**.
2. Enter `jreebs.com` as your domain.
3. Zoho gives you DNS records (a TXT record to verify ownership, then MX records, then SPF/DKIM). Add those on the **same DNS screen** as step 1.
4. Once verified, create the mailbox: `hello@jreebs.com`.

The site already shows `hello@jreebs.com` everywhere — it'll start working the moment the mailbox exists. Nothing else to update.

## Already done (no action needed)
- [x] Site built, published, live on GitHub Pages
- [x] Repo made public (required for free Pages)
- [x] Demo folded into the site at `/demo`
- [x] Privacy page at `/privacy.html`
- [x] Fixed missing viewport meta tag (was breaking mobile layout)
- [x] SEO: meta description, Open Graph tags, favicon, robots.txt, sitemap.xml
- [x] CNAME file pointing to jreebs.com
- [x] All contact info switched to hello@jreebs.com

## Deliberately not done (you asked to hold these)
- [ ] Payment processor
- [ ] Business registration / lawyer review
