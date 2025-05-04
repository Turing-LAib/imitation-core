FROM node:18-alpine

WORKDIR /app

ARG MONGODB_URI=mongodb://default:123456@localhost:27017/turing

# 将 ARG 转为 ENV 以便在容器运行时使用
ENV MONGODB_URI=${MONGODB_URI}
ENV OPENAI_URL=${OPENAI_URL}
ENV OPENAI_API_KEY=${OPENAI_API_KEY}


COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

USER node

CMD ["npm", "start"]