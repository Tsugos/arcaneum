import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Key, Trash2, X, Link as LinkIcon, CheckSquare, Square } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import type { Lorebook, Persona } from '@/domain/entities';
import { globalLorebookService } from '@/services/lorebook/lorebook-service';
import { globalPersonaService } from '@/services/persona/persona-service';

export const LorebookManager: React.FC = () => {
  const [lorebooks, setLorebooks] = useState<Lorebook[]>([]);
  const [selectedLb, setSelectedLb] = useState<Lorebook | null>(null);
  const [allPersonas, setAllPersonas] = useState<Persona[]>([]);

  // Modal States
  const [showCreateLbModal, setShowCreateLbModal] = useState(false);
  const [newLbName, setNewLbName] = useState('');
  const [newLbDesc, setNewLbDesc] = useState('');

  // Entry Form State (New)
  const [newKeys, setNewKeys] = useState('');
  const [newContent, setNewContent] = useState('');

  const loadData = async () => {
    let list = await globalLorebookService.getAllLorebooks();
    const generatedDemoBooks = list.filter((book) =>
      book.name === 'Вселенная Arcaneum' &&
      book.description === 'Энциклопедия знаковых локаций и объектов сервера' &&
      book.entries.length === 1 &&
      book.entries[0]?.content === 'Arcaneum — древнее автономное святилище знаний и искусственных разумов.'
    );
    if (generatedDemoBooks.length > 0) {
      await Promise.all(generatedDemoBooks.map((book) => globalLorebookService.deleteLorebook(book.id)));
      list = list.filter((book) => !generatedDemoBooks.some((demo) => demo.id === book.id));
    }
    const personas = await globalPersonaService.getAllPersonas();
    setAllPersonas(personas);

    if (list.length === 0) {
      setLorebooks([]);
      setSelectedLb(null);
    } else {
      setLorebooks(list);
      if (selectedLb) {
        const found = list.find((l) => l.id === selectedLb.id);
        setSelectedLb(found || list[0] || null);
      } else if (list.length > 0) {
        setSelectedLb(list[0]!);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateLorebook = async () => {
    if (!newLbName.trim()) return;
    const created = await globalLorebookService.createLorebook(newLbName, newLbDesc);
    setNewLbName('');
    setNewLbDesc('');
    setShowCreateLbModal(false);
    await loadData();
    setSelectedLb(created);
  };

  const handleDeleteLorebook = async (id: string) => {
    await globalLorebookService.deleteLorebook(id);
    if (selectedLb?.id === id) {
      setSelectedLb(null);
    }
    await loadData();
  };

  const handleAddEntry = async () => {
    if (!selectedLb || !newKeys.trim() || !newContent.trim()) return;

    const keysArray = newKeys.split(',').map((k) => k.trim()).filter(Boolean);
    await globalLorebookService.addEntry(selectedLb.id, {
      keys: keysArray,
      content: newContent,
      enabled: true,
      priority: 10,
      insertionOrder: selectedLb.entries.length + 1,
    });

    setNewKeys('');
    setNewContent('');
    loadData();
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!selectedLb) return;
    await globalLorebookService.deleteEntry(selectedLb.id, entryId);
    loadData();
  };

  const handleTogglePersonaLink = async (persona: Persona) => {
    if (!selectedLb) return;
    const currentIds = persona.lorebookIds || [];
    const isLinked = currentIds.includes(selectedLb.id);

    const updatedIds = isLinked
      ? currentIds.filter((id) => id !== selectedLb.id)
      : [...currentIds, selectedLb.id];

    await globalPersonaService.updatePersona(persona.id, { lorebookIds: updatedIds });
    loadData();
  };

  return (
    <div className="p-6 w-full space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-arcane-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2.5 tracking-tight">
            <BookOpen className="w-6 h-6 text-cyan-400" />
            Студия Лорбуков & Энциклопедия Знаний Мира
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Управление глобальными лорбуками, ключевыми словами и привязкой энциклопедий к персонажам ролевого чата
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateLbModal(true)}>
          + Новый Лорбук
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Lorebooks List (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 space-y-4 bg-arcane-900/90 border-arcane-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Все Лорбуки ({lorebooks.length})</h3>
            </div>

            <div className="space-y-2">
              {lorebooks.map((lb) => {
                const isSelected = selectedLb?.id === lb.id;
                const linkedCount = allPersonas.filter((p) => (p.lorebookIds || []).includes(lb.id)).length;
                return (
                  <div
                    key={lb.id}
                    className={`group p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow-md shadow-cyan-950/60'
                        : 'border-arcane-800 hover:border-arcane-700 bg-arcane-950/60 text-slate-300'
                    }`}
                    onClick={() => setSelectedLb(lb)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-100 truncate">{lb.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono flex items-center gap-2">
                        <span>Записей: {lb.entries.length}</span>
                        <span>•</span>
                        <span className="text-purple-400">Персонажей: {linkedCount}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLorebook(lb.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity ml-2"
                      title="Удалить лорбук"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Selected Lorebook Entries & Character Binding (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedLb ? (
            <Card className="p-6 bg-arcane-900 border-arcane-800 space-y-6">
              
              {/* Lorebook Header Info */}
              <div className="flex items-center justify-between border-b border-arcane-800 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-100 text-lg">{selectedLb.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedLb.description || 'Описание отсутствует'}</p>
                </div>
                <span className="text-xs font-mono bg-arcane-950 px-3 py-1.5 rounded-xl border border-arcane-800 text-cyan-400 font-bold">
                  {selectedLb.entries.length} Записей
                </span>
              </div>

              {/* CHARACTER BINDING PANEL WITH STYLED CHECKBOXES (User Note 64 & 72) */}
              <div className="p-4 bg-arcane-950 rounded-2xl border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-purple-400" />
                    <span>Привязка Лорбука к Персонажам (Чекбоксы):</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Отметьте галочками нужных персонажей</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {allPersonas.map((p) => {
                    const isLinked = (p.lorebookIds || []).includes(selectedLb.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleTogglePersonaLink(p)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 border text-left ${
                          isLinked
                            ? 'bg-purple-950/80 border-purple-500 text-white shadow-md shadow-purple-950/50'
                            : 'bg-arcane-900 border-arcane-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isLinked ? (
                          <CheckSquare className="w-4 h-4 text-purple-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span className="truncate flex-1">{p.data.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form to Add Entry */}
              <div className="p-4 bg-arcane-950 rounded-2xl border border-arcane-800 space-y-3 text-xs">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-sm">
                  <Plus className="w-4 h-4 text-cyan-400" /> Добавить новую запись в Лорбук
                </h4>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={newKeys}
                    onChange={(e) => setNewKeys(e.target.value)}
                    placeholder="Ключевые слова-триггеры через запятую (например: дракон, таверна, империя)..."
                    className="w-full bg-arcane-900 border border-arcane-800 rounded-xl p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                  <textarea
                    rows={3}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Содержание энциклопедической записи, активируемое при упоминании ключей..."
                    className="w-full bg-arcane-900 border border-arcane-800 rounded-xl p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans text-xs resize-none"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    disabled={!newKeys.trim() || !newContent.trim()}
                    onClick={handleAddEntry}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Добавить запись
                  </Button>
                </div>
              </div>

              {/* Entry List */}
              <div className="space-y-3 pt-2">
                {selectedLb.entries.map((entry, idx) => (
                  <div key={entry.id} className="p-4 bg-arcane-950 border border-arcane-800 rounded-2xl space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-300">
                      <div className="flex items-center gap-2 font-bold text-cyan-400">
                        <Key className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Запись #{idx + 1}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Удалить запись"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <span className="text-slate-500">Триггеры:</span>
                      {entry.keys.map((k, kIdx) => (
                        <span key={kIdx} className="px-2 py-0.5 bg-arcane-900 border border-arcane-800 text-cyan-300 rounded font-mono text-[10px]">
                          {k}
                        </span>
                      ))}
                    </div>

                    <div className="p-3 bg-arcane-900/60 rounded-xl text-slate-200 leading-relaxed font-sans whitespace-pre-wrap border border-arcane-800/40">
                      {entry.content}
                    </div>
                  </div>
                ))}
              </div>

            </Card>
          ) : (
            <Card className="p-8 text-center text-slate-400 text-xs bg-arcane-900 border-arcane-800">
              Выберите или создайте лорбук слева.
            </Card>
          )}
        </div>

      </div>

      {/* Modal: Create Lorebook */}
      {showCreateLbModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 bg-arcane-900 border-arcane-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-arcane-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100">Создание нового Лорбука</h3>
              <button onClick={() => setShowCreateLbModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Название Лорбука *</label>
                <input
                  type="text"
                  value={newLbName}
                  onChange={(e) => setNewLbName(e.target.value)}
                  placeholder="например: Империя Эльфов"
                  className="w-full bg-arcane-950 border border-arcane-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Описание (необязательно)</label>
                <textarea
                  rows={3}
                  value={newLbDesc}
                  onChange={(e) => setNewLbDesc(e.target.value)}
                  placeholder="О чем этот лорбук..."
                  className="w-full bg-arcane-950 border border-arcane-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setShowCreateLbModal(false)}>
                Отмена
              </Button>
              <Button size="sm" disabled={!newLbName.trim()} onClick={handleCreateLorebook}>
                Создать
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
