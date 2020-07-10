#!/usr/bin/env bash
set -e

base_path="$(dirname "$0")/.."
db_path="$base_path/db-test.sqlite3"

watch=""

while getopts ":w" opt; do
	case ${opt} in
		w)
			watch="--watchAll"
			;;
		*)
			2>& echo "Invalid argument: $opt"
			exit 1
			;;
	esac
done

if [[ -f "$db_path" ]]; then
	rm "$db_path"
fi

NODE_ENV=test npx knex migrate:latest
NODE_ENV=test npx jest -ic jest.integration.config.js "$watch"
