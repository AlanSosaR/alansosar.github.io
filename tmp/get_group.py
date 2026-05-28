import sys, json
data = json.load(sys.stdin)
groups = [c for c in data if c.get("remoteJid", "").endswith("@g.us")]
print(f"Total grupos: {len(groups)}")
for g in groups:
    jid = g.get("remoteJid", "")
    name = g.get("pushName", "")
    print(f"{jid} => {name}")
