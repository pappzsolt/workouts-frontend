FROM nginx:alpine

COPY dist/workouts-frontend/browser/ /usr/share/nginx/html/browser/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
