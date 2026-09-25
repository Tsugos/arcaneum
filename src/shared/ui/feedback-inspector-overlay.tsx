import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Target, 
  Send, 
  CheckCircle2, 
  FileText, 
  Bug, 
  Palette, 
  Sparkles, 
  Trash2, 
  HelpCircle,
  Code
} from 'lucide-react';
import { Button } from './button';

export interface FeedbackItem {
  id: string;
  timestamp: string;
  category: string;
  componentName: string;
  filePath: string;
  selector: string;
  tagName: string;
  textSnippet: string;
  comment: string;
  expected?: string;
  contextInfo?: string;
}

export interface TargetInfo {
  selector: string;
  tagName: string;
  textSnippet: string;
  componentName: string;
  filePath: string;
  contextInfo: string;
  rect?: { top: number; left: number; width: number; height: number };
}

function detectComponentAndFile(target: HTMLElement): { componentName: string; filePath: string } {
  let curr: HTMLElement | null = target;
  while (curr) {
    if (curr.getAttribute('data-component')) {
      return {
        componentName: curr.getAttribute('data-component') || 'UnknownComponent',
        filePath: curr.getAttribute('data-file') || '',
      };
    }
    const id = (curr.id || '').toLowerCase();
    const cls = typeof curr.className === 'string' ? curr.className.toLowerCase() : '';
    
    if (id.includes('chat-menu') || cls.includes('chat-menu')) {
      return { componentName: 'ChatMenuModal', filePath: 'src/features/chat/components/chat-menu-modal.tsx' };
    }
    if (id.includes('chat') || cls.includes('chat-view')) {
      return { componentName: 'ChatView', filePath: 'src/features/chat/chat-view.tsx' };
    }
    if (id.includes('chub-detail') || cls.includes('chub-detail')) {
      return { componentName: 'ChubCharacterDetailView', filePath: 'src/features/hub/chub-character-detail-view.tsx' };
    }
    if (id.includes('hub') || cls.includes('hub-view')) {
      return { componentName: 'HubView', filePath: 'src/features/hub/hub-view.tsx' };
    }
    if (id.includes('provider') || cls.includes('provider')) {
      return { componentName: 'ProviderSelector', filePath: 'src/features/models/provider-selector.tsx' };
    }
    if (id.includes('lorebook') || cls.includes('lorebook')) {
      return { componentName: 'LorebookManager', filePath: 'src/features/lorebook/lorebook-manager.tsx' };
    }
    if (id.includes('persona') || cls.includes('persona')) {
      return { componentName: 'PersonaCatalog', filePath: 'src/features/character-editor/persona-catalog.tsx' };
    }
    if (id.includes('user-persona') || cls.includes('user-persona')) {
      return { componentName: 'UserPersonasView', filePath: 'src/features/character-editor/user-personas-view.tsx' };
    }
    if (id.includes('settings') || cls.includes('settings')) {
      return { componentName: 'SettingsView', filePath: 'src/features/settings/settings-view.tsx' };
    }

    curr = curr.parentElement;
  }
  return { componentName: 'Вьюпорт страницы', filePath: '' };
}

function extractElementContext(target: HTMLElement): string {
  const parts: string[] = [];
  if (target instanceof HTMLInputElement) {
    if (target.type === 'checkbox' || target.type === 'radio') {
      parts.push(`checked=${target.checked}`);
    } else {
      parts.push(`value="${target.value}"`);
    }
  } else if (target instanceof HTMLSelectElement) {
    parts.push(`selected="${target.value}"`);
  } else if (target instanceof HTMLImageElement) {
    parts.push(`src="${target.src.slice(0, 40)}..."`);
  } else if (target instanceof HTMLAnchorElement) {
    parts.push(`href="${target.href}"`);
  }
  if (target.getAttribute('disabled') !== null) {
    parts.push('disabled=true');
  }
  if (target.children.length > 0) {
    parts.push(`childrenCount=${target.children.length}`);
  }
  return parts.join(', ') || 'Обычный элемент интерфейса';
}

export const FeedbackInspectorOverlay: React.FC = () => {
  const [active, setActive] = useState(false);
  const [targetInfo, setTargetInfo] = useState<TargetInfo | null>(null);
  const [category, setCategory] = useState<'🐛 Баг' | '🎨 Стили' | '⚡ Фича' | '❌ Удалить'>('🐛 Баг');
  const [commentText, setCommentText] = useState('');
  const [expectedText, setExpectedText] = useState('');
  const [savedFeedbacks, setSavedFeedbacks] = useState<FeedbackItem[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('arcaneum_feedback_items');
      if (stored) {
        setSavedFeedbacks(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Trigger on Ctrl + Right Click
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();

        const target = e.target as HTMLElement;
        if (!target) return;

        const tagName = target.tagName.toLowerCase();
        const id = target.id ? `#${target.id}` : '';
        const classes = target.className && typeof target.className === 'string'
          ? `.${target.className.trim().split(/\s+/).slice(0, 3).join('.')}`
          : '';
        const textSnippet = (target.textContent || '').trim().slice(0, 70);
        const selector = `${tagName}${id}${classes}`;

        const { componentName, filePath } = detectComponentAndFile(target);
        const contextInfo = extractElementContext(target);
        const rectObj = target.getBoundingClientRect();

        setTargetInfo({
          selector,
          tagName,
          textSnippet: textSnippet ? `"${textSnippet}"` : 'Без текста',
          componentName,
          filePath,
          contextInfo,
          rect: {
            top: rectObj.top,
            left: rectObj.left,
            width: rectObj.width,
            height: rectObj.height,
          },
        });
        setActive(true);
      }
    };

    window.addEventListener('contextmenu', handleContextMenu, true);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, []);

  const handleSendFeedbackToAgent = async () => {
    if (!commentText.trim() || !targetInfo) return;
    setSending(true);

    const newItem: FeedbackItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('ru-RU'),
      category,
      componentName: targetInfo.componentName,
      filePath: targetInfo.filePath,
      selector: targetInfo.selector,
      tagName: targetInfo.tagName,
      textSnippet: targetInfo.textSnippet,
      comment: commentText.trim(),
      expected: expectedText.trim() || undefined,
      contextInfo: targetInfo.contextInfo,
    };

    const updated = [newItem, ...savedFeedbacks];
    setSavedFeedbacks(updated);
    localStorage.setItem('arcaneum_feedback_items', JSON.stringify(updated));

    // Send to local dev server endpoint which appends to user_feedback_notes.md on disk
    try {
      await fetch('/api/save-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          componentName: targetInfo.componentName,
          filePath: targetInfo.filePath,
          selector: targetInfo.selector,
          textSnippet: targetInfo.textSnippet,
          comment: commentText.trim(),
          expected: expectedText.trim() || undefined,
          contextInfo: targetInfo.contextInfo,
        }),
      });
    } catch {
      // Fallback
    } finally {
      setSending(false);
      setCommentText('');
      setExpectedText('');
      setActive(false);
    }
  };

  if (!active || !targetInfo) return null;

  return (
    <>
      {/* Target Element Highlight Box */}
      {targetInfo.rect && (
        <div
          style={{
            top: targetInfo.rect.top,
            left: targetInfo.rect.left,
            width: targetInfo.rect.width,
            height: targetInfo.rect.height,
          }}
          className="fixed z-50 pointer-events-none border-2 border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.6)] rounded-lg transition-all animate-pulse"
        />
      )}

      {/* Modal Inspector Form Overlay */}
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-arcane-900 border border-purple-500/40 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-arcane-800 pb-3">
            <div className="flex items-center gap-2 text-arcane-accent-glow font-bold text-sm">
              <Target className="w-5 h-5 text-arcane-accent animate-spin" style={{ animationDuration: '4s' }} />
              <span>Умный Инспектор (Точное задание для ИИ)</span>
            </div>
            <button
              onClick={() => setActive(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-arcane-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Target Element Metadata Header */}
          <div className="p-3.5 bg-arcane-950 rounded-2xl border border-arcane-800 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between items-center text-slate-400">
              <span className="flex items-center gap-1">
                <Code className="w-3.5 h-3.5 text-purple-400" /> Компонент / Файл:
              </span>
              <span className="text-cyan-300 font-bold">
                {targetInfo.componentName} {targetInfo.filePath ? `(${targetInfo.filePath.split('/').pop()})` : ''}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Селектор элемента:</span>
              <span className="text-purple-400 font-bold">{targetInfo.selector}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Текст / Контекст:</span>
              <span className="text-slate-200 truncate max-w-[260px]">{targetInfo.textSnippet}</span>
            </div>
          </div>

          {/* Category Picker Pills */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              Категория задачи:
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setCategory('🐛 Баг')}
                className={`flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                  category === '🐛 Баг'
                    ? 'bg-rose-950 border-rose-500 text-rose-300 shadow-md'
                    : 'bg-arcane-950 border-arcane-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bug className="w-3.5 h-3.5 text-rose-400" />
                <span>Баг</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('🎨 Стили')}
                className={`flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                  category === '🎨 Стили'
                    ? 'bg-purple-950 border-purple-500 text-purple-200 shadow-md'
                    : 'bg-arcane-950 border-arcane-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-purple-400" />
                <span>Стили</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('⚡ Фича')}
                className={`flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                  category === '⚡ Фича'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-200 shadow-md'
                    : 'bg-arcane-950 border-arcane-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Фича</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('❌ Удалить')}
                className={`flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                  category === '❌ Удалить'
                    ? 'bg-amber-950 border-amber-500 text-amber-300 shadow-md'
                    : 'bg-arcane-950 border-arcane-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Удалить</span>
              </button>
            </div>
          </div>

          {/* Comment Textarea (Что происходит сейчас) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
              <span>Что происходит сейчас (Проблема / Описание):</span>
            </label>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Опишите проблему (например: 'При выборе фильтра список моделей не обновляется')..."
              className="w-full h-20 p-3 bg-arcane-950 border border-arcane-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-arcane-accent font-sans leading-relaxed resize-none"
              autoFocus
            />
          </div>

          {/* Expected Textarea (Как должно работать) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Как должно быть (Ожидаемый результат):</span>
            </label>
            <input
              type="text"
              value={expectedText}
              onChange={(e) => setExpectedText(e.target.value)}
              placeholder="Опишите ожидания (например: 'В списке выпадающих моделей остаются только RU+')..."
              className="w-full p-2.5 bg-arcane-950 border border-arcane-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
            />
          </div>

          {/* Saved Items Counter Badge */}
          {savedFeedbacks.length > 0 && (
            <div className="p-2.5 bg-arcane-950/80 rounded-xl border border-arcane-800 text-[11px] font-mono text-purple-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                Всего закреплено в файле проекта: {savedFeedbacks.length} замечаний
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Файл: user_feedback_notes.md
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setActive(false)}>
                Отмена
              </Button>
              <Button
                size="sm"
                disabled={sending || !commentText.trim()}
                icon={<Send className="w-4 h-4" />}
                onClick={handleSendFeedbackToAgent}
                className="bg-arcane-accent hover:bg-arcane-accent/80 font-bold text-xs shadow-lg shadow-arcane-accent/30"
              >
                Закрепить замечание для ИИ
              </Button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
