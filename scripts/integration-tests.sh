#!/usr/bin/env bash
set -e

base_path="$(dirname "$0")/.."
source "$base_path/scripts/include.sh"

if [[ ! is_docker_running ]]; then
	2>& echo "Docker daemon must be running to run tests..."
fi

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

echo "Running tests..."
if [[ -z $DEBUG ]]; then
	NODE_ENV=test npx jest \
		-ic jest.integration.config.js \
		"$watch"
else
	NODE_ENV=test node \
		--inspect-brk \
		node_modules/.bin/jest \
		-ic jest.integration.config.js \
		"$watch"
fi
