#!/usr/bin/env bash
# Creates the Docker secret files compose.yaml needs, in ./secrets

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dir="$root/secrets"
mkdir -p "$dir"
chmod 700 "$dir"

rand() { openssl rand -base64 48 | tr -d '/+=\n' | cut -c1-"$1"; }

write() { # name, content
  local path="$dir/$1"
  if [[ -e "$path" ]]; then
    echo "keep    secrets/$1"
  else
    umask 022
    printf '%s' "$2" > "$path"
    chmod 644 "$path"
    echo "create  secrets/$1"
  fi
}

write postgres_password "$(rand 40)"

# Fernet key
write app_encryption_keys "$(openssl rand -base64 32 | tr '+/' '-_')"

s3_access="$(rand 20)"
s3_secret="$(rand 40)"
write seaweedfs_s3_config.json "$(cat <<JSON
{
  "identities": [
    {
      "name": "app",
      "credentials": [{ "accessKey": "$s3_access", "secretKey": "$s3_secret" }],
      "actions": ["Admin", "Read", "List", "Tagging", "Write"]
    }
  ]
}
JSON
)"

cat <<'NOTE'

Done. During first-run setup in the web app, enter the S3 access and secret key
from secrets/seaweedfs_s3_config.json on the storage settings step.
Back up secrets/app_encryption_keys separately: without it, the API keys stored
in the database can't be decrypted.
NOTE
