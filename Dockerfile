FROM nginx:alpine

# TEST keeps using /usr/share/nginx/html.
COPY dist/workouts-frontend/browser/ /usr/share/nginx/html/

# PROD keeps using the existing nginx.runtime.conf, which expects
# /usr/share/nginx/html/browser.
COPY dist/workouts-frontend/browser/ /usr/share/nginx/html/browser/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
