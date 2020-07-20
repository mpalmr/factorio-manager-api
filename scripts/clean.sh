#!/usr/bin/env bash
set -e

usage () {
	cat <<HELP_USAGE

	$0 [-cdp]

	-c Removes all containers and their volumes
	-d Removes databases
	-p Remove and reinstalls npm packages
HELP_USAGE
}

base_path="$(dirname "$0")/.."
db_path="$base_path/db.sqlite3"
containers_path="$base_path/containers"

clean_db=false
clean_containers=false
clean_packages=false

while getopts ":adpc" opt; do
	case ${opt} in
		c)
			clean_containers=true
			;;
		d)
			clean_db=true
			;;
		p)
			clean_packages=true
			;;
		h)
			usage
			exit 1
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
	rm -f "$base_path/*.sqlite3"
	npx knex migrate:latest
fi

if [[ "$clean_containers" == true ]]; then
	echo "Cleaning containers..."
	rm -rf "$containers_path/*/"
	docker rm -vf "$(docker ps -qaf name=fma)" 2> /dev/null
fi

if [[ "$clean_packages" == true ]]; then
	rm -rf "$base_path/node_modules" 2> /dev/null
	if [[ ! -z "$(command -v nvm)" ]]; then
		nvm use 2> /dev/null
	fi
	npm i
fi
