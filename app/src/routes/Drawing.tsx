import { useState } from "react";
import {
  ArrowUp,
  Wand2,
  Settings,
  Sparkles,
  Plus,
  Image as ImageIcon,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";

type Mode = "generate" | "edit";

function Drawing() {
  const [mode, setMode] = useState<Mode>("generate");

  return (
    <div className="flex h-full min-h-0 w-full bg-background text-foreground font-sans overflow-hidden">
      {/* Left Sidebar - Configuration */}
      <aside className="w-72 min-h-0 bg-card border-r border-border flex flex-col z-10 shrink-0">
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2.5 text-primary">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wand2 className="w-4 h-4" />
            </div>
            <span className="font-semibold text-foreground text-lg tracking-tight">图片</span>
          </div>
        </div>

        {/* Config Content */}
        <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
          {/* Provider Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">模型提供商</label>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary">
                <Settings className="w-3.5 h-3.5 mr-1" />
                管理
              </Button>
            </div>
            <Select defaultValue="openai">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI (DALL-E 3)</SelectItem>
                <SelectItem value="midjourney">Midjourney</SelectItem>
                <SelectItem value="sd">Stable Diffusion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Empty State / Notice */}
          <div className="mt-8 flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mb-5 border border-border">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-2">暂无可用模型</h3>
            <p className="text-muted-foreground text-xs leading-relaxed mb-6 px-2">
              请先新增模型并设置端点类型为图像生成以开始创作。
            </p>
            <Button className="w-full">
              <Settings className="w-4 h-4 mr-2" />
              去设置
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background overflow-hidden">
        {/* Subtle grid background for the entire main area */}
        <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--muted-foreground))_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.05]"></div>

        {/* Top Controls - Floating */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          <div className="relative grid grid-cols-2 items-center rounded-full border border-border/80 bg-background/90 p-1.5 shadow-sm backdrop-blur-xl">
            <div
              className={`pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-full bg-foreground shadow-sm transition-transform duration-300 ease-out ${
                mode === "edit" ? "translate-x-full" : "translate-x-0"
              }`}
            />
            <button
              onClick={() => setMode("generate")}
              className={`relative z-10 min-w-[72px] px-7 py-2.5 rounded-full text-sm font-medium transition-colors duration-300 ${
                mode === "generate"
                  ? "text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={mode === "generate"}
            >
              绘图
            </button>
            <button
              onClick={() => setMode("edit")}
              className={`relative z-10 min-w-[72px] px-7 py-2.5 rounded-full text-sm font-medium transition-colors duration-300 ${
                mode === "edit"
                  ? "text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={mode === "edit"}
            >
              编辑
            </button>
          </div>
        </div>

        {/* Canvas (No square box) */}
        <div className="flex-1 flex flex-col items-center justify-center pb-32 relative z-10">
          <div className="flex flex-col items-center justify-center gap-5">
            <div className="w-20 h-20 bg-muted/30 rounded-[2rem] flex items-center justify-center border border-border/50 shadow-sm backdrop-blur-md">
              <Sparkles className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-foreground/80 font-medium tracking-wide text-base">开始你的创作</span>
              <span className="text-muted-foreground/60 text-sm">在下方输入描述，AI 将为你生成精美图片</span>
            </div>
          </div>
        </div>

        {/* Input Area - Floating Bottom */}
        <div className="absolute bottom-8 left-0 right-0 px-8 flex justify-center z-20 pointer-events-none">
          <InputGroup className="pointer-events-auto w-full max-w-3xl overflow-hidden rounded-[24px] border border-border/80 bg-background shadow-lg transition-all duration-300 has-[[data-slot=input-group-control]:focus-visible]:border-primary/40 has-[[data-slot=input-group-control]:focus-visible]:shadow-xl">
            <InputGroupTextarea
              className="min-h-[84px] px-5 pt-4 pb-3 text-[15px] leading-6 placeholder:text-muted-foreground/75"
              placeholder="Ask, Search or Chat..."
            />
            <InputGroupAddon
              align="block-end"
              className="justify-between border-t border-border/60 bg-muted/15 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <InputGroupButton
                  size="icon-sm"
                  className="rounded-full border border-border/80 bg-background text-muted-foreground hover:bg-muted"
                  aria-label="Add"
                >
                  <Plus />
                </InputGroupButton>
                <InputGroupText className="text-sm font-medium text-foreground/80">
                  Auto
                </InputGroupText>
              </div>
              <div className="flex items-center gap-3">
                <InputGroupText className="text-sm font-medium text-muted-foreground">
                  52% used
                </InputGroupText>
                <InputGroupButton
                  size="icon-sm"
                  className="rounded-full bg-foreground text-background hover:bg-foreground/90"
                  aria-label="Send"
                >
                  <ArrowUp />
                </InputGroupButton>
              </div>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </main>

      {/* Right Sidebar - History */}
      <aside className="w-24 min-h-0 bg-card border-l border-border flex flex-col z-10 shrink-0">
        <div className="h-16 flex items-center justify-center border-b border-border">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 items-center no-scrollbar">
          <div className="text-xs font-medium text-muted-foreground mb-2 flex flex-col items-center gap-1">
            <History className="w-4 h-4" />
            历史
          </div>
          {/* Empty slot */}
          <button className="w-14 h-14 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all">
            <Plus className="w-5 h-5" />
          </button>
          {/* Active slot dummy */}
          <div className="w-14 h-14 border-2 border-primary rounded-xl bg-muted shadow-sm relative cursor-pointer overflow-hidden group">
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
          </div>
          {/* History slots */}
          <div className="w-14 h-14 border border-border rounded-xl bg-muted cursor-pointer hover:border-primary/50 transition-colors overflow-hidden opacity-60 hover:opacity-100"></div>
          <div className="w-14 h-14 border border-border rounded-xl bg-muted cursor-pointer hover:border-primary/50 transition-colors overflow-hidden opacity-60 hover:opacity-100"></div>
        </div>
      </aside>
    </div>
  );
}

export default Drawing;
