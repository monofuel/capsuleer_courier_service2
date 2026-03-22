FROM gitea.solution-nine.monofuel.dev/monolab/monolab/monolab-nim:latest

WORKDIR /app

COPY nimby.lock capsuleer_courier_service2.nimble Makefile ./
RUN echo 'path = "src"' > nim.cfg
RUN nimby sync -g nimby.lock

COPY src ./src
RUN make build

COPY web ./web

EXPOSE 3000
CMD ["./capsuleer_courier_service2"]
