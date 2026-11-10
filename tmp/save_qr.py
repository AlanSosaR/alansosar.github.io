import sys, json, base64
d = json.load(sys.stdin)
b = d["base64"].split(",", 1)[1]
open("/tmp/qr.png", "wb").write(base64.b64decode(b))
print("QR guardado en /tmp/qr.png")
