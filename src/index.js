import { createServer } from "node:http";
import { join } from "node:path";
import { hostname } from "node:os";
import wisp from "wisp-server-node";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { publicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

function setupGlobalErrorHandling() {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

setupGlobalErrorHandling()

const fastify = Fastify({
  serverFactory: (handler) => {
    return createServer()
      .on("request", (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.url?.startsWith("/uv/service")) {
          res.setHeader("Service-Worker-Allowed", "/");
          res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
          res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
        }

        handler(req, res);
      })
      .on("upgrade", (req, socket, head) => {
        if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
        else socket.end();
      });
  },
});

fastify.register(fastifyStatic, {
  root: uvPath,
  prefix: "/uv/",
  decorateReply: false,
  setHeaders: (res, path) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (path.includes("service")) {
      res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
      res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
    }
  }
});

fastify.register(fastifyStatic, {
  root: publicPath,
  decorateReply: true,
  setHeaders: (res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
});

fastify.get("/uv/uv.config.js", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  return res.sendFile("uv/uv.config.js", publicPath);
});

fastify.register(fastifyStatic, {
  root: epoxyPath,
  prefix: "/epoxy/",
  decorateReply: false,
  setHeaders: (res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
});

fastify.register(fastifyStatic, {
  root: baremuxPath,
  prefix: "/baremux/",
  decorateReply: false,
  setHeaders: (res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
});

fastify.get("/uv/service/:file", (req, res) => {
  res.header("Service-Worker-Allowed", "/");
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.header("Cross-Origin-Opener-Policy", "unsafe-none");
  res.sendFile(join(uvPath, "service.js"));
});

fastify.addHook('onSend', async (request, reply, payload) => {
  if (request.url.startsWith('/uv/') &&
      reply.getHeader('content-type')?.includes('text/html')) {

    const navbar = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; background: #333; color: white; padding: 10px; z-index: 9999; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <a href="/" style="color: white; text-decoration: none; margin-right: 15px;">Home</a>
        <a href="/uv/" style="color: white; text-decoration: none; margin-right: 15px;">Proxy</a>
      </div>
      <div>
        <span id="current-url" style="margin-right: 15px;">${request.url}</span>
        <input type="text" id="nav-url" placeholder="Enter URL" style="padding: 5px; width: 300px;">
        <button onclick="navigateToUrl()" style="padding: 5px 10px; margin-left: 5px;">Go</button>
      </div>
    </div>
    <script>
      function navigateToUrl() {
        const url = document.getElementById('nav-url').value;
        if (url) {
          window.location.href = '/uv/' + (url.startsWith('http') ? url : 'https://' + url);
        }
      }

      document.body.style.marginTop = '50px';

      document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('nav-url').focus();
      });
    </script>
    `;

    const modifiedPayload = payload.toString()
      .replace(/<body[^>]*>/i, '$&' + navbar)
      .replace(/<\/body>/i, navbar + '$&');

    return modifiedPayload;
  }
  return payload;
});

fastify.server.on("listening", () => {
  const address = fastify.server.address();
  console.log("Listening on:");
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  console.log(
    `\thttp://${
      address.family === "IPv6" ? `[${address.address}]` : address.address
    }:${address.port}`
  );
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("SIGTERM signal received: closing HTTP server");
  fastify.close();
  process.exit(0);
}

let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 8080;

fastify.listen({
  port: port,
  host: "0.0.0.0",
}).catch(err => {
  console.error("Server startup error:", err);
  process.exit(1);
});