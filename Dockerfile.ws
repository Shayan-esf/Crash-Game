FROM node:18-alpine

WORKDIR /app

# کپی کردن package.json و package-lock.json
COPY package*.json ./
COPY pnpm-lock.yaml ./

# نصب وابستگی‌ها
RUN npm install -g pnpm
RUN pnpm install

# کپی کردن سورس کد پروژه
COPY . .

# تولید کلاینت پریزما (Prisma Client)
RUN npx prisma generate

# باز کردن پورت وب‌سوکت
EXPOSE 4001

# اجرای سرور وب‌سوکت
CMD ["node", "ws-server.js"] 