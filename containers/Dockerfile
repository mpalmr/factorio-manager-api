FROM factoriotools/factorio:latest
LABEL factorio_manager_api true
LABEL internal_id $internal_id

EXPOSE $tcp_port:27015/tcp
EXPOSE $udp_port:34197/udp

VOLUME ./$internal_id /factorio
