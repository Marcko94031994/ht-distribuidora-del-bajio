# Build stage
FROM node:18-alpine as build
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all files and build
COPY . .
# Optional: Set the API URL for production build if needed
# ENV VITE_API_URL=/api 
RUN npm run build

# Serve stage
FROM nginx:alpine
# Copy the built assets from the build stage to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Replace default Nginx config to allow React Router to work (fallback to index.html)
RUN echo "server { \\
    listen 80; \\
    location / { \\
        root /usr/share/nginx/html; \\
        index index.html index.htm; \\
        try_files \\\$uri \\\$uri/ /index.html; \\
    } \\
    location /api/ { \\
        proxy_pass http://api:5200/; \\
        proxy_http_version 1.1; \\
        proxy_set_header Upgrade \\\$http_upgrade; \\
        proxy_set_header Connection keep-alive; \\
        proxy_set_header Host \\\$host; \\
        proxy_cache_bypass \\\$http_upgrade; \\
    } \\
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
