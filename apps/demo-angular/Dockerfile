FROM nginx:1.27-alpine

COPY apps/demo-angular/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/demo-angular/dist/browser /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1
