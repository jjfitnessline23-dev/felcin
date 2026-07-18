import urllib.request, time, ssl

# Ignore SSL issues for testing
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

pages = ["/", "/reels", "/stories", "/notifications", "/explore", "/user-profile", "/private-chats"]

print("Waiting 45s for Passenger restart...")
time.sleep(45)

for path in pages:
    url = f"https://felcin.com{path}"
    try:
        req = urllib.request.urlopen(url, timeout=15, context=ctx)
        status = req.status
        body = req.read(500).decode("utf-8", errors="replace")
        ok = "200" if status == 200 else str(status)
        print(f"  {ok}  {path}")
    except urllib.error.HTTPError as e:
        print(f"  {e.code}  {path}")
    except Exception as e:
        print(f"  ERR  {path}: {e}")

print("Done.")
