import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyHubspotSignature } from "@/server/application/hubspot";

describe("HubSpot signature verification", () => {
  const body = JSON.stringify([{ objectId: "123", propertyName: "stage", propertyValue: "kickoff" }]);
  const secret = "client-secret";

  it("allows unsigned local requests when no secret is configured", () => {
    expect(verifyHubspotSignature({ body })).toBe(true);
  });

  it("validates v3 timestamped request signatures", () => {
    const method = "POST";
    const url = "https://launch.example.com/api/webhooks/hubspot?source=hubspot%40crm";
    const requestTimestamp = Date.now().toString();
    const source = `${method}${url.replace("%40", "@")}${body}${requestTimestamp}`;
    const signatureV3 = createHmac("sha256", secret).update(source, "utf8").digest("base64");

    expect(
      verifyHubspotSignature({
        body,
        method,
        requestTimestamp,
        secret,
        signatureV3,
        url,
      }),
    ).toBe(true);
  });

  it("rejects stale v3 request signatures", () => {
    const method = "POST";
    const url = "https://launch.example.com/api/webhooks/hubspot";
    const requestTimestamp = (Date.now() - 301_000).toString();
    const source = `${method}${url}${body}${requestTimestamp}`;
    const signatureV3 = createHmac("sha256", secret).update(source, "utf8").digest("base64");

    expect(
      verifyHubspotSignature({
        body,
        method,
        requestTimestamp,
        secret,
        signatureV3,
        url,
      }),
    ).toBe(false);
  });

  it("keeps accepting legacy body signatures for migration windows", () => {
    const signature = createHash("sha256").update(`${secret}${body}`).digest("hex");

    expect(verifyHubspotSignature({ body, secret, signature })).toBe(true);
  });
});
