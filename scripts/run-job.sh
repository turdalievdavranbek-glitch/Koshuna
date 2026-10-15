#!/bin/sh
set -eu
# POSIX sh has no source; this is the same as sourcing the file.
. /etc/koshuna/backend.env
curl -fsS -X POST -H "x-jobs-secret: $JOBS_SECRET" "http://127.0.0.1:43123/api/internal/jobs/$1"
