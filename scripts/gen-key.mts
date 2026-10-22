import { JoseKey } from "@atproto/oauth-client-node";

async function main() {
  const key = await JoseKey.generate(["ES256"], `kelo-hub-${Date.now()}`);
  process.stdout.write(`${JSON.stringify(key.privateJwk)}\n`);
}

main().catch(() => {
  process.stderr.write("Could not generate the AT Protocol OAuth signing key.\n");
  process.exitCode = 1;
});
