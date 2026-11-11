import urllib.request
import urllib.parse
import urllib.error
import http.cookiejar
import re
import json
import base64
import sys
import time

cookie_jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://ko.imgbb.com/',
    'Origin': 'https://ko.imgbb.com'
}

req = urllib.request.Request('https://ko.imgbb.com/', headers=headers)
with opener.open(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

tokens = re.findall(r'PF\.obj\.config\.auth_token\s*=\s*"([^"]+)"', html)
if not tokens:
    print("Could not find auth token")
    sys.exit(1)

auth_token = tokens[0]
print(f"Acquired auth_token: {auth_token}")

test_image_path = r"C:\Users\PC\.gemini\antigravity\brain\bd241ccb-370f-4827-807e-eaf07c092c5a\hell_asura_1794397500923.jpg"

with open(test_image_path, "rb") as f:
    b64_image = base64.b64encode(f.read()).decode('utf-8')

# Let's inspect multipart form data vs urlencoded
boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
body = bytearray()

fields = {
    'type': 'file',
    'action': 'upload',
    'timestamp': str(int(time.time() * 1000)),
    'auth_token': auth_token,
    'category_id': '',
    'nsfw': '0'
}

for k, v in fields.items():
    body.extend(f"--{boundary}\r\n".encode('utf-8'))
    body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode('utf-8'))
    body.extend(f"{v}\r\n".encode('utf-8'))

with open(test_image_path, "rb") as f:
    img_bytes = f.read()

body.extend(f"--{boundary}\r\n".encode('utf-8'))
body.extend(b'Content-Disposition: form-data; name="source"; filename="hell_asura.jpg"\r\n')
body.extend(b'Content-Type: image/jpeg\r\n\r\n')
body.extend(img_bytes)
body.extend(b"\r\n")
body.extend(f"--{boundary}--\r\n".encode('utf-8'))

upload_req = urllib.request.Request(
    'https://ko.imgbb.com/json',
    data=body,
    headers={
        **headers,
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01'
    }
)

try:
    with opener.open(upload_req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("Upload result:")
        print(json.dumps(res, indent=2, ensure_ascii=False))
except urllib.error.HTTPError as e:
    err_body = e.read().decode('utf-8', errors='ignore')
    print(f"HTTP Error {e.code}: {err_body}")
except Exception as e:
    print(f"Upload failed: {e}")
