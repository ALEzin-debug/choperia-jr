import { useEffect, useState } from 'react';
import { adminService } from '../../services/admin';
import { X, Plus, Edit2, Trash2, Server } from 'lucide-react';

interface Asset {
    id: string;
    code: string;
    model: string;
    status: 'available' | 'rented' | 'maintenance';
}

export default function Assets() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        model: '',
        status: 'available' as 'available' | 'rented' | 'maintenance'
    });

    useEffect(() => {
        loadAssets();
    }, []);

    async function loadAssets() {
        try {
            const data = await adminService.getAssets();
            setAssets(data);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setEditingAsset(null);
        setFormData({ code: '', model: '', status: 'available' });
        setIsModalOpen(true);
    }

    function openEditModal(asset: Asset) {
        setEditingAsset(asset);
        setFormData({
            code: asset.code,
            model: asset.model || '',
            status: asset.status
        });
        setIsModalOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingAsset) {
                await adminService.updateAsset(editingAsset.id, formData);
                alert('Equipamento atualizado!');
            } else {
                await adminService.createAsset(formData);
                alert('Equipamento cadastrado!');
            }
            setIsModalOpen(false);
            loadAssets();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar.');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Excluir este equipamento?')) return;
        try {
            await adminService.deleteAsset(id);
            loadAssets();
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir. Verifique se não há locações ativas.');
        }
    }

    const statusColors = {
        available: 'bg-accent/20 text-accent',
        rented: 'bg-primary/20 text-primary',
        maintenance: 'bg-red-500/20 text-red-400'
    };

    const statusLabels = {
        available: 'Disponível',
        rented: 'Alugado',
        maintenance: 'Manutenção'
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Equipamentos</h1>
                    <p className="text-muted-foreground mt-1">Gerencie suas chopeiras e acessórios</p>
                </div>
                <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
                    <Plus size={18} />
                    Novo Equipamento
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card bg-gradient-to-br from-accent/20 to-transparent border-accent/30">
                    <p className="text-sm text-muted-foreground">Disponíveis</p>
                    <p className="text-3xl font-bold text-accent">{assets.filter(a => a.status === 'available').length}</p>
                </div>
                <div className="card bg-gradient-to-br from-primary/20 to-transparent border-primary/30">
                    <p className="text-sm text-muted-foreground">Alugados</p>
                    <p className="text-3xl font-bold text-primary">{assets.filter(a => a.status === 'rented').length}</p>
                </div>
                <div className="card bg-gradient-to-br from-red-500/20 to-transparent border-red-500/30">
                    <p className="text-sm text-muted-foreground">Em Manutenção</p>
                    <p className="text-3xl font-bold text-red-400">{assets.filter(a => a.status === 'maintenance').length}</p>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : assets.length === 0 ? (
                <div className="card text-center py-16 border-dashed">
                    <Server size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum equipamento cadastrado.</p>
                    <button onClick={openCreateModal} className="btn btn-primary mt-4">Cadastrar Primeiro Equipamento</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {assets.map((asset) => (
                        <div key={asset.id} className="card hover:border-primary/50 transition-all relative">
                            {/* Status Badge */}
                            <span className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold ${statusColors[asset.status]}`}>
                                {statusLabels[asset.status]}
                            </span>

                            <div className="h-16 bg-gradient-to-br from-primary/10 to-transparent rounded-lg flex items-center justify-center mb-4">
                                <Server size={28} className="text-primary/60" />
                            </div>

                            <h3 className="font-bold text-lg text-white">{asset.code}</h3>
                            <p className="text-sm text-muted-foreground">{asset.model || 'Sem modelo'}</p>

                            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                                <button
                                    onClick={() => openEditModal(asset)}
                                    className="flex-1 btn btn-secondary flex items-center justify-center gap-2 text-sm"
                                >
                                    <Edit2 size={14} />
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(asset.id)}
                                    className="btn btn-secondary text-red-400 hover:bg-red-500/20 px-3"
                                    disabled={asset.status === 'rented'}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-card border border-border p-6 rounded-lg w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">
                                {editingAsset ? 'Editar Equipamento' : 'Novo Equipamento'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Código</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    required
                                    placeholder="Ex: CHP-001"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Modelo</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Ex: Chopeira 50L Premium"
                                    value={formData.model}
                                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Status</label>
                                <select
                                    className="input w-full bg-background"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    <option value="available">Disponível</option>
                                    <option value="rented">Alugado</option>
                                    <option value="maintenance">Em Manutenção</option>
                                </select>
                            </div>

                            <button type="submit" className="btn btn-primary w-full py-3 mt-4">
                                {editingAsset ? 'Salvar Alterações' : 'Cadastrar Equipamento'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
