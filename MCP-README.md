# Google Tasks MCP 서버

Node.js 기반의 로컬 stdio MCP 서버입니다. 아래 네 도구를 제공합니다.

- `create_tasklist` — 새 할 일 목록 만들기
- `list_tasklists` — 내 할 일 목록 조회
- `add_task` — 목록에 할 일 또는 하위 할 일 추가
- `list_tasks` — 예정일·완료 여부로 필터링해 할 일 조회

## 설치와 빌드

```bash
npm install
npm run build
```

## Google 액세스 토큰 설정

[Google OAuth Playground](https://developers.google.com/oauthplayground)에서 **Google Tasks API v1**의 `https://www.googleapis.com/auth/tasks` 범위를 승인하고, 발급된 액세스 토큰을 사용합니다. 토큰은 한 시간 후 만료될 수 있습니다.

Codex의 전역 MCP 설정에는 토큰 값을 쓰지 않고, 실행 환경의 `GOOGLE_TASKS_ACCESS_TOKEN`을 전달합니다. 실제 토큰을 저장소·소스 코드·커밋에 넣지 마세요.

```toml
[mcp_servers.google-tasks]
command = "/opt/homebrew/bin/node"
args = ["/Users/kyla.kim/Desktop/AI_Hackathon/my-google-task-mcp/dist/index.js"]
cwd = "/Users/kyla.kim/Desktop/AI_Hackathon/my-google-task-mcp"
env_vars = ["GOOGLE_TASKS_ACCESS_TOKEN"]
default_tools_approval_mode = "writes"

```

설정을 적용한 뒤 Codex를 새 세션으로 열고 `/mcp`에서 `google-tasks`와 네 개 도구가 표시되는지 확인하세요.

## 안전성

- 이 서버는 stdio 전송만 사용하며 외부 포트를 열지 않습니다.
- 액세스 토큰은 `GOOGLE_TASKS_ACCESS_TOKEN` 환경변수에서만 읽습니다.
- `.env`와 Node.js 빌드 결과물은 Git에서 제외됩니다.
