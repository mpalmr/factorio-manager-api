db_path="$base_path/db.sqlite3"
containers_path="$base_path/containers"

function is_docker_running {
	curl -s --unix-socket /var/run/docker.sock http://ping > /dev/null
	return "$?" == "7"
}

function rm_db {
	if [[ -f "$db_path" ]]; then
		rm "$db_path"
	fi
	if [[ -f "$db_path-journal" ]]; then
		rm "$db_path-journal"
	fi
}
