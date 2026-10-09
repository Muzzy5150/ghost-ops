FROM node:24-alpine
WORKDIR /worker
COPY synthetic-worker.mjs ./worker.mjs
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "worker.mjs"]
