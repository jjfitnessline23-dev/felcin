import paramiko

# Copy this file to deploy.py and fill in your server credentials.
# deploy.py is in .gitignore — never commit it.

HOST     = "YOUR_SERVER_IP"
PORT     = 65002
USERNAME = "YOUR_USERNAME"
PASSWORD = "YOUR_PASSWORD"

REMOTE_NODEJS  = "/home/YOUR_USERNAME/domains/yourdomain.com/nodejs"
REMOTE_PUBLIC  = "/home/YOUR_USERNAME/domains/yourdomain.com/public_html"

FILES = [
    ("pages/index.html",           "index.html"),
    ("pages/live.html",            "live.html"),
    ("pages/reels.html",           "reels.html"),
    ("pages/explore.html",         "explore.html"),
    ("pages/stories.html",         "stories.html"),
    ("pages/comments.html",        "comments.html"),
    ("pages/notifications.html",   "notifications.html"),
    ("pages/user-profile.html",    "user-profile.html"),
    ("pages/profile-settings.html","profile-settings.html"),
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
sftp = client.open_sftp()

for local, remote_name in FILES:
    sftp.put(local, f"{REMOTE_NODEJS}/{remote_name}")
    print(f"OK: nodejs/{remote_name}")
    sftp.put(local, f"{REMOTE_PUBLIC}/{remote_name}")
    print(f"OK: public_html/{remote_name}")

sftp.close()
client.close()
print("Done.")
