import urllib.request, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

pages = ["/", "/reels", "/stories", "/notifications", "/explore", "/user-profile?uid=test", "/private-chats"]

for path in pages:
    url = f"https://felcin.com{path}"
    try:
        req = urllib.request.urlopen(url, timeout=15, context=ctx)
        status = req.status
        body_snippet = req.read(200).decode("utf-8", errors="replace").replace("\n", "")[:80]
        print(f"  {status}  {path}  [{body_snippet}...]")
    except urllib.error.HTTPError as e:
        print(f"  {e.code}  {path}")
    except Exception as e:
        print(f"  ERR  {path}: {type(e).__name__}: {e}")

print("Done.")
