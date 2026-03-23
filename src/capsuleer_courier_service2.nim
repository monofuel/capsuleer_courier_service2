import
  std/[os, strformat, strutils],
  mummy, mummy/routers,
  webby/httpheaders

const
  Version = "0.1.0"
  DefaultPort = 3000
  DefaultWebDir = "web"

proc serveStaticFile(request: Request) =
  let webDir = getCurrentDir() / DefaultWebDir
  var path = request.path
  if path == "/":
    path = "/index.html"

  # Prevent directory traversal
  let normalized = normalizedPath(webDir / path)
  if not normalized.startsWith(webDir):
    request.respond(403, emptyHttpHeaders(), "Forbidden")
    return

  if not fileExists(normalized):
    request.respond(404, emptyHttpHeaders(), "Not found")
    return

  let content = readFile(normalized)
  var headers = emptyHttpHeaders()

  if normalized.endsWith(".html"):
    headers["Content-Type"] = "text/html; charset=utf-8"
  elif normalized.endsWith(".js"):
    headers["Content-Type"] = "application/javascript"
  elif normalized.endsWith(".css"):
    headers["Content-Type"] = "text/css"
  else:
    headers["Content-Type"] = "application/octet-stream"

  request.respond(200, headers, content)

proc main() =
  ## Start the static file server.
  let portNum = parseInt(getEnv("PORT", $DefaultPort))
  let port = Port(portNum)
  var router: Router
  router.get("/", serveStaticFile)
  router.get("/**", serveStaticFile)

  let server = newServer(router)
  echo "Capsuleer Courier Service v" & Version
  echo "Serving " & DefaultWebDir & "/ on http://localhost:" & $portNum
  server.serve(port)

when isMainModule:
  main()
