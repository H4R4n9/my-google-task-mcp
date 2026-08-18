import assert from "node:assert/strict";
import test from "node:test";
import { GoogleTasksClient } from "./google-tasks-client.js";

function fakeFetch(responseBody: unknown) {
  const calls: Array<{ input: URL; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ input: new URL(input.toString()), init });
    return new Response(JSON.stringify(responseBody), { status: 200 });
  };
  return { calls, fetchImpl };
}

test("addTask sends the parent as a query parameter and task fields as JSON", async () => {
  const mock = fakeFetch({ id: "task-1", title: "치과 예약", status: "needsAction" });
  const client = new GoogleTasksClient("token", mock.fetchImpl);

  await client.addTask("list/1", { title: "치과 예약", notes: "오전" }, "parent/1");

  assert.equal(mock.calls.length, 1);
  const [call] = mock.calls;
  assert.equal(call.input.pathname, "/tasks/v1/lists/list%2F1/tasks");
  assert.equal(call.input.searchParams.get("parent"), "parent/1");
  assert.equal(call.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(call.init?.body)), { title: "치과 예약", notes: "오전" });
});

test("listTasks maps MCP filters to Google query parameters", async () => {
  const mock = fakeFetch({ items: [] });
  const client = new GoogleTasksClient("token", mock.fetchImpl);

  await client.listTasks("list-1", {
    dueMin: "2026-08-19T00:00:00Z",
    dueMax: "2026-08-20T00:00:00Z",
    showCompleted: true,
  });

  const [call] = mock.calls;
  assert.equal(call.input.searchParams.get("dueMin"), "2026-08-19T00:00:00Z");
  assert.equal(call.input.searchParams.get("dueMax"), "2026-08-20T00:00:00Z");
  assert.equal(call.input.searchParams.get("showCompleted"), "true");
  assert.equal(call.input.searchParams.get("showHidden"), "true");
});
