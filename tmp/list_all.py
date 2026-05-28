import sys, json
data = json.load(sys.stdin)
if isinstance(data, list):
    print(f"Total chats: {len(data)}")
    for c in data:
        jid = c.get("remoteJid", "")
        name = c.get("pushName", "")
        print(f"{jid} => {name}")
