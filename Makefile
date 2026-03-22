.PHONY: test integration-test e2e-test build docker-build docker-build-push serve move-build move-test deploy-local dev npm-install integration-build frontend-bundle frontend-build frontend-dev

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

npm-install:
	docker compose run --rm --entrypoint bash sui-dev -c "cd /workspace && npm install"

integration-build: nim.cfg
	@files=$$(ls tests/integration_*.nim 2>/dev/null); \
	if [ -z "$$files" ]; then \
		echo "No integration tests found in tests/integration_*.nim"; \
		exit 0; \
	fi; \
	for f in $$files; do \
		outfile=$$(echo "$$f" | sed 's/\.nim$$/.js/'); \
		echo "Compiling $$f -> $$outfile"; \
		nim js $(NIM_TEST_FLAGS) -o:"$$outfile" "$$f" || exit 1; \
	done

integration-test: integration-build
	docker compose run --rm --service-ports sui-dev bash -c "\
		/opt/sui-dev/scripts/deploy.sh && \
		cd /workspace && \
		for f in tests/integration_*.js; do \
			[ -e \"\$$f\" ] || continue; \
			echo '--- '\"\$$f\"' ---'; \
			node \"\$$f\" || exit 1; \
		done"

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

frontend-bundle:
	docker compose run --rm --entrypoint bash sui-dev -c "cd /workspace && npx esbuild sui-bridge.js --bundle --outfile=web/sui-bundle.js --format=iife"

frontend-build: nim.cfg frontend-bundle
	nim js -d:release -o:web/app.js src/web.nim

frontend-dev: nim.cfg frontend-bundle
	nim js -o:web/app.js src/web.nim

serve: build frontend-dev
	./capsuleer_courier_service2

MOVE_DIR = move-contracts/capsuleer_courier_service

dev:
	docker compose run --rm --service-ports sui-dev bash -c "/opt/sui-dev/scripts/deploy.sh && echo 'Sui node running on port 9000. Press Ctrl+C to stop.' && tail -f /dev/null"

move-build:
	docker compose run --rm --entrypoint bash sui-dev -c "cd /workspace/$(MOVE_DIR) && sui move build -e testnet"

move-test:
	docker compose run --rm --entrypoint bash -e SUI_CONFIG_DIR=/tmp/sui-test sui-dev -c "cd /workspace/$(MOVE_DIR) && sui move test"

deploy-local:
	docker compose run --rm --service-ports sui-dev bash /opt/sui-dev/scripts/deploy.sh

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
