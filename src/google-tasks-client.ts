import type { GoogleListResponse, Task, TaskList } from "./types.js";

const API_BASE_URL = "https://tasks.googleapis.com/tasks/v1";

export class GoogleTasksApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "GoogleTasksApiError";
  }
}

export class GoogleTasksClient {
  constructor(
    private readonly accessToken: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async createTaskList(title: string): Promise<TaskList> {
    return this.request<TaskList>("/users/@me/lists", {
      method: "POST",
      body: { title },
    });
  }

  async listTaskLists(): Promise<GoogleListResponse<TaskList>> {
    return this.request<GoogleListResponse<TaskList>>("/users/@me/lists", {
      query: { maxResults: "1000" },
    });
  }

  async addTask(
    tasklistId: string,
    task: { title: string; notes?: string; due?: string },
    parentTaskId?: string,
  ): Promise<Task> {
    return this.request<Task>(`/lists/${encodeURIComponent(tasklistId)}/tasks`, {
      method: "POST",
      query: parentTaskId ? { parent: parentTaskId } : undefined,
      body: task,
    });
  }

  async listTasks(
    tasklistId: string,
    filters: { dueMin?: string; dueMax?: string; showCompleted?: boolean },
  ): Promise<GoogleListResponse<Task>> {
    const query: Record<string, string> = {};
    if (filters.dueMin) query.dueMin = filters.dueMin;
    if (filters.dueMax) query.dueMax = filters.dueMax;
    if (filters.showCompleted !== undefined) {
      query.showCompleted = String(filters.showCompleted);
      // Google requires showHidden=true to include completed tasks hidden by its UI.
      if (filters.showCompleted) query.showHidden = "true";
    }

    return this.request<GoogleListResponse<Task>>(
      `/lists/${encodeURIComponent(tasklistId)}/tasks`,
      { query },
    );
  }

  private async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST";
      query?: Record<string, string>;
      body?: unknown;
    } = {},
  ): Promise<T> {
    const url = new URL(`${API_BASE_URL}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      url.searchParams.set(key, value);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new GoogleTasksApiError(
        "Google Tasks API에 연결하지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도하세요.",
      );
    }

    if (!response.ok) {
      throw new GoogleTasksApiError(await formatApiError(response), response.status);
    }

    return (await response.json()) as T;
  }
}

async function formatApiError(response: Response): Promise<string> {
  if (response.status === 401) {
    return "Google 액세스 토큰이 없거나 만료되었습니다. GOOGLE_TASKS_ACCESS_TOKEN을 새 토큰으로 설정하세요.";
  }
  if (response.status === 403) {
    return "Google Tasks 권한이 없습니다. 토큰에 https://www.googleapis.com/auth/tasks 범위를 부여했는지 확인하세요.";
  }
  if (response.status === 404) {
    return "요청한 할 일 목록 또는 할 일을 찾지 못했습니다. ID를 확인하세요.";
  }
  if (response.status === 429) {
    return "Google Tasks API 요청 한도에 도달했습니다. 잠시 후 다시 시도하세요.";
  }

  const body: unknown = await response.json().catch(() => undefined);
  const message = isGoogleError(body) ? body.error.message : undefined;
  return message
    ? `Google Tasks API 요청에 실패했습니다: ${message}`
    : `Google Tasks API 요청에 실패했습니다 (HTTP ${response.status}).`;
}

function isGoogleError(value: unknown): value is { error: { message: string } } {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const error = value.error;
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  );
}
