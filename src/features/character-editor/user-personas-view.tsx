import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  X, 
  Star
} from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import type { UserPersona } from '@/domain/entities';
import { globalUserPersonaService } from '@/services/persona/user-persona-service';

export const UserPersonasView: React.FC = () => {
  const [userPersonas, setUserPersonas] = useState<UserPersona[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState<UserPersona | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formAvatarUrl, setFormAvatarUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);

  const loadUserPersonas = async () => {
    const list = await globalUserPersonaService.getAllUserPersonas();
    setUserPersonas(list);
  };

  useEffect(() => {
    loadUserPersonas();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormAvatarUrl('');
    setFormDescription('');
    setFormIsDefault(false);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (up: UserPersona) => {
    setEditingPersona(up);
    setFormName(up.name);
    setFormAvatarUrl(up.avatarUrl || '');
    setFormDescription(up.description);
    setFormIsDefault(!!up.isDefault);
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    await globalUserPersonaService.createUserPersona(
      formName,
      formDescription,
      formAvatarUrl,
      formIsDefault
    );
    resetForm();
    setShowCreateModal(false);
    loadUserPersonas();
  };

  const handleSaveEdit = async () => {
    if (!editingPersona || !formName.trim()) return;
    await globalUserPersonaService.updateUserPersona(editingPersona.id, {
      name: formName,
      avatarUrl: formAvatarUrl,
      description: formDescription,
      isDefault: formIsDefault,
    });
    setEditingPersona(null);
    resetForm();
    loadUserPersonas();
  };

  const handleDelete = async (id: string) => {
    await globalUserPersonaService.deleteUserPersona(id);
    setDeletingId(null);
    loadUserPersonas();
  };

  const handleSetDefault = async (id: string) => {
    await globalUserPersonaService.setDefaultUserPersona(id);
    loadUserPersonas();
  };

  const handleUnsetDefault = async (id: string) => {
    await globalUserPersonaService.unsetDefaultUserPersona(id);
    loadUserPersonas();
  };

  const filteredPersonas = userPersonas.filter(
    (up) =>
      up.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      up.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-arcane-accent-glow" />
            Мои Персоны (Профили Игрока)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Управление личными идентичностями игрока. ИИ считывает выбранную персону как часть постоянной памяти сеанса.
          </p>
        </div>

        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
          Создать Персону Игрока
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="Поиск по имени или биографии персоны Игрока..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-arcane-900 border border-arcane-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-arcane-accent"
        />
      </div>

      {/* User Personas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPersonas.map((up) => (
          <Card key={up.id} className="p-4 flex flex-col justify-between hover:border-arcane-700 transition-all bg-arcane-900/80 border-arcane-800">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {up.avatarUrl ? (
                    <img src={up.avatarUrl} alt={up.name} className="w-10 h-10 rounded-lg object-cover border border-arcane-700" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-arcane-accent to-purple-600 flex items-center justify-center font-bold text-white shadow-md">
                      {up.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-sm text-slate-100">{up.name}</h3>
                      {up.isDefault && (
                        <span title="Основная персона для новых сессий">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase">
                      PLAYER IDENTITY
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(up)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-arcane-800 rounded transition-colors"
                    title="Редактировать"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingId(up.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-mono bg-arcane-950/60 p-2.5 rounded border border-arcane-800/40">
                {up.description || 'Описание не заполнено.'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-arcane-800/60 flex items-center justify-between">
              {up.isDefault ? (
                <button
                  onClick={() => handleUnsetDefault(up.id)}
                  className="text-[10px] text-amber-400 hover:text-amber-200 font-mono font-medium flex items-center gap-1 transition-colors"
                  title="Снять статус основной персоны"
                >
                  <Star className="w-3 h-3 fill-amber-400" /> Основная Персона
                </button>
              ) : (
                <button
                  onClick={() => handleSetDefault(up.id)}
                  className="text-[10px] text-slate-400 hover:text-arcane-accent-glow font-mono transition-colors"
                >
                  Сделать основной
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {userPersonas.length === 0 && (
        <Card className="p-8 text-center text-slate-400 text-xs space-y-3">
          <UserCheck className="w-8 h-8 text-slate-500 mx-auto" />
          <p>Персоны игрока пока не созданы. В чатах вы будете отображаться как User.</p>
          <Button size="sm" onClick={openCreateModal}>Создать персону</Button>
        </Card>
      )}

      {/* Create / Edit Modal */}
      {(showCreateModal || editingPersona) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 bg-arcane-900 border-arcane-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-arcane-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-arcane-accent-glow" />
                {editingPersona ? `Редактирование Персоны: ${editingPersona.name}` : 'Создание Персоны Игрока'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPersona(null);
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Ваше имя / псевдоним *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Имя, по которому ИИ будет обращаться к вам..."
                  className="w-full bg-arcane-950 border border-arcane-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-arcane-accent"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Аватар Персоны (Загрузка файла или URL)</label>
                <div className="flex gap-2 items-center">
                  {formAvatarUrl && (
                    <img src={formAvatarUrl} alt="Preview" className="w-9 h-9 rounded-lg object-cover border border-arcane-700 shrink-0" />
                  )}
                  <input
                    type="text"
                    value={formAvatarUrl}
                    onChange={(e) => setFormAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.png или загрузите файл..."
                    className="flex-1 bg-arcane-950 border border-arcane-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-arcane-accent"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-arcane-800 hover:bg-arcane-700 border border-arcane-700 rounded-lg text-xs text-slate-200 font-medium shrink-0">
                    Загрузить
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (ev.target?.result) {
                            setFormAvatarUrl(ev.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Описание вашего персонажа *</label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Опишите себя: внешность, характер, роль, привычки. ИИ будет помнить эту информацию при каждом запросе!"
                  className="w-full bg-arcane-950 border border-arcane-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-arcane-accent"
                />
              </div>

              <label className="flex items-center gap-2 text-slate-400 select-none cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="accent-arcane-accent rounded"
                />
                <span>Установить как основную Персону для всех новых диалогов</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-arcane-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPersona(null);
                }}
              >
                Отмена
              </Button>
              <Button size="sm" onClick={editingPersona ? handleSaveEdit : handleCreate}>
                {editingPersona ? 'Сохранить изменения' : 'Сохранить Персону'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 bg-arcane-900 border-red-500/30 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Удалить Персону Игрока?</h3>
            <p className="text-xs text-slate-400">
              Это действие нельзя отменить. Ваша персона будет полностью удалена.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeletingId(null)}>
                Отмена
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(deletingId)}>
                Удалить
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
