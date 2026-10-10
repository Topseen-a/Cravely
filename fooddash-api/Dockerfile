FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api . \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/seed ./cmd/seed

FROM alpine:3.22
# tzdata for Africa/Lagos, ca-certificates for Paystack HTTPS calls
RUN apk add --no-cache tzdata ca-certificates && adduser -D -u 10001 app
COPY --from=build /out/api /out/seed /usr/local/bin/
USER app
EXPOSE 8080
CMD ["api"]
