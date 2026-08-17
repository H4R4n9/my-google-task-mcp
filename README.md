# Google Tasks MCP 만들기

에이전트 엔지니어링 Part 4 실습.

> **이 문서를 그대로 에이전트에게 전달하고 작업을 시키세요.**
> 코드를 손으로 짜는 실습이 아닙니다. 에이전트에게 맡기고, **나온 결과가 진짜 맞는지 확인하는 것**이 목표입니다.

---

## 1. 무엇을 만드나

**내 구글 할일(Google Tasks)을 조작하는 MCP 서버.**

완성하면 이런 일이 됩니다.

```
나: "다음 주 발표 준비 할일 만들어줘. 자료조사·슬라이드·리허설로 나눠서"
     ↓
에이전트가 내가 만든 도구를 스스로 골라 호출
     ↓
내 스마트폰 할일 앱에 진짜로 3개가 들어와 있다
```

준비된 가짜 데이터를 읽는 실습이 아닙니다. **내 구글 계정의 실제 데이터가 바뀝니다.**

---

## 2. 준비물

| 항목 | 확인 |
|---|---|
| 구글 계정 | 평소 쓰는 것. 새로 만들지 않습니다 |
| GitHub 계정 | 결과물을 fork 하고 push 할 때 씁니다 |
| OAuth 액세스 토큰 | 아래 절차로 **지금** 발급합니다 |

> 💡 **어떤 언어로 만들지는 정해두지 않았습니다.** MCP SDK 는 TypeScript·Python 등 여러 언어로 나와 있으니 **내 컴퓨터에 이미 있는 걸 쓰면 됩니다.** 런타임 설치나 버전 문제로 시간을 쓰지 않도록, 에이전트에게 이렇게 먼저 물어보세요.
>
> ```
> 내 환경에 어떤 런타임이 설치돼 있는지 확인하고, 그걸로 MCP 서버를 만들어줘.
> ```

### 토큰 발급 (2~3분)

Google Cloud 프로젝트를 만들 필요 없습니다.

1. <https://developers.google.com/oauthplayground> 접속
2. 왼쪽 목록에서 **Google Tasks API v1** 을 펼칩니다
3. `https://www.googleapis.com/auth/tasks` 를 체크
4. **Authorize APIs** → 구글 로그인 → 허용
5. **Exchange authorization code for tokens** 클릭
6. 화면에 뜨는 **Access token** 을 복사

> ⚠️ **유효기간 1시간.** 만료되면 4~6번을 다시 합니다.
> ⚠️ **토큰을 소스코드에 직접 쓰지 마세요.** `.env` 같은 파일에 두고, 그 파일이 커밋되지 않게 하세요. 공개 저장소에 올라가면 남이 내 계정을 조작할 수 있습니다.

---

## 3. 만들 도구 — 네 개 모두

| 도구 | 입력 | 해야 하는 일 |
|---|---|---|
| `list_tasklists` | 없음 | 내 할일 목록들을 조회한다 |
| `create_tasklist` | `title` | 새 할일 목록을 만든다 |
| `add_task` | `tasklist_id` (필수)<br>`title` (필수)<br>`notes` (선택)<br>`due` (선택)<br>`parent_task_id` (선택) | 지정한 목록에 할일을 추가한다.<br>`parent_task_id` 를 주면 **그 할일의 하위 할일로** 만들어야 한다 |
| `list_tasks` | `tasklist_id` (필수)<br>`due_min` `due_max` `show_completed` (선택) | 목록 안의 할일들을 조회한다. 선택 인자로 걸러낼 수 있어야 한다 |

### 지켜야 할 제약

- **도구 이름은 위 표에 적힌 그대로** 씁니다. 제작 스킬(`skills/mcp-builder`)은 `google_tasks_add_task` 처럼 서비스 접두어를 붙이라고 권하지만, 이번 실습에서는 표의 이름을 씁니다. 에이전트가 접두어를 붙이려 하면 표대로 고쳐달라고 하세요.
- **도구 이름은 25자 이내.** 클라이언트가 `mcp__서버이름__` 접두어를 붙여서 64자 제한에 걸립니다.
- **Tools 만 씁니다.** Resources 와 Prompts 는 제품마다 지원이 갈리므로 이번엔 쓰지 않습니다.
- **전송 방식은 `stdio`** (내 컴퓨터에서 직접 실행). 원격 배포는 하지 않습니다. 내 계정 토큰이 들어간 서버를 남이 접근할 수 있는 곳에 올리면 안 되기 때문입니다.

**어떻게 구현할지는 알려주지 않습니다.** 도구 경계를 어떻게 나눌지, 설명을 어떻게 쓸지, 인자를 어떻게 받을지는 API 문서를 읽고 에이전트와 함께 정하세요.

---

## 4. 어떻게 만드나 — `skills/mcp-builder`

이 저장소의 **`skills/mcp-builder/`** 에 Anthropic 이 공개한 **MCP 제작 스킬**이 들어 있습니다. MCP 서버를 어떻게 설계하고 만드는지에 대한 지침 묶음입니다. (Apache 2.0)

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

### 쓰는 방법 — 자기 제품 경로로 복사

에이전트가 스킬을 읽는 위치가 제품마다 다릅니다. **한 줄만 실행하면 됩니다.**

```bash
# Claude Code 를 쓴다면
mkdir -p .claude/skills && cp -r skills/mcp-builder .claude/skills/

# Codex 나 Gemini CLI 를 쓴다면
mkdir -p .agents/skills && cp -r skills/mcp-builder .agents/skills/
```

복사한 뒤 **에이전트를 재시작**하고, 이렇게 요청합니다.

```
mcp-builder 스킬을 사용해서 Google Tasks MCP 서버를 만들어줘.
요구사항은 README.md 에 있고, API 문서는 거기 링크를 참고해.
```

> 💡 스킬이 인식되지 않으면 `skills/mcp-builder/SKILL.md` 파일 내용을 에이전트에게 직접 붙여넣어도 됩니다. 스킬은 "미리 준비된 지침 묶음"일 뿐입니다.

### 다 만든 뒤 에이전트에 연결하기

이것도 에이전트에게 시키세요.

```
만든 MCP 서버를 내 에이전트에 stdio 로 연결해줘.
```

직접 하고 싶으면 각 제품 공식문서를 보세요.

| 제품 | 문서 |
|---|---|
| Claude Code | <https://code.claude.com/docs/en/mcp> |
| Codex | <https://developers.openai.com/codex/mcp> |
| Gemini CLI | <https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html> |

연결됐는지는 에이전트에게 **"너가 쓸 수 있는 도구 목록을 보여줘"** 라고 물어보면 됩니다.

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

## 6. 검증 — 내가 만든 도구로

**새로 배울 도구는 없습니다.** 방금 만든 도구 4개로 서로를 검증합니다. 만드는 도구 중에 조회 도구(`list_tasklists`, `list_tasks`)가 있으니, 그걸로 내가 만든 결과를 다시 확인하면 됩니다.

### 기본 흐름

에이전트에게 **도구를 지정해서** 시키고, **응답 원문을 그대로 보여달라고** 합니다.

```
1) 만들기
   > add_task 도구로 "발표 준비" 목록에 "자료조사" 를 추가해줘.
     응답 JSON 원문을 그대로 보여줘.

2) 다시 조회하기
   > list_tasks 로 방금 만든 걸 조회해서 응답 원문 그대로 보여줘.

3) 대조하기
   내가 보낸 값과 돌아온 값을 필드별로 하나씩 비교한다.
```

> 💡 **"응답 원문을 그대로 보여줘"** 를 꼭 붙이세요. 이 말이 없으면 에이전트가 "할일을 추가했습니다" 처럼 요약해서 알려주는데, **요약된 문장에서는 무엇이 잘못됐는지 안 보입니다.**

### 반드시 해볼 것 세 가지

| | 무엇을 | 확인할 것 |
|---|---|---|
| 1 | 정상 값으로 `add_task` | 할일이 만들어지는가 |
| 2 | 일부러 틀린 값<br>(예: 마감일에 `"내일"`) | 무엇이 왜 잘못됐는지 알 수 있는 오류가 나오는가 |
| 3 | **하위 할일을 만들고 `list_tasks` 로 조회** | 진짜 하위로 들어갔는가 ← **가장 중요** |

> 🔑 **`200` 이 왔다고 제대로 된 게 아닙니다.** Google Tasks API 는 잘못 보낸 값을 **오류 없이 무시하고 200 을 돌려주는** 경우가 있습니다. 만들었을 때의 응답만 보면 성공한 것처럼 보이고, **다시 조회해봐야** 드러납니다. 3번이 그걸 잡는 자리입니다.

> 🔑 **3번이 이 실습에서 가장 중요합니다.** `200` 이 왔다고 제대로 된 게 아닙니다. Google Tasks API 는 잘못 보낸 값을 **오류 없이 무시하고 200 을 돌려주는** 경우가 있습니다. 요청과 응답을 나란히 놓고 비교하지 않으면 못 잡습니다.

---

## 7. 어떤 결과물이 나와야 하나

### 저장소에 남길 것 — 두 가지

```
my-google-task-mcp/          ← 각자 fork 한 저장소
├── src/                     MCP 서버 코드 (언어·구조는 자유)
└── screenshot.png           할일 앱에 실제로 생긴 화면 캡처
```

폴더 구조나 파일 이름은 이것만 맞으면 나머지는 자유입니다.

### 완료 조건

- [ ] 만든 도구 **4개**가 에이전트에게 모두 보인다
- [ ] 자연어 질문에서 에이전트가 **스스로 도구를 골라** 호출한다
- [ ] 잘못된 입력에 **어느 값이 왜 잘못됐는지** 알려주는 오류가 나온다
- [ ] 만든 할일이 내 구글 계정에 **실제로 존재한다** (화면 캡처로 증명)
- [ ] **하위 할일을 만든 뒤 다시 조회해서** 진짜 하위로 들어갔는지 확인했다
- [ ] 도구와 무관한 질문("오늘 점심 뭐 먹지")에서는 도구를 호출하지 않는다
- [ ] 도구 설명을 고쳤을 때 에이전트의 선택이 달라지는 것을 관찰했다

> 🔑 **네 번째 항목이 이 실습의 핵심입니다.** 만들고 나서 "성공했다"는 응답만 보고 넘어가면 안 됩니다. **다시 조회해서 의도한 결과인지 확인**해야 합니다.

---

## 8. 제출

**Fork 하고 자기 저장소에 push 하는 것이 곧 제출입니다.** 따로 제출할 곳이 없습니다.

```bash
# 1) 이 저장소 페이지 우상단 Fork 클릭
# 2) 자기 fork 를 clone
git clone https://github.com/<내-아이디>/my-google-task-mcp.git

# 3) 작업 후
git add .
git commit -m "Google Tasks MCP 실습"
git push
```

> ⚠️ **토큰이 커밋되지 않았는지 확인하세요.** `git status` 와 커밋 내용에 토큰이 든 파일이 없어야 합니다.
> ⚠️ **실습이 끝나도 저장소를 지우지 마세요.** 확인이 끝날 때까지 두어야 합니다.

---

## 9. 실습이 끝나면 반드시 할 것

OAuth Playground 는 액세스 토큰(1시간)과 함께 **리프레시 토큰(7일)** 도 발급합니다. 그냥 두면 7일간 내 계정을 조작할 수 있는 열쇠가 남습니다.

```
https://myaccount.google.com/permissions
  → Google OAuth2 Playground 찾기
  → 액세스 권한 삭제
```

---

## 요약

1. **토큰 받고** (OAuth Playground, 2~3분)
2. **Fork 하고 clone**
3. **`skills/mcp-builder` 를 내 에이전트 경로로 복사**
4. **이 문서 + API 링크를 에이전트에게 주고** 도구 4개를 만들게 한다
5. **내 에이전트에 연결한다**
6. **만든 결과를 다시 조회해서** 의도대로 됐는지 확인한다 ← 여기가 핵심
7. **push 하고** 토큰을 폐기한다

막히면 에이전트에게 물어보세요. 그게 이 실습의 방식입니다.
