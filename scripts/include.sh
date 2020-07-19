db_path="$base_path/db.sqlite3"
containers_path="$base_path/containers"

function is_docker_running {
	curl -s --unix-socket /var/run/docker.sock http://ping > /dev/null
	return "$?" == "7"
}
