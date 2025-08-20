FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

#===================#

FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production

# 빌더 스테이지에서 빌드된 결과물을 복사합니다.
COPY --from=builder /usr/src/app/dist ./dist

# (보안 강화) 애플리케이션을 실행할 non-root 사용자 및 그룹 생성
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# (보안 강화) 애플리케이션 파일의 소유권을 새로운 사용자로 변경
RUN chown -R appuser:appgroup /usr/src/app
# (보안 강화) non-root 사용자로 전환
USER appuser

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/main"]