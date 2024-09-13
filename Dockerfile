FROM node:20-alpine

WORKDIR /app

COPY ./views/ /app/src/views/
COPY ./package.json /app/
COPY ./index.js /app/src/
COPY ./web-site/* /app/src/web-site/

RUN yarn install --production
RUN npm init -y
RUN npm update
RUN npm install express cors axios mysql2 path ejs

CMD ["node", "src/index.js"]

EXPOSE 3000
EXPOSE 3306
