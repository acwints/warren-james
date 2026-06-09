export class IntegrationHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly provider: string,
    readonly responseBody: string,
  ) {
    super(message);
    this.name = "IntegrationHttpError";
  }
}

export async function providerFetch(
  provider: string,
  url: string,
  init: RequestInit,
) {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new IntegrationHttpError(
      `${provider} request failed with ${response.status}`,
      response.status,
      provider,
      responseBody.slice(0, 1000),
    );
  }

  return response;
}
