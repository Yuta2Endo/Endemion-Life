# Nginx перед сайтом и API. Конфигурацию выбирает nginx-entrypoint.sh: tls (свой сертификат), bootstrap
# (сертификата ещё нет — только проверка ACME) или behind-proxy (HTTPS завершает внешний прокси)
FROM nginx:1.31-alpine
COPY infrastructure/nginx/nginx-entrypoint.sh /opt/endemion/nginx-entrypoint.sh
COPY infrastructure/nginx/templates/ /opt/endemion/templates/
COPY infrastructure/nginx/snippets/ /opt/endemion/snippets/
RUN chmod 0755 /opt/endemion/nginx-entrypoint.sh && mkdir -p /var/www/certbot /etc/nginx/snippets
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1/nginx-health"]
STOPSIGNAL SIGQUIT
ENTRYPOINT ["/opt/endemion/nginx-entrypoint.sh"]
