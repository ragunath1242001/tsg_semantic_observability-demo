FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app 
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY libs/dtos/package.json libs/dtos/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY apps apps
COPY libs libs 
RUN pnpm run --parallel -r build
RUN pnpm deploy --filter backend --prod /prod/backend
RUN pnpm deploy --filter frontend --prod /prod/frontend

FROM base AS deploy 
WORKDIR /app
COPY --from=build /prod/backend .
COPY --from=build /prod/frontend/dist frontend/
EXPOSE 3000
ENV EMBEDDED_FRONTEND="/app/frontend"
CMD ["pnpm", "start"]
