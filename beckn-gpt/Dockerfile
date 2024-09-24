FROM node:20-alpine3.17

WORKDIR /app

COPY . .

RUN npm install

EXPOSE ${PORT}

CMD ["npm", "run", "prod"]
