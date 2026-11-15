import httpx


async def test_healthz_returns_ok(client: httpx.AsyncClient) -> None:
    response = await client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_healthz_is_in_the_openapi_schema(client: httpx.AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert "/healthz" in response.json()["paths"]
