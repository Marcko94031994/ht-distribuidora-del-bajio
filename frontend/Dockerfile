# Build stage
FROM node:22-alpine as build
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

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
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
