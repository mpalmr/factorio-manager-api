#!/usr/bin/env bash
set -e

base_path="$(dirname "$0")/.."
source "$base_path/scripts/include.sh"

clean_packages=false

while getopts ":p" opt; do
	case ${opt} in
		p)
			clean_packages=true
			;;
		*)
			2>& echo "Invalid argument: $opt"
			exit 1
			;;
	esac
done

containers="$(docker ps -qaf label=factorio_manager_api)"
if [[ ! -z "$containers" ]]; then
	echo "Removing containers and volumes..."
	docker rm -vf "$(docker ps -qaf label=fma)"
fi

echo "Cleaning files..."
rm -rf \
	"$containers_path/*/" \
	"$base_path/db.sqlite3" \
	2> /dev/null

if [[ "$clean_packages" -eq true ]]; then
	rm -rf node_modules 2> /dev/null
	if [[ ! -z "$(command -v nvm)" ]]; then
		nvm use 2> /dev/null
	fi
	npm i
fi

npx knex migrate:latest
