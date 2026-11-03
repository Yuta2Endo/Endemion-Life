# Контейнер резервного копирования. Версия клиента PostgreSQL совпадает с сервером (18):
# pg_dump старее сервера копию не создаст, новее — создаст архив, который старый сервер может не прочитать
FROM postgres:18-alpine
RUN apk add --no-cache rclone tzdata curl
COPY infrastructure/backup/lib.sh infrastructure/backup/backup.sh infrastructure/backup/verify-backup.sh \
     infrastructure/backup/restore.sh infrastructure/backup/entrypoint.sh infrastructure/backup/healthcheck.sh \
     infrastructure/scripts/notify.sh /opt/backup/
RUN chmod 0755 /opt/backup/*.sh \
 && ln -s /opt/backup/backup.sh /usr/local/bin/backup.sh \
 && ln -s /opt/backup/restore.sh /usr/local/bin/restore.sh \
 && ln -s /opt/backup/verify-backup.sh /usr/local/bin/verify-backup.sh
ENV BACKUP_DIR=/backups SCRIPT_DIR=/opt/backup
VOLUME ["/backups"]
HEALTHCHECK --interval=5m --timeout=10s --start-period=30s CMD ["/opt/backup/healthcheck.sh"]
ENTRYPOINT ["/opt/backup/entrypoint.sh"]
