# capsuleer_courier_service 2

- EVE Frontiers cycle 5 


- cycle 5 moved from EVM / solidity to Move / Sui
- we can re-write capsuleer_courier_service in Move / Sui as capsuleer_courier_service2 (this project)

## Major changes

- use Sui Move for the smart contracts
- build a whole new custom frontend with HTMX and nimponents

- for testing we can use a simple localhost http server
- capsuleer_courier_service required an http server to host stuff. but for the new v2, I would like instead to use their new "walrus" blob storage system. but this will be a ways down the road.

## Nim structure

- similar to scriptorium in project structure
- Makefile, unit, integration, e2e tests, etc
- use HTMX for the frontend
- use nimponents for any custom components

- do not install any new system dependencies (eg: rust, python, move compiler, etc)
- let's stick to using docker as much as possible.
- we have a good nim docker image: gitea.solution-nine.monofuel.dev/monolab/monolab/monolab-nim:latest
  - it's based on gentoo
  - we can make a new Dockerfile and add any new dependencies we need (eg: move compiler or such)
  - we can use a docker-compose.yml file to make it easy to run and test the project locally

## References

- ../builder-scaffold/docs/builder-flow-docker.md looks important

- ../capsuleer_courier_service is the previous version of the project
  - do not modify this project, it is available for reference only

- ../evevault is the wallet extension
  - I don't think we need to do anything relating to this? but nice to have for reference
- ../world-contracts is the new Sui Move smart contracts for EVE Frontiers

- ../builder-documentation I think is a git copy of their documentation website?

- ../builder-scaffold is a huge complex thing for how to build dapps for frontier / sui

## Nim References

- andrewlytics is a good example of a Nim HTMX webapp
  - /home/monofuel/Documents/Projects/Andrewlytics/andrewlytics
- scriptorium is a good reference of how I like to organize nim projects (makefile, unit, integration, e2e tests, etc)
  - /home/monofuel/Documents/Projects/Racha/scriptorium

- metta has a good flake.nix to reference for any funny packaging stuff
  - /home/monofuel/Documents/Projects/Softmax/metta/flake.nix

- we have many many great nim libraries available as dependencies
```
monofuel@high-steel ~/D/P/Deps (master)> pwd
/home/monofuel/Documents/Projects/Deps
monofuel@high-steel ~/D/P/Deps (master)> ls
benchy/  boxy/   chroma/  cligen/   curly/         debby/    flatty/  hippo/  jsony/  leafy/    llama_leap/  mummy/  nim-alsa/  nimcrypto/   nimsimd/      NimYAML/  noulith/  openai_leap/  pixie/  shady/  supersnappy/  uuids/        vmath/  windy/  x11/
bitty/   bumpy/  chrono/  crunchy/  db_connector/  fidget2/  genny/   isaac/  jwtea/  libcurl/  mono_llm/    Nim/    nimby/     nimponents/  nimtemplate/  noisy/    oats/     opengl/       puppy/  silky/  urlly/        vertex_leap/  webby/  ws/     zippy/
```

## Docs

- https://docs.evefrontier.com/

- dev sandbox https://docs.evefrontier.com/troubleshooting/sandbox-access
- https://github.com/evefrontier
- https://www.sui.io/developers
