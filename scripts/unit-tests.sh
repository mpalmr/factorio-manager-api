#!/usr/bin/env bash
set -e

base_path="$(dirname "$0")/.."
source "$base_path/scripts/include.sh"

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
if [[ $DEBUG -ne "true" ]]; then
	NODE_ENV=test npx jest "$watch"
else
	NODE_ENV=test node \
		--inspect-brk \
		node_modules/.bin/jest \
		-i \
		"$watch"
fi
