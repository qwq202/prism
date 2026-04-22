# 多渠道模型个性化记忆功能实现文档

> 目标：为现有聊天项目增加一套“长期个性化记忆”能力，并且兼容多模型 / 多渠道 / 多 Provider。本文档不是产品介绍，而是**面向实现**的详细工程说明。你可以把它直接交给另一个 AI 编码模型，让它按本文档完成开发。

---

## 1. 功能目标

实现一套类似 RikkaHub 风格的轻量个性化记忆系统，满足以下要求：

1. 模型可以在对话过程中**主动创建、编辑、删除记忆**。
2. 记忆可以按助手、角色、Bot、会话主体隔离，也支持全局记忆。
3. 在每轮生成前，把记忆以**结构化格式**注入到 system prompt 中。
4. 兼容多种模型渠道：OpenAI 风格、Anthropic 风格、Gemini 风格、以及其他兼容 OpenAI 的中转 API。
5. 当某个模型 / 渠道不支持工具调用时，系统仍能退化为“**只读记忆**”模式。
6. 整套方案应当轻量，不强依赖向量数据库，不要求 embedding。
7. 系统需要有明确的安全边界：不随便保存敏感信息，不暴露记忆内容给用户，除非用户明确询问。

---

## 2. 设计原则

### 2.1 核心思路

本方案分成两部分：

- **记忆读取**：每轮请求前，从数据库取出记忆，拼接进 system prompt。
- **记忆写入**：把 `memory_tool` 作为工具提供给模型，允许模型主动调用 `create / edit / delete`。

也就是说：

- 读记忆：依赖 prompt 注入。
- 写记忆：依赖 tool call。

这样做的优点：

- 实现简单。
- 兼容性高。
- 可控性强。
- 不需要复杂检索系统。
- 对中小规模记忆非常有效。

### 2.2 不采用的方案

本版本**不要求**实现以下能力：

- 向量检索
- embedding 召回
- 语义相似度聚类
- 自动时间衰减
- 复杂记忆图谱
- 长文档记忆压缩系统

这些能力可以作为后续增强项，但不属于本期必做。

---

## 3. 总体架构

```text
用户消息
   ↓
消息编排层 Orchestrator
   ↓
读取 MemoryRepository
   ↓
构建 System Prompt（包含 Memories + 可选 Recent Chats）
   ↓
构建统一 Tool 列表（memory_tool + 其他工具）
   ↓
Provider Adapter（按当前模型渠道转换为各家格式）
   ↓
模型响应
   ↓
统一解析 Tool Call
   ↓
执行 memory_tool（create/edit/delete）
   ↓
写回数据库
   ↓
将 tool result 回填给模型
   ↓
模型继续生成最终回复
```

推荐拆成以下模块：

1. `MemoryEntity / MemoryRepository`
2. `MemoryPromptBuilder`
3. `MemoryToolDefinition`
4. `MemoryToolExecutor`
5. `ProviderAdapter` 抽象层
6. `ToolCallParser`
7. `ConversationOrchestrator / GenerationHandler`
8. `RecentChatsProvider`（可选）

---

## 4. 数据库设计

## 4.1 最小表结构

建议建立 `memories` 表。

### SQL 示例

```sql
CREATE TABLE memories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    scope_type VARCHAR(32) NOT NULL,
    scope_id VARCHAR(128) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);
```

### 字段说明

- `id`：记忆唯一 ID。
- `scope_type`：作用域类型。建议值：
  - `global`
  - `assistant`
  - `user`
  - `workspace`
  - `bot`
- `scope_id`：作用域 ID。比如 assistantId、botId、workspaceId。
- `content`：记忆内容，纯文本。
- `created_at`：创建时间。
- `updated_at`：修改时间。
- `is_deleted`：软删除标记。

### 为什么要有 `scope_type + scope_id`

不要只存一个 `assistant_id`，因为你的项目未来可能有：

- 全局记忆
- 每个 Bot 单独记忆
- 每个用户单独记忆
- 每个团队 / 工作区单独记忆

通用的 scope 设计更稳。

---

## 4.2 推荐增强字段

如果你希望后续更容易扩展，可以一开始就预留这些字段：

```sql
ALTER TABLE memories ADD COLUMN source VARCHAR(32) NULL;
ALTER TABLE memories ADD COLUMN confidence FLOAT NULL;
ALTER TABLE memories ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE memories ADD COLUMN last_used_at DATETIME NULL;
ALTER TABLE memories ADD COLUMN category VARCHAR(64) NULL;
```

说明：

- `source`：记录来源，例如 `tool:auto`、`manual`、`migration`。
- `confidence`：未来可用于记忆质量评分。
- `pinned`：重要记忆不允许被模型轻易删除。
- `last_used_at`：便于后续做排序、清理、衰减。
- `category`：偏好、身份、项目、习惯、限制条件等。

本期没有也能做，但建议预留。

---

## 5. 领域模型设计

### 5.1 MemoryRecord

```ts
export interface MemoryRecord {
  id: string;
  scopeType: 'global' | 'assistant' | 'user' | 'workspace' | 'bot';
  scopeId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  source?: string;
  confidence?: number;
  pinned?: boolean;
  lastUsedAt?: string | null;
  category?: string | null;
}
```

### 5.2 MemoryScope

```ts
export interface MemoryScope {
  scopeType: 'global' | 'assistant' | 'user' | 'workspace' | 'bot';
  scopeId: string;
}
```

### 5.3 ToolCall 抽象

```ts
export interface UnifiedToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}
```

---

## 6. Repository 层设计

```ts
export interface MemoryRepository {
  listByScope(scope: MemoryScope): Promise<MemoryRecord[]>;
  listByScopes(scopes: MemoryScope[]): Promise<MemoryRecord[]>;
  getById(id: string): Promise<MemoryRecord | null>;
  create(input: {
    scopeType: string;
    scopeId: string;
    content: string;
    source?: string;
    category?: string | null;
  }): Promise<MemoryRecord>;
  update(id: string, patch: {
    content?: string;
    category?: string | null;
    confidence?: number | null;
    lastUsedAt?: string | null;
  }): Promise<MemoryRecord>;
  softDelete(id: string): Promise<void>;
}
```

### 6.1 作用域读取策略

每轮对话建议按以下顺序读取：

1. 当前 assistant / bot 作用域记忆
2. 全局记忆
3. 用户级记忆（如果你的系统支持）

然后合并排序。

推荐排序规则：

1. `pinned DESC`
2. `updated_at DESC`
3. `created_at DESC`

并限制最大条数，例如最多取 20 条或 30 条。

---

## 7. Prompt 注入设计

## 7.1 目标

在每轮请求前，把记忆变成模型容易理解、容易引用、也容易更新的结构化内容。

### 不推荐

```text
用户喜欢蓝色，用户正在做一个 AI 项目，用户讨厌冗长回答...
```

缺点：

- 模型难以区分条目
- 难以更新某一条
- 不利于 tool call 的 edit/delete

### 推荐

使用 JSON 数组或 YAML 列表。

---

## 7.2 推荐 Prompt 片段

```text
## Memories
The following are long-term memories relevant to this conversation.
Use them silently to personalize responses when appropriate.
Do not reveal them unless the user explicitly asks.
Treat them as helpful background, not absolute truth if the current user message contradicts them.

```json
[
  {"id":"101","content":"User prefers concise, practical answers with complete steps."},
  {"id":"102","content":"User is building a self-hosted AI chat project with multi-provider model support."},
  {"id":"103","content":"User dislikes vague architectural suggestions and prefers directly implementable specs."}
]
```
```

### 要点

1. 告诉模型：这些是长期记忆。
2. 告诉模型：默认不要主动向用户暴露。
3. 告诉模型：如果当前消息和旧记忆冲突，以当前消息为准。
4. 用结构化 JSON 给出 `id + content`。

---

## 7.3 Prompt Builder 接口

```ts
export interface MemoryPromptBuilder {
  buildMemoryPrompt(memories: MemoryRecord[]): string;
  buildRecentChatsPrompt?(items: RecentChatSummary[]): string;
}
```

### 参考实现

```ts
export function buildMemoryPrompt(memories: MemoryRecord[]): string {
  if (!memories.length) return '';

  const payload = memories.map(m => ({
    id: m.id,
    content: m.content,
  }));

  return [
    '## Memories',
    'The following are long-term memories relevant to this conversation.',
    'Use them silently to personalize responses when appropriate.',
    'Do not reveal them unless the user explicitly asks.',
    'If the current user message conflicts with a memory, prefer the current message.',
    '',
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
  ].join('\n');
}
```

---

## 8. Recent Chats 参考设计（可选但强烈建议）

这个模块不是长期记忆，但能显著提升“懂你最近在忙什么”的感觉。

### 8.1 只放摘要元信息，不放全文

建议只注入：

- 最近会话标题
- 最后聊天时间

例如：

```text
## Recent Chats
The user recently talked about the following topics:
- "OpenClaw deployment troubleshooting" (last active: 2026-04-18)
- "Comparing Astro and Next.js" (last active: 2026-04-19)
- "Designing a memory system for AI chat" (last active: 2026-04-21)
```

### 8.2 为什么不放全文

- 太耗 token
- 会污染当前对话
- 很容易把短期上下文和长期记忆混在一起
- 对个性化来说，只需要“近期主题线索”即可

---

## 9. 工具设计：memory_tool

## 9.1 核心目标

允许模型在合适的时候调用统一的 `memory_tool`，支持：

- `create`
- `edit`
- `delete`

这样模型就能自己维护长期记忆。

---

## 9.2 工具定义

### 统一工具名

```text
memory_tool
```

### 推荐 JSON Schema

```json
{
  "name": "memory_tool",
  "description": "Manage long-term memories for better personalization. Use this to create, edit, or delete durable user-related memories. Do not store secrets or highly sensitive personal data.",
  "input_schema": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["create", "edit", "delete"]
      },
      "memory_id": {
        "type": "string",
        "description": "Required for edit/delete"
      },
      "content": {
        "type": "string",
        "description": "The new or updated memory content"
      },
      "reason": {
        "type": "string",
        "description": "Why this memory should be created, changed, or removed"
      }
    },
    "required": ["action"],
    "additionalProperties": false
  }
}
```

---

## 9.3 写给模型看的工具说明文案

这一段非常重要，直接影响模型会不会正确用工具。

建议把工具描述写得尽量明确：

```text
Use this tool to manage durable long-term memories about the user or project.

Create a memory when:
- the user shares a stable preference, habit, constraint, identity-related project context, or recurring need
- the information is likely to matter in future conversations

Edit a memory when:
- a new message updates or refines an existing memory
- two memories are redundant and should be merged into one clearer memory

Delete a memory when:
- it is outdated, contradicted by the user, or no longer useful

Do not store:
- passwords, API keys, tokens, secrets
- highly sensitive personal data unless the product explicitly permits it
- one-off facts that are unlikely to matter again

Default behavior:
- do not mention stored memories to the user unless explicitly asked
- prefer updating an existing similar memory over creating duplicates
- keep each memory concise, factual, and reusable
```

---

## 10. 工具执行器设计

## 10.1 Executor 接口

```ts
export interface ToolExecutor {
  execute(call: UnifiedToolCall, context: ToolExecutionContext): Promise<ToolExecutionResult>;
}
```

### 上下文

```ts
export interface ToolExecutionContext {
  memoryScope: MemoryScope;
  currentMemories: MemoryRecord[];
  userId?: string;
  assistantId?: string;
  conversationId?: string;
}
```

### 返回值

```ts
export interface ToolExecutionResult {
  ok: boolean;
  content: string;
  data?: Record<string, any>;
}
```

---

## 10.2 memory_tool 执行逻辑

```ts
export class MemoryToolExecutor implements ToolExecutor {
  constructor(private repo: MemoryRepository) {}

  async execute(call: UnifiedToolCall, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { action, memory_id, content, reason } = call.arguments || {};

    if (call.name !== 'memory_tool') {
      return { ok: false, content: 'Unsupported tool name' };
    }

    switch (action) {
      case 'create': {
        if (!content || typeof content !== 'string') {
          return { ok: false, content: 'Missing content for create' };
        }
        const created = await this.repo.create({
          scopeType: context.memoryScope.scopeType,
          scopeId: context.memoryScope.scopeId,
          content,
          source: 'tool:auto',
        });
        return {
          ok: true,
          content: `Memory created with id=${created.id}`,
          data: { id: created.id, content: created.content, reason },
        };
      }

      case 'edit': {
        if (!memory_id || !content) {
          return { ok: false, content: 'Missing memory_id or content for edit' };
        }
        const existing = await this.repo.getById(memory_id);
        if (!existing || existing.isDeleted) {
          return { ok: false, content: `Memory ${memory_id} not found` };
        }
        const updated = await this.repo.update(memory_id, { content });
        return {
          ok: true,
          content: `Memory ${memory_id} updated`,
          data: { id: updated.id, content: updated.content, reason },
        };
      }

      case 'delete': {
        if (!memory_id) {
          return { ok: false, content: 'Missing memory_id for delete' };
        }
        await this.repo.softDelete(memory_id);
        return {
          ok: true,
          content: `Memory ${memory_id} deleted`,
          data: { id: memory_id, reason },
        };
      }

      default:
        return { ok: false, content: `Unsupported action: ${action}` };
    }
  }
}
```

---

## 10.3 去重与合并策略

为了防止模型疯狂 create 重复记忆，执行前建议加一道轻量规则：

### 简单字符串相似策略

若新内容与现有某条记忆满足以下任一条件：

- 完全相同
- 一方包含另一方
- 归一化后编辑距离很小

则：

- 不新建
- 返回提示模型应优先 edit 旧记录

### 更好的做法

在执行 `create` 前跑一个 `findMostSimilarMemory(content)`，如果找到高相似度记忆，自动改为 `edit` 或返回失败并说明。

#### 伪代码

```ts
function normalizeMemoryText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}
```

本期即使只做“完全一致去重”也比没有强。

---

## 11. 多渠道工具调用适配设计

这是整套系统最关键的工程点之一。

### 11.1 核心原则

**业务层不直接依赖某一家 Provider 的工具格式。**

必须先定义统一抽象，再由不同 Provider Adapter 去转换。

### 11.2 统一抽象

```ts
export interface UnifiedToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}
```

```ts
export interface UnifiedToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}
```

```ts
export interface UnifiedToolResult {
  toolCallId: string;
  name: string;
  content: string;
  isError?: boolean;
}
```

---

## 11.3 ProviderAdapter 接口

```ts
export interface ProviderAdapter {
  buildRequest(params: {
    model: string;
    systemPrompt: string;
    messages: UnifiedMessage[];
    tools?: UnifiedToolDefinition[];
  }): Promise<any>;

  parseResponse(raw: any): Promise<ParsedModelResponse>;

  buildToolResultMessage(result: UnifiedToolResult): UnifiedMessage;

  supportsTools(model: string): boolean;
}
```

### ParsedModelResponse

```ts
export interface ParsedModelResponse {
  textParts: string[];
  toolCalls: UnifiedToolCall[];
  stopReason?: string;
  raw?: any;
}
```

---

## 11.4 OpenAI 风格适配

### 请求转换

```ts
function toOpenAITools(tools: UnifiedToolDefinition[]) {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }
  }));
}
```

### 响应解析

解析：

- `tool_calls`
- `function.name`
- `function.arguments`

注意：arguments 可能是 JSON 字符串，需要安全解析。

---

## 11.5 Anthropic 风格适配

Anthropic 通常是 `tool_use` / `tool_result` 结构，而不是 OpenAI 的 `function calling`。

### 请求转换

```ts
function toAnthropicTools(tools: UnifiedToolDefinition[]) {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
}
```

### 响应解析

从 content blocks 中提取：

- `type === 'tool_use'`
- `name`
- `input`
- `id`

---

## 11.6 Gemini / 其他风格适配

根据你的 SDK 或 HTTP API 实现，但必须在 Adapter 层做以下统一：

- 把工具定义转成它能接受的格式
- 把返回的 tool call 转成 `UnifiedToolCall`
- 把工具结果再封装回模型需要的消息格式

### 工程要求

不要在 orchestrator 里写这种代码：

```ts
if (provider === 'openai') { ... }
if (provider === 'anthropic') { ... }
if (provider === 'gemini') { ... }
```

这些判断应该封装在 Adapter 内部。

---

## 11.7 不支持工具调用时的回退

如果当前模型或当前渠道不支持 tools：

- 仍然注入 memories 到 system prompt
- 不提供 `memory_tool`
- 模型只能读取记忆，不能主动改写

### 实现逻辑

```ts
const tools = adapter.supportsTools(model)
  ? buildUnifiedTools(context)
  : [];
```

或者：

```ts
const enableWritableMemory = settings.enableMemory && adapter.supportsTools(model);
```

这是必须实现的，否则会在不兼容渠道直接报错。

---

## 12. 对话编排器设计

## 12.1 主流程

```ts
async function generateReply(ctx: GenerationContext): Promise<GenerationOutput> {
  const adapter = providerRegistry.get(ctx.provider);

  const scopes = buildMemoryScopes(ctx);
  const memories = ctx.settings.enableMemory
    ? await memoryRepository.listByScopes(scopes)
    : [];

  const memoryPrompt = ctx.settings.enableMemory
    ? buildMemoryPrompt(memories)
    : '';

  const recentChatsPrompt = ctx.settings.enableRecentChats
    ? await buildRecentChatsPromptFromDB(ctx)
    : '';

  const mergedSystemPrompt = mergeSystemPrompts([
    ctx.baseSystemPrompt,
    memoryPrompt,
    recentChatsPrompt,
  ]);

  const tools = (ctx.settings.enableMemory && adapter.supportsTools(ctx.model))
    ? [buildMemoryToolDefinition()]
    : [];

  let response = await adapter.generate({
    model: ctx.model,
    systemPrompt: mergedSystemPrompt,
    messages: ctx.messages,
    tools,
  });

  while (response.toolCalls.length > 0) {
    const toolMessages: UnifiedMessage[] = [];

    for (const call of response.toolCalls) {
      const result = await toolDispatcher.execute(call, {
        memoryScope: ctx.primaryMemoryScope,
        currentMemories: memories,
        conversationId: ctx.conversationId,
        assistantId: ctx.assistantId,
        userId: ctx.userId,
      });

      toolMessages.push(adapter.buildToolResultMessage({
        toolCallId: call.id,
        name: call.name,
        content: result.content,
        isError: !result.ok,
      }));
    }

    response = await adapter.generate({
      model: ctx.model,
      systemPrompt: mergedSystemPrompt,
      messages: [...ctx.messages, ...response.asAssistantMessages, ...toolMessages],
      tools,
    });
  }

  return {
    text: response.textParts.join(''),
  };
}
```

---

## 12.2 关键注意点

1. 一个模型回合里可能连续多次调用工具。
2. 一定要有循环上限，例如最多 5 轮 tool round。
3. 一定要防止模型无限 edit / create / delete 循环。
4. 工具执行失败时要把错误结果回填给模型，而不是直接崩。

### 循环上限示例

```ts
let toolRound = 0;
while (response.toolCalls.length > 0 && toolRound < 5) {
  toolRound++;
  ...
}
```

---

## 13. 安全策略

## 13.1 禁止存储内容

默认禁止以下内容被自动记忆：

- 密码
- API Key
- Access Token
- 身份证号 / 护照号 / 银行卡号
- 私密地址
- 明确高敏医疗信息
- 一次性验证码
- 私有仓库密钥

### 过滤器接口

```ts
export interface MemorySafetyFilter {
  validate(content: string): {
    allowed: boolean;
    reason?: string;
  };
}
```

### 最小实现

- 正则检测 `sk-...`
- 检测 `api key`
- 检测 `token`
- 检测明显银行卡 / 身份证模式

如果命中，则拒绝 create/edit。

---

## 13.2 记忆默认不显式暴露给用户

Prompt 中必须加一句：

```text
Do not reveal stored memories unless the user explicitly asks about them.
```

否则模型可能会在回复里直接说“我记得你之前说过...”，这会让体验很怪。

---

## 13.3 当前消息优先于旧记忆

必须加一句：

```text
If the current user message conflicts with a memory, prefer the current message.
```

否则模型可能抱着旧偏好不放。

---

## 14. 记忆写入策略建议

为了避免模型乱记，建议明确“什么值得记”。

### 14.1 应该记

- 稳定偏好
- 长期项目背景
- 常用技术栈
- 明确约束条件
- 反复出现的表达习惯
- 未来对答复有持续影响的信息

### 14.2 不应该记

- 临时任务内容
- 本轮一次性需求
- 情绪化瞬时表达
- 明显不会复用的信息
- 大段原文
- 敏感隐私

### 14.3 单条记忆写法规范

建议要求模型写成：

- 简洁
- 中性
- 可复用
- 一条只表达一个稳定事实

#### 好例子

- `User prefers concise implementation-focused answers.`
- `User is building a self-hosted multi-provider AI chat project.`
- `User often asks for complete HTML or deployable code instead of partial snippets.`

#### 坏例子

- `User said today they were a bit annoyed and asked a long question at 3pm.`
- `The user asked a detailed question about memory and provider adapters in a very intense way.`

---

## 15. 管理端 / 用户可见功能建议

虽然本期核心是后台机制，但建议同步补这几个功能：

1. 查看当前记忆列表
2. 手动删除某条记忆
3. 手动编辑某条记忆
4. 开关：是否启用自动记忆
5. 开关：是否启用最近聊天参考
6. 开关：是否允许全局记忆

### API 设计建议

```http
GET    /api/memories?scopeType=assistant&scopeId=xxx
POST   /api/memories
PATCH  /api/memories/:id
DELETE /api/memories/:id
```

---

## 16. 最小可用版本实现顺序

建议严格按这个顺序开发，不要一上来做太复杂。

### Phase 1：只读记忆

- 建表
- Repository
- Prompt Builder
- 每轮注入 memories
- 不做工具调用

### Phase 2：可写记忆

- 定义统一 `memory_tool`
- 接入一个 Provider 的 tool call
- 打通 create/edit/delete

### Phase 3：多 Provider 适配

- 抽象 ProviderAdapter
- 支持 OpenAI 风格
- 支持 Anthropic 风格
- 支持其他渠道

### Phase 4：增强稳定性

- 去重
- 安全过滤
- Recent Chats
- UI 管理页
- 循环保护

---

## 17. 测试清单

## 17.1 Repository 测试

- 能创建记忆
- 能查询指定 scope 记忆
- 能更新记忆
- 能软删除记忆
- 已删除记忆不会被默认查出

## 17.2 Prompt 测试

- 无记忆时不注入空 JSON 块
- 有记忆时 JSON 格式正确
- 包含 `id` 和 `content`
- 包含“不要主动暴露”“当前消息优先”等约束

## 17.3 Tool Executor 测试

- create 成功
- edit 成功
- delete 成功
- 缺少参数时返回错误
- 找不到 memory_id 时返回错误
- 敏感内容被拒绝

## 17.4 Adapter 测试

- OpenAI 请求转换正确
- OpenAI tool result 回填正确
- Anthropic 请求转换正确
- Anthropic tool use 解析正确
- 不支持 tools 的模型正确回退到只读记忆

## 17.5 E2E 测试

场景 1：
用户说“以后回答我尽量简洁点，别讲太多背景。”

期望：
- 模型调用 `memory_tool.create`
- 数据库新增一条偏好记忆
- 下一轮回答风格更简洁

场景 2：
用户说“我现在不想要简洁了，详细一点。”

期望：
- 模型调用 `memory_tool.edit`
- 旧记忆被更新
- 后续回答更详细

场景 3：
用户说“忘掉我刚才那个偏好。”

期望：
- 模型调用 `memory_tool.delete`
- 记忆被软删除

场景 4：
当前渠道不支持 tools

期望：
- 系统不报错
- 仍然注入已有记忆
- 但不会发生自动写入

---

## 18. 推荐目录结构

```text
src/
  memory/
    memory.entity.ts
    memory.repository.ts
    memory.service.ts
    memory-safety.filter.ts
    memory-prompt.builder.ts
    memory-tool.definition.ts
    memory-tool.executor.ts
  providers/
    provider-adapter.ts
    openai.adapter.ts
    anthropic.adapter.ts
    gemini.adapter.ts
  tools/
    tool-dispatcher.ts
    unified-tool.types.ts
  generation/
    generation-handler.ts
    generation.types.ts
  chats/
    recent-chats.provider.ts
```

---

## 19. 给编码模型的明确实现要求

下面这段可以直接复制给编码模型：

### 实现指令

请在现有项目中实现一套“长期个性化记忆”系统，要求如下：

1. 新增 `memories` 数据表，支持按 `scope_type + scope_id` 隔离记忆。
2. 实现 `MemoryRepository`，支持查询、新建、更新、软删除。
3. 在聊天生成前，从当前作用域加载记忆，并用 JSON 数组格式注入到 system prompt。
4. 实现统一工具 `memory_tool`，支持 `create/edit/delete`。
5. 工具调用必须经过统一抽象层，不允许业务层直接写死某个 Provider 的工具格式。
6. 新增 `ProviderAdapter` 抽象，把统一工具定义和工具调用转换到各家模型格式。
7. 如果当前模型或渠道不支持工具调用，系统必须自动退化成“只读记忆”模式。
8. 加入基本安全过滤，阻止保存 secrets / tokens / API keys / 高敏感内容。
9. 工具调用必须有错误处理、循环上限、去重保护。
10. 代码需要包含必要的单元测试和至少一组端到端测试。

### 编码限制

- 不要引入向量数据库。
- 不要依赖 embedding。
- 先做最小可用版本，再做增强。
- 不要把 Provider 差异逻辑散落在业务层。
- 所有 Provider 兼容逻辑必须收敛到 Adapter 层。

---

## 20. 后续可扩展方向

本期做完后，可继续增强：

1. 记忆分类器
2. 记忆置信度评分
3. 自动合并重复记忆
4. 基于时间和使用频率的衰减
5. embedding 检索
6. 用户审批式记忆写入
7. pinned memory
8. 项目记忆 / 人设记忆 / 用户偏好记忆分层

---

## 21. 最终结论

这套方案的本质不是复杂 RAG，而是：

- 用数据库存长期记忆
- 用结构化 prompt 读记忆
- 用统一工具让模型写记忆
- 用 Provider Adapter 消化多渠道差异

它最大的优点是：

- 成本低
- 实现清晰
- 兼容性强
- 用户感知好
- 很适合现有聊天项目直接加进去

如果你的项目当前已经有：

- 聊天消息表
- System Prompt 拼装逻辑
- 多 Provider 请求层

那么这套方案可以非常自然地接进去。

---

## 22. 最简版伪代码总览

```ts
const memories = await memoryRepo.listByScopes(scopes);
const memoryPrompt = buildMemoryPrompt(memories);
const systemPrompt = merge(baseSystemPrompt, memoryPrompt, recentChatsPrompt);

const adapter = providerRegistry.get(provider);
const tools = adapter.supportsTools(model)
  ? [buildMemoryToolDefinition()]
  : [];

let response = await adapter.generate({
  model,
  systemPrompt,
  messages,
  tools,
});

let rounds = 0;
while (response.toolCalls.length > 0 && rounds < 5) {
  rounds++;

  const toolResults = [];
  for (const call of response.toolCalls) {
    const result = await toolDispatcher.execute(call, {
      memoryScope,
      currentMemories: memories,
    });
    toolResults.push(adapter.buildToolResultMessage({
      toolCallId: call.id,
      name: call.name,
      content: result.content,
      isError: !result.ok,
    }));
  }

  response = await adapter.generate({
    model,
    systemPrompt,
    messages: [...messages, ...toolResults],
    tools,
  });
}

return response.finalText;
```

---

以上文档为完整实现规范。若要开始编码，请优先完成：数据库、Repository、Prompt Builder、Unified Tool、Provider Adapter、GenerationHandler 六大模块。

