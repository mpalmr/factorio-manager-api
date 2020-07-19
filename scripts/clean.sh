#!/usr/bin/env bash
set -e

base_path="$(dirname "$0")/.."
source "$base_path/scripts/include.sh"

clean_db=false
clean_containers=false
clean_packages=false

while getopts ":adpc" opt; do
	case ${opt} in
		d)
			clean_db=true
			;;
		c)
			clean_containers=true
			;;
		p)
			clean_packages=true
			;;
		*)
			clean_db=true
			clean_containers=true
			clean_packages=true
			;;
	esac
done

if [[ "$clean_db" == true ]]; then
	echo "Cleaning database..."
	rm -f "$base_path/db.sqlite3"
fi

if [[ "$clean_containers" == true ]]; then
	echo "Cleaning containers..."
	rm -rf "$containers_path/*/" 2> /dev/null
	docker rm -vf "$(docker ps -qaf name=fma)" 2> /dev/null
fi

if [[ "$clean_packages" == true ]]; then
	rm -rf "$base_path/node_modules" 2> /dev/null
	if [[ ! -z "$(command -v nvm)" ]]; then
		nvm use 2> /dev/null
	fi
	npm i
fi

npx knex migrate:latest
