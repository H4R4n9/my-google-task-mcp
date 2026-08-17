# Google Tasks MCP 만들기

에이전트 엔지니어링 Part 4 실습.

> **이 문서를 그대로 에이전트에게 전달하고 작업을 시키세요.**
> 코드를 손으로 짜는 실습이 아닙니다. 에이전트에게 맡기고, **나온 결과가 진짜 맞는지 확인하는 것**이 목표입니다.

| | |
|---|---|
| **저장소** | <https://github.com/kakao-ai-tech/my-google-task-mcp> |
| **제출** | 이 저장소를 Fork 하고 자기 저장소에 push — 그게 곧 제출입니다 |
| **단계별 안내** | 화면을 보며 따라갈 안내는 실습 페이지를 참고하세요 |

---

## 1. 무엇을 만드나

**내 구글 할일(Google Tasks)을 조작하는 MCP 서버.**

완성하면 이런 일이 됩니다.

```
나: "이번 주 할일에 내일 병원 예약 넣어줘"
     ↓
에이전트가 내가 만든 도구를 스스로 골라 호출
     ↓
내 스마트폰 할일 앱에 진짜로 생긴다
```

준비된 가짜 데이터를 읽는 실습이 아닙니다. **내 구글 계정의 실제 데이터가 바뀝니다.**

---

## 2. 만들 도구 — 네 개 모두

| 도구 | 입력 | 해야 하는 일 |
|---|---|---|
| `create_tasklist` | `title` | 새 할일 목록을 만든다 |
| `list_tasklists` | 없음 | 내 할일 목록들을 조회한다 |
| `add_task` | `tasklist_id` (필수)<br>`title` (필수)<br>`notes` (선택)<br>`due` (선택)<br>`parent_task_id` (선택) | 지정한 목록에 할일을 추가한다.<br>`parent_task_id` 를 주면 **그 할일의 하위 할일로** 만들어야 한다 |
| `list_tasks` | `tasklist_id` (필수)<br>`due_min` `due_max` `show_completed` (선택) | 목록 안의 할일들을 조회한다. 선택 인자로 걸러낼 수 있어야 한다 |

**만들고 → 확인**하는 짝이 두 번 반복되는 구성입니다.

---

## 3. 지켜야 할 제약

- **도구 이름은 위 표에 적힌 그대로** 씁니다. 제작 스킬은 `google_tasks_add_task` 처럼 서비스 접두어를 권하지만, 이번 실습에서는 표의 이름을 씁니다.
- **도구 이름은 25자 이내.** 클라이언트가 `mcp__서버이름__` 접두어를 붙여서 64자 제한에 걸립니다.
- **Tools 만 씁니다.** Resources 와 Prompts 는 제품마다 지원이 갈리므로 이번엔 쓰지 않습니다.
- **전송 방식은 `stdio`** (내 컴퓨터에서 직접 실행). 원격 배포는 하지 않습니다. 내 계정 토큰이 들어간 서버를 남이 접근할 수 있는 곳에 올리면 안 되기 때문입니다.
- **토큰을 소스코드에 직접 쓰지 않습니다.** 커밋되지 않는 파일에 두세요.

**어떻게 구현할지는 알려주지 않습니다.** 도구 경계를 어떻게 나눌지, 설명을 어떻게 쓸지, 인자를 어떻게 받을지는 API 문서를 읽고 에이전트와 함께 정하세요.

> 💡 **어떤 언어로 만들지도 정해두지 않았습니다.** 내 컴퓨터에 이미 있는 런타임을 쓰면 됩니다.
> ```
> 내 환경에 어떤 런타임이 설치돼 있는지 확인하고, 그걸로 MCP 서버를 만들어줘.
> ```

---

## 4. 어떻게 만드나 — `skills/mcp-builder`

이 저장소의 **`skills/mcp-builder/`** 에 Anthropic 이 공개한 **MCP 제작 스킬**이 들어 있습니다. (Apache 2.0)

```
skills/mcp-builder/
├── SKILL.md                          MCP 서버 개발 절차
├── reference/
│   ├── mcp_best_practices.md         도구 설계 원칙
│   ├── node_mcp_server.md            Node/TypeScript 로 만들 때
│   ├── python_mcp_server.md          Python 으로 만들 때
│   └── evaluation.md                 만든 서버를 평가하는 법
└── scripts/                          평가 스크립트
```

### 자기 제품 경로로 복사

```bash
# Claude Code 를 쓴다면
mkdir -p .claude/skills && cp -r skills/mcp-builder .claude/skills/

# Codex 나 Gemini CLI 를 쓴다면
mkdir -p .agents/skills && cp -r skills/mcp-builder .agents/skills/
```

복사한 뒤 **에이전트를 재시작**하고 이렇게 요청합니다.

```
mcp-builder 스킬을 사용해서 Google Tasks MCP 서버를 만들어줘.
요구사항과 API 문서 링크는 README.md 에 있어.
```

> 💡 스킬이 인식되지 않으면 `skills/mcp-builder/SKILL.md` 내용을 에이전트에게 직접 붙여넣어도 됩니다.

---

## 5. Google Tasks API 문서

**에이전트에게 이 링크들을 함께 전달하세요.** 문서를 읽고 구현하게 하는 것이 이 실습의 방식입니다.

| 문서 | 주소 |
|---|---|
| **API 개요** | <https://developers.google.com/workspace/tasks> |
| **전체 레퍼런스** | <https://developers.google.com/workspace/tasks/reference/rest> |
| Task 리소스 (필드 정의) | <https://developers.google.com/workspace/tasks/reference/rest/v1/tasks> |
| **tasks.insert** (할일 추가) | <https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/insert> |
| tasks.list (할일 조회) | <https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/list> |
| tasklists.list (목록 조회) | <https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists/list> |
| 사용 한도 | <https://developers.google.com/workspace/tasks/limits> |

호출 기본형은 이렇습니다.

```
https://tasks.googleapis.com/tasks/v1/...
Authorization: Bearer <액세스 토큰>
```

> 💡 **문서를 꼼꼼히 읽으세요.** 필드마다 `Output only` 표기가 있는지, 값을 본문에 넣는지 주소 뒤에 붙이는지가 갈립니다. 이걸 놓치면 **오류 없이 200 이 떨어지는데 결과만 다르게** 나옵니다.

---

## 6. 토큰 받기

Google Cloud 프로젝트를 만들 필요 없습니다.

1. <https://developers.google.com/oauthplayground> 접속
2. 왼쪽 목록에서 **Google Tasks API v1** 펼치기
3. `https://www.googleapis.com/auth/tasks` 체크
4. **Authorize APIs** → 구글 로그인 → 허용
5. **Exchange authorization code for tokens** 클릭
6. **Access token** 복사

> ⚠️ **유효기간 1시간.** 만료되면 4~6번을 다시 합니다.
> ⚠️ **토큰이 든 파일은 커밋되면 안 됩니다.** 공개 저장소에 올라가면 남이 내 계정을 조작할 수 있습니다.

---

## 7. 에이전트에 연결하기

이것도 에이전트에게 시키세요.

```
만든 MCP 서버를 내 에이전트에 stdio 로 연결해줘.
어느 폴더에서 열든 쓸 수 있게 전역 설정으로 등록해줘.
```

> ⚠️ **"전역으로" 를 꼭 붙이세요.** Claude Code 는 기본이 "이 폴더에서만" 이라, 빼먹으면 다른 폴더에서 새 창을 열었을 때 도구가 안 보입니다 (`claude mcp add --scope user ...`). Codex 와 Gemini CLI 는 설정 파일이 원래 전역입니다.
>
> 등록한 뒤에는 **에이전트를 재시작**해야 도구 목록에 반영됩니다.

직접 하고 싶으면 각 제품 공식문서를 보세요.

| 제품 | 문서 |
|---|---|
| Claude Code | <https://code.claude.com/docs/en/mcp> |
| Codex | <https://developers.openai.com/codex/mcp> |
| Gemini CLI | <https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html> |

### 연결됐는지 확인

**새 세션**을 열고 `/mcp` 를 입력합니다. 세 제품 모두 같은 명령입니다.

```
Claude Code   /mcp
Codex         /mcp        (자세히: /mcp verbose)
Gemini CLI    /mcp        (또는 /mcp list)
```

내가 만든 서버와 **도구 4개**가 보이면 연결된 것입니다.

> 🔑 **확인은 반드시 새 세션에서 하세요.** 만들던 세션은 에이전트가 자기가 쓴 코드를 기억하고 있어서, 도구 설명이 부실해도 알아서 보완합니다. 새 세션은 **도구 이름·설명·입력 스키마만 보이는 상태**라 그게 진짜 조건입니다.

---

## 8. 결과물과 제출

### 저장소에 남길 것 — 두 가지

```
my-google-task-mcp/          ← 각자 fork 한 저장소
├── src/                     ① MCP 서버 코드 (언어·구조는 자유)
└── screenshot.png           ② 할일 앱에 실제로 생긴 화면 캡처
```

### 올리기

```bash
# 1) 저장소 페이지 우상단 Fork 클릭
# 2) 자기 fork 를 clone
git clone https://github.com/<내-아이디>/my-google-task-mcp.git

# 3) 작업 후
git add .
git commit -m "Google Tasks MCP 실습"
git push
```

**이 주소가 곧 제출입니다.** 따로 링크를 내거나 폼을 작성할 필요가 없습니다.

```
https://github.com/<내-아이디>/my-google-task-mcp
```

### 완료 조건

- [ ] 새 세션의 `/mcp` 에 도구 **4개**가 보인다
- [ ] 자연어로 말했을 때 에이전트가 **스스로 도구를 골라** 호출한다
- [ ] 만든 할일이 내 구글 할일 앱에 **실제로 보인다**
- [ ] 코드와 캡처 **두 장**을 push 했다

> ⚠️ **토큰이 든 파일이 커밋되지 않았는지 확인하세요.**
> ⚠️ **실습이 끝나도 저장소를 지우지 마세요.** 확인이 끝날 때까지 두어야 합니다.

---

## 9. 실습이 끝나면 — 정리하기

### ① 토큰 폐기

OAuth Playground 는 액세스 토큰(1시간)과 함께 **리프레시 토큰(7일)** 도 발급합니다. 그냥 두면 7일간 내 계정을 조작할 수 있는 열쇠가 남습니다.

```
https://myaccount.google.com/permissions
  → Google OAuth2 Playground 찾기
  → 액세스 권한 삭제
```

### ② MCP 등록 걷기

전역으로 등록했으므로 그냥 두면 앞으로 여는 모든 세션에 따라다닙니다.

```bash
claude mcp remove google-tasks --scope user
```

Codex 나 Gemini CLI 를 썼다면 설정 파일에서 해당 항목을 지우면 됩니다.

> 계속 써보고 싶다면 남겨두어도 됩니다. 다만 **토큰을 새로 발급받아야** 다시 동작합니다.

---

## 요약

1. **토큰 받고** (OAuth Playground, 2~3분)
2. **Fork 하고 clone**
3. **`skills/mcp-builder` 를 내 에이전트 경로로 복사**
4. **이 문서 + API 링크를 에이전트에게 주고** 도구 4개를 만들게 한다
5. **전역 설정으로 연결**하고 에이전트를 재시작한다
6. **새 세션에서 `/mcp` 로 확인**하고 자연어로 시켜본다
7. **push 하고** 토큰과 등록을 정리한다

막히면 에이전트에게 물어보세요. 그게 이 실습의 방식입니다.
