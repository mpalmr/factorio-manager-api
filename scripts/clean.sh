#!/usr/bin/env bash
set -e

base_path="$(dirname "$0")"
eval "$(egrep -v '^#' $base_path/.env | xargs)"

echo "Clean database..."
db_path="$base_path/db.sqlite3"
if [[ -f "$db_path" ]]; then
	rm -f "$db_path"
fi
NODE_ENV=development npx knex migrate:latest

if [[ ! -z "$(ls -l $VOLUME_ROOT | grep -v .gitkeep)" ]]; then
	echo "Clean volumes..."
	rm -rf "$VOLUME_ROOT/*"
fi

containers="$(docker ps -qaf name=$CONTAINER_NAMESPACE_)"
if [[ ! -z "$containers" ]]; then
	echo "Cleaning containers..."
	docker rm -vf "$containers"
fi
