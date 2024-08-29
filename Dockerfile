FROM node:18-alpine

WORKDIR /app

COPY ./package.json /app/
COPY ./index.js /app/src/

RUN yarn install --production
RUN npm update
RUN npm install express cors axios
RUN npm install --save-dev nodemon

CMD ["node", "src/index.js"]

EXPOSE 3000
