FROM node:lts AS build
WORKDIR /app
COPY package.json /app
RUN npm install
COPY  . /app
CMD [ "npm","run","prod" ]
