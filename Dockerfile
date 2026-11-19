# --- build ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Alamat backend ditanam saat build (Vite membaca VITE_* hanya saat build). Di Railway, isi variabel VITE_API_URL pada service ini.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- serve ---
FROM nginx:1.27-alpine
# nginx membaca *.template dan mengisi ${PORT} dari environment (Railway mengisi PORT)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV PORT=8080
EXPOSE 8080
