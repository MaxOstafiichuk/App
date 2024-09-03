FROM node:18-alpine

WORKDIR /app

COPY ./package.json /app/
COPY ./index.js /app/src/
COPY ./index.html /app/src/web-site

RUN yarn install --production
RUN npm init -y
RUN npm install -g npm@10.8.3
RUN npm update
RUN npm install express cors axios
RUN npm install --save-dev nodemon

CMD ["node", "src/index.js"]

EXPOSE 3000
