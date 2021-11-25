FROM node
RUN apt install python3.9 -y
ENV PORT=80
ENV SERVER_EP=storage.patient.ipst-dev.com
ENV MAXSIZE=30000000
EXPOSE 80
WORKDIR /usr/src/app/videoservice
COPY . .
RUN mkdir caches
RUN chmod a+rx yt-dlp
RUN npm i
CMD [ "node",  "VideoService.js"]