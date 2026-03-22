.PHONY: test integration-test e2e-test build docker-build docker-build-push serve

DOCKER_IMAGE ?= gitea.solution-nine.monofuel.dev/monolab/capsuleer_courier_service2:latest
DOCKER_PLATFORM ?= linux/amd64

nim.cfg: nimby.lock
	nimby sync -g nimby.lock

build: nim.cfg capsuleer_courier_service2

capsuleer_courier_service2: src/capsuleer_courier_service2.nim
	nim c --mm:orc --threads:on -o:capsuleer_courier_service2 src/capsuleer_courier_service2.nim

NIM_TEST_FLAGS ?= --hints:off --warnings:off --mm:orc --threads:on

test: nim.cfg
	@files=$$(ls tests/test_*.nim 2>/dev/null); \
	if [ -z "$$files" ]; then \
		echo "No unit tests found in tests/test_*.nim"; \
		exit 0; \
	fi; \
	fail=0; \
	pids=""; \
	for f in $$files; do \
		( nim r $(NIM_TEST_FLAGS) "$$f" 2>&1 | sed "s|^|[$$f] |" ) & \
		pids="$$pids $$!"; \
	done; \
	for pid in $$pids; do \
		wait $$pid || fail=1; \
	done; \
	exit $$fail

integration-test: nim.cfg
	@found=0; \
	for f in tests/integration_*.nim; do \
		[ -e "$$f" ] || continue; \
		found=1; \
		echo "--- $$f ---"; \
		nim r $(NIM_TEST_FLAGS) "$$f" || exit 1; \
	done; \
	if [ $$found -eq 0 ]; then \
		echo "No integration tests found in tests/integration_*.nim"; \
	fi

e2e-test: nim.cfg
	@found=0; \
	for f in tests/e2e_*.nim; do \
		[ -e "$$f" ] || continue; \
		found=1; \
		echo "--- $$f ---"; \
		nim r $(NIM_TEST_FLAGS) "$$f" || exit 1; \
	done; \
	if [ $$found -eq 0 ]; then \
		echo "No e2e tests found in tests/e2e_*.nim"; \
	fi

serve: build
	./capsuleer_courier_service2

docker-build:
	docker buildx build \
		--platform $(DOCKER_PLATFORM) \
		--load \
		--provenance=false --sbom=false \
		--tag $(DOCKER_IMAGE) \
		.

docker-build-push:
	docker buildx build \
		--platform $(DOCKER_PLATFORM) \
		--push \
		--provenance=false --sbom=false \
		--tag $(DOCKER_IMAGE) \
		.
