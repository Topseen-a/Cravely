.PHONY: run seed test vet fmt build

run:
	go run .

seed:
	go run ./cmd/seed

test:
	go test ./...

vet:
	go vet ./...

fmt:
	gofmt -w .

build:
	go build -o fooddash-api .
