#!/bin/bash
for ep in "group/acceptInvite" "group/acceptInviteCode" "group/join" "group/joinWithInvite" "group/add" "group/invite" "group/getInviteInfo" "group/inviteInfo" "group/fetchInviteInfo"; do
  echo "=== POST /$ep ==="
  curl -s -X POST "http://localhost:8080/$ep" -H "Content-Type: application/json" -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" -d @/tmp/invite_data.json 2>/dev/null | head -c 100
  echo
done
