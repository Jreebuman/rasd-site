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

## 2. Business email — hello@jreebs.com (free, via Cloudflare + your Gmail)

Zoho dropped its free plan, so this is the free route instead: Cloudflare forwards mail to your Gmail, and Gmail sends replies back out as `hello@jreebs.com`. About 15 minutes total, in 4 parts.

### Part A — Move the domain to Cloudflare (free)
1. Go to [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) and create a free account.
2. Click **Add a site**, enter `jreebs.com`, pick the **Free** plan.
3. Cloudflare scans your current DNS and shows what it found. Check the 5 records below are all there (it usually imports them automatically since they're already live):

   | Type | Name | Content | Proxy status |
   |---|---|---|---|
   | A | @ | 185.199.108.153 | DNS only (grey cloud) |
   | A | @ | 185.199.109.153 | DNS only (grey cloud) |
   | A | @ | 185.199.110.153 | DNS only (grey cloud) |
   | A | @ | 185.199.111.153 | DNS only (grey cloud) |
   | CNAME | www | jreebuman.github.io | DNS only (grey cloud) |

   If any are missing, add them manually with those exact values. **Important:** click the orange cloud icon next to each so it turns **grey** ("DNS only") — this keeps GitHub Pages working exactly as it does now.
4. Cloudflare gives you **2 nameservers**, like `xxx.ns.cloudflare.com` and `yyy.ns.cloudflare.com`.
5. Go back to your original registrar (where you manage jreebs.com) → find **Nameservers** (separate from "DNS Records") → replace whatever's there with Cloudflare's 2 nameservers.
6. Wait. Cloudflare emails you once it detects the switch — usually under an hour, sometimes up to 24h.

### Part B — Turn on Email Routing (free)
1. In the Cloudflare dashboard for jreebs.com, go to **Email** → **Email Routing**.
2. Click **Enable**. Cloudflare adds its own MX/TXT records automatically — don't touch those.
3. Add a routing rule: `hello@jreebs.com` → **Destination address** → enter your Hotmail address.
4. Cloudflare emails that Hotmail inbox asking you to confirm. Click the confirm link there.

At this point, anything sent to hello@jreebs.com lands in your Hotmail. That alone covers *receiving*. The rest is for *sending as* hello@jreebs.com.

### Part C — Create a Gmail app password
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) on your existing Gmail account (2-Step Verification must be on — turn it on first if it asks).
2. Create an app password named "jreebs mail", app type "Mail". Google shows you a 16-character password — copy it, you'll paste it once in the next part and won't see it again.

### Part D — Add hello@jreebs.com as a "send as" alias in Gmail
1. In Gmail, go to **Settings** (gear icon) → **See all settings** → **Accounts and Import** tab.
2. Under "Send mail as," click **Add another email address**.
3. Name: `Jreebs`. Email: `hello@jreebs.com`. Leave "Treat as an alias" checked. Next.
4. SMTP Server: `smtp.gmail.com`, Port: `587`.
5. Username: your full Gmail address. Password: the 16-character app password from Part C.
6. Click **Add Account**. Gmail sends a confirmation to hello@jreebs.com — since Part B is set up, it lands in your Hotmail. Open it, click the confirmation link (or enter the code it gives you back in Gmail).
7. Back in Gmail settings, next to hello@jreebs.com, click **make default** if you want new emails you compose to default to that address.

Done — you can now receive and send as hello@jreebs.com for free, forever, with no account to maintain beyond Cloudflare and your existing Gmail.

The site already shows `hello@jreebs.com` everywhere, so nothing else needs updating once this works.

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
