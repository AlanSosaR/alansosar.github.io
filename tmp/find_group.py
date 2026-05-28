import sys, json
data = json.load(sys.stdin)
group_jid = "120363410476492208@g.us"
if isinstance(data, list):
    for c in data:
        if c.get("remoteJid", "") == group_jid:
            print(f"ENCONTRADO: {c.get('remoteJid')} - {c.get('pushName', 'sin nombre')}")
            break
    else:
        print("Grupo NO encontrado en los chats")
        print(f"Total chats: {len(data)}")
        for c in data:
            jid = c.get("remoteJid", "")
            if jid.endswith("@g.us"):
                print(f"  {jid} - {c.get('pushName', 'sin nombre')}")
else:
    print("Respuesta inesperada")
