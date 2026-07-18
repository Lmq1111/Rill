VERSION ?= 0.1.0
LDFLAGS := -s -w -X reasonix/internal/brand.Version=$(VERSION)
GOEXE := $(shell go env GOEXE)

.PHONY: build vet fmt test desktop-test desktop-test-short desktop-test-times hooks cross clean

build:
	CGO_ENABLED=0 go build -ldflags "$(LDFLAGS)" -o bin/rillagent$(GOEXE) ./cmd/rillagent
	CGO_ENABLED=0 go build -ldflags "$(LDFLAGS)" -o bin/rillagent-plugin-example$(GOEXE) ./cmd/rillagent-plugin-example

vet:
	go vet ./...

fmt:
	gofmt -w .

test:
	go test ./...

desktop-test:
	cd desktop && go test .

desktop-test-short:
	cd desktop && go test -short .

desktop-test-times:
	cd desktop && go test -count=1 -json . | python3 ../scripts/desktop-test-times.py

hooks:
	@git config core.hooksPath .githooks
	@echo "installed: core.hooksPath -> .githooks (pre-push runs go vet)"

cross:
	@mkdir -p dist
	@for p in darwin/amd64 darwin/arm64 linux/amd64 linux/arm64 windows/amd64 windows/arm64; do \
		os=$${p%/*}; arch=$${p#*/}; ext=; [ $$os = windows ] && ext=.exe; \
		echo "build $$os/$$arch"; \
		CGO_ENABLED=0 GOOS=$$os GOARCH=$$arch go build -ldflags "$(LDFLAGS)" -o dist/rillagent-$$os-$$arch$$ext ./cmd/rillagent; \
	done

clean:
	rm -rf bin dist
