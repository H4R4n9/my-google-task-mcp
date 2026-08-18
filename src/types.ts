export interface TaskList {
  id: string;
  title: string;
  updated?: string;
  selfLink?: string;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: "needsAction" | "completed" | string;
  parent?: string;
  completed?: string;
  webViewLink?: string;
}

export interface GoogleListResponse<T> {
  items?: T[];
  nextPageToken?: string;
}

export interface CreateTaskListInput {
  title: string;
}

export interface AddTaskInput {
  tasklist_id: string;
  title: string;
  notes?: string;
  due?: string;
  parent_task_id?: string;
}

export interface ListTasksInput {
  tasklist_id: string;
  due_min?: string;
  due_max?: string;
  show_completed?: boolean;
}
