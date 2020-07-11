#!/usr/bin/env bash
set -e

base_path="$(dirname "$0")/.."
source "$base_path/scripts/include.sh"

containers="$(docker ps -qaf label=factorio_manager_api)"
if [[ ! -z "$containers" ]]; then
	echo "Removing containers and volumes..."
	docker rm -vf "$(docker ps -qaf label=factorio_manager_api)"
fi

echo "Cleaning files..."
rm -rf \
	"$base_path/node_modules" \
	"$db_path" \
	"$containers_path/*/" \
	2> /dev/null

if [[ ! -z "$(command -v nvm)" ]]; then
	nvm use 2> /dev/null
fi

npm i
npx knex migrate:latest
