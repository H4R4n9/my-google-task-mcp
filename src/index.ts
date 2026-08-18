#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod/v4";
import { GoogleTasksApiError, GoogleTasksClient } from "./google-tasks-client.js";
import type { AddTaskInput, CreateTaskListInput, ListTasksInput, Task, TaskList } from "./types.js";

const TOKEN_ENV_NAME = "GOOGLE_TASKS_ACCESS_TOKEN";
const MAX_TITLE_LENGTH = 1024;
const MAX_NOTES_LENGTH = 8192;

const createTaskListSchema = {
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH).describe("새 할 일 목록 제목"),
};

const addTaskSchema = {
  tasklist_id: z.string().trim().min(1).describe("할 일을 추가할 Google Tasks 목록 ID"),
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH).describe("새 할 일 제목"),
  notes: z.string().max(MAX_NOTES_LENGTH).optional().describe("할 일에 남길 메모"),
  due: z.string().datetime({ offset: true }).optional().describe("예정일: RFC 3339 형식 (예: 2026-08-19T00:00:00Z). Google Tasks는 날짜만 저장합니다."),
  parent_task_id: z.string().trim().min(1).optional().describe("하위 할 일로 만들 대상의 부모 할 일 ID"),
};

const listTasksSchema = {
  tasklist_id: z.string().trim().min(1).describe("조회할 Google Tasks 목록 ID"),
  due_min: z.string().datetime({ offset: true }).optional().describe("이 시각 이후 예정된 할 일만 조회하는 RFC 3339 값"),
  due_max: z.string().datetime({ offset: true }).optional().describe("이 시각 이전 예정된 할 일만 조회하는 RFC 3339 값"),
  show_completed: z.boolean().optional().describe("완료한 할 일을 결과에 포함할지 여부"),
};

const server = new McpServer({
  name: "google-tasks-mcp-server",
  version: "1.0.0",
});

server.registerTool(
  "create_tasklist",
  {
    title: "할 일 목록 만들기",
    description: "인증된 Google 계정에 새 Google Tasks 목록을 만듭니다.",
    inputSchema: createTaskListSchema,
    outputSchema: {
      tasklist: z.object({ id: z.string(), title: z.string(), updated: z.string().optional() }),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async (input: CreateTaskListInput) => withClient(async (client) => {
    const tasklist = await client.createTaskList(input.title);
    const output = { tasklist: taskListSummary(tasklist) };
    return success(output, `할 일 목록 **${tasklist.title}**을(를) 만들었습니다.\n\nID: \`${tasklist.id}\``);
  }),
);

server.registerTool(
  "list_tasklists",
  {
    title: "할 일 목록 조회",
    description: "인증된 Google 계정의 Google Tasks 목록을 조회합니다.",
    outputSchema: {
      tasklists: z.array(z.object({ id: z.string(), title: z.string(), updated: z.string().optional() })),
      next_page_token: z.string().optional(),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async () => withClient(async (client) => {
    const result = await client.listTaskLists();
    const output = {
      tasklists: (result.items ?? []).map(taskListSummary),
      ...(result.nextPageToken ? { next_page_token: result.nextPageToken } : {}),
    };
    const text = output.tasklists.length === 0
      ? "Google Tasks 목록이 없습니다."
      : `# Google Tasks 목록\n\n${output.tasklists.map((item) => `- **${item.title}** — \`${item.id}\``).join("\n")}`;
    return success(output, text);
  }),
);

server.registerTool(
  "add_task",
  {
    title: "할 일 추가",
    description: "지정한 Google Tasks 목록에 할 일을 추가합니다. parent_task_id를 지정하면 해당 할 일의 하위 할 일로 만듭니다.",
    inputSchema: addTaskSchema,
    outputSchema: {
      task: z.object({
        id: z.string(), title: z.string(), notes: z.string().optional(), due: z.string().optional(),
        status: z.string(), parent_task_id: z.string().optional(), completed: z.string().optional(), web_view_link: z.string().optional(),
      }),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async (input: AddTaskInput) => withClient(async (client) => {
    const task = await client.addTask(
      input.tasklist_id,
      { title: input.title, ...(input.notes !== undefined ? { notes: input.notes } : {}), ...(input.due !== undefined ? { due: input.due } : {}) },
      input.parent_task_id,
    );
    const output = { task: taskSummary(task) };
    const parentText = task.parent ? `\n\n부모 할 일 ID: \`${task.parent}\`` : "";
    return success(output, `할 일 **${task.title}**을(를) 추가했습니다.\n\nID: \`${task.id}\`${parentText}`);
  }),
);

server.registerTool(
  "list_tasks",
  {
    title: "할 일 조회",
    description: "지정한 Google Tasks 목록의 할 일을 조회합니다. 예정일 범위와 완료 여부로 결과를 필터링할 수 있습니다.",
    inputSchema: listTasksSchema,
    outputSchema: {
      tasks: z.array(z.object({
        id: z.string(), title: z.string(), notes: z.string().optional(), due: z.string().optional(),
        status: z.string(), parent_task_id: z.string().optional(), completed: z.string().optional(), web_view_link: z.string().optional(),
      })),
      next_page_token: z.string().optional(),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async (input: ListTasksInput) => withClient(async (client) => {
    const result = await client.listTasks(input.tasklist_id, {
      dueMin: input.due_min,
      dueMax: input.due_max,
      showCompleted: input.show_completed,
    });
    const output = {
      tasks: (result.items ?? []).map(taskSummary),
      ...(result.nextPageToken ? { next_page_token: result.nextPageToken } : {}),
    };
    const text = output.tasks.length === 0
      ? "조건에 맞는 할 일이 없습니다."
      : `# 할 일\n\n${output.tasks.map((item) => `- [${item.status === "completed" ? "x" : " "}] **${item.title}** — \`${item.id}\`${item.due ? ` (예정일: ${item.due.slice(0, 10)})` : ""}`).join("\n")}`;
    return success(output, text);
  }),
);

async function withClient<T>(handler: (client: GoogleTasksClient) => Promise<T>): Promise<T | ReturnType<typeof failure>> {
  const token = process.env[TOKEN_ENV_NAME]?.trim();
  if (!token) return failure(`${TOKEN_ENV_NAME} 환경변수가 없습니다. Google OAuth Playground에서 tasks 범위의 액세스 토큰을 발급해 설정한 뒤 다시 시도하세요.`);
  try {
    return await handler(new GoogleTasksClient(token));
  } catch (error) {
    const message = error instanceof GoogleTasksApiError ? error.message : "예상하지 못한 오류가 발생했습니다. 다시 시도하세요.";
    console.error("Google Tasks tool error:", error);
    return failure(message);
  }
}

function taskListSummary(tasklist: TaskList) {
  return { id: tasklist.id, title: tasklist.title, ...(tasklist.updated ? { updated: tasklist.updated } : {}) };
}

function taskSummary(task: Task) {
  return {
    id: task.id, title: task.title, ...(task.notes ? { notes: task.notes } : {}), ...(task.due ? { due: task.due } : {}),
    status: task.status, ...(task.parent ? { parent_task_id: task.parent } : {}), ...(task.completed ? { completed: task.completed } : {}), ...(task.webViewLink ? { web_view_link: task.webViewLink } : {}),
  };
}

function success<T>(structuredContent: T, text: string) {
  return { content: [{ type: "text" as const, text }], structuredContent };
}

function failure(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: `오류: ${message}` }] };
}

async function main() {
  await server.connect(new StdioServerTransport());
  console.error("Google Tasks MCP server is running via stdio.");
}

main().catch((error: unknown) => {
  console.error("MCP server failed to start:", error);
  process.exitCode = 1;
});
