#!/usr/bin/env bash
set -e

base_path="$(dirname "$0")"
eval "$(egrep -v '^#' $base_path/.env | xargs)"

echo "Clean database..."
rm -f "$base_path/*.sqlite3"
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
