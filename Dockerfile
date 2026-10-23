FROM node:24-bookworm-slim
ENV NODE_ENV=production LOAD_DOTENV=0 HOST=0.0.0.0 PORT=8765
WORKDIR /app
# No production npm dependencies. Keep secrets, fixtures and developer tools out.
COPY --chown=node:node package.json server.mjs auth.mjs usage-store.mjs ./
COPY --chown=node:node index.html privacy.html help.html favicon.ico favicon.png favicon.svg ./
COPY --chown=node:node js ./js
COPY --chown=node:node css ./css
COPY --chown=node:node assets/styles ./assets/styles
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 8765
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:8765/api/health',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
