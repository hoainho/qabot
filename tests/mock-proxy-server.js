import { createServer } from "node:http";

const server = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    const authHeader = req.headers["authorization"] || "";
    const apiKey = req.headers["x-api-key"] || "";

    res.setHeader("Content-Type", "application/json");

    if (req.url === "/v1/models") {
      res.end(JSON.stringify({ data: [{ id: "mock-model" }] }));
      return;
    }

    if (req.url === "/v1/chat/completions") {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        parsed = {};
      }

      res.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: `QABOT_OK - received model: ${parsed.model || "none"}, messages: ${parsed.messages?.length || 0}`,
              },
            },
          ],
        }),
      );
      return;
    }

    if (req.url === "/custom-endpoint") {
      res.end(JSON.stringify({ text: "QABOT_OK from custom endpoint" }));
      return;
    }

    if (req.url === "/needs-auth") {
      if (!authHeader && !apiKey) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: "Missing API key" }));
        return;
      }
      res.end(
        JSON.stringify({
          choices: [
            { message: { content: `QABOT_OK auth=${authHeader || apiKey}` } },
          ],
        }),
      );
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Not found" }));
  });
});

const port = parseInt(process.argv[2] || "0");
server.listen(port, () => {
  console.log(server.address().port);
});
