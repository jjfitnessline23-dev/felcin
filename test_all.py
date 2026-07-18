import urllib.request, ssl, time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

pages = ["/", "/explore", "/stories", "/reels", "/notifications", "/user-profile?uid=test", "/private-chats", "/following", "/creator", "/profile-settings"]

for path in pages:
    url = f"https://felcin.com{path}?_nc={int(time.time())}"
    req = urllib.request.Request(url, headers={
        "Cache-Control": "no-cache",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
    })
    try:
        r = urllib.request.urlopen(req, timeout=25, context=ctx)
        body = r.read(300).decode("utf-8", errors="replace")
        # Check for Next.js marker
        has_next = "__NEXT_DATA__" in body or "next" in body.lower()
        print(f"  {r.status}  {path}  ({'Next.js OK' if has_next else 'no-next'})")
    except urllib.error.HTTPError as e:
        print(f"  {e.code}  {path}")
    except Exception as e:
        print(f"  ERR  {path}: {e}")

print("Done.")
