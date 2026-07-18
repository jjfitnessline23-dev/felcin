import urllib.request, ssl, time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

pages = ["/", "/explore", "/stories"]

for path in pages:
    url = f"https://felcin.com{path}?_nc={int(time.time())}"
    req = urllib.request.Request(url, headers={
        "Cache-Control": "no-cache, no-store",
        "Pragma": "no-cache",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
    })
    try:
        r = urllib.request.urlopen(req, timeout=20, context=ctx)
        print(f"  {r.status}  {path}")
    except urllib.error.HTTPError as e:
        print(f"  {e.code}  {path}")
        print(f"    headers: {dict(e.headers)}")
    except Exception as e:
        print(f"  ERR  {path}: {e}")

print("Done.")
