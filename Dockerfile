FROM python:3
WORKDIR /usr/src/app/
COPY yt-dlp ./
RUN chmod a+rx ./yt-dlp