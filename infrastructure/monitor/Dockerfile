# Монитор доступности: curl для проверок, openssl для срока сертификата
FROM alpine:3.24
RUN apk add --no-cache curl openssl tzdata
COPY infrastructure/monitor/monitor.sh infrastructure/scripts/notify.sh /opt/monitor/
RUN chmod 0755 /opt/monitor/*.sh && adduser -D -H monitor
USER monitor
# Контейнер нездоров, если цикл проверок остановился (нет отметки дольше трёх интервалов)
HEALTHCHECK --interval=1m --timeout=5s --start-period=1m CMD ["sh", "-c", "test -n \"$(find /tmp/monitor-heartbeat -mmin -5 2>/dev/null)\""]
ENTRYPOINT ["/opt/monitor/monitor.sh"]
