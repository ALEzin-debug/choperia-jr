import { useEffect, useState } from 'react';
import { adminService } from '../../services/admin';
import { X, Plus, RotateCcw } from 'lucide-react';

interface Asset {
    id: string;
    code: string;
    model: string;
    status: string;
}

interface Customer {
    id: string;
    full_name: string;
}

export default function Rentals() {
    const [rentals, setRentals] = useState<any[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRental, setNewRental] = useState({
        asset_id: '',
        customer_id: '',
        expected_return_date: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [rentalsData, assetsData, customersData] = await Promise.all([
                adminService.getRentals(),
                adminService.getAssets(),
                adminService.getCustomers()
            ]);
            setRentals(rentalsData);
            setAssets(assetsData);
            setCustomers(customersData);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            await adminService.createRental(newRental);
            setIsModalOpen(false);
            setNewRental({ asset_id: '', customer_id: '', expected_return_date: '' });
            loadData();
            alert('Locação criada!');
        } catch (error) {
            console.error(error);
            alert('Erro ao criar locação.');
        }
    }

    async function handleReturn(rentalId: string, assetId: string) {
        if (!confirm('Confirmar devolução deste equipamento?')) return;
        try {
            await adminService.returnRental(rentalId, assetId);
            loadData();
            alert('Devolução registrada!');
        } catch (error) {
            console.error(error);
            alert('Erro ao registrar devolução.');
        }
    }

    const availableAssets = assets.filter(a => a.status === 'available');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Locações de Chopeiras</h1>
                    <p className="text-muted-foreground mt-1">Gerencie aluguéis e devoluções</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={18} />
                    Nova Locação
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card bg-gradient-to-br from-primary/20 to-transparent border-primary/30">
                    <p className="text-sm text-muted-foreground">Equipamentos Disponíveis</p>
                    <p className="text-3xl font-bold text-primary">{availableAssets.length}</p>
                </div>
                <div className="card bg-gradient-to-br from-accent/20 to-transparent border-accent/30">
                    <p className="text-sm text-muted-foreground">Locações Ativas</p>
                    <p className="text-3xl font-bold text-accent">{rentals.filter(r => r.status === 'active').length}</p>
                </div>
                <div className="card bg-gradient-to-br from-red-500/20 to-transparent border-red-500/30">
                    <p className="text-sm text-muted-foreground">Atrasados</p>
                    <p className="text-3xl font-bold text-red-400">
                        {rentals.filter(r => r.status === 'active' && new Date(r.expected_return_date) < new Date()).length}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50">
                        <tr className="border-b border-border">
                            <th className="py-3 px-4">Cliente</th>
                            <th className="py-3 px-4">Equipamento</th>
                            <th className="py-3 px-4">Data Locação</th>
                            <th className="py-3 px-4">Devolução Prevista</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="p-4 text-center">Carregando...</td></tr>
                        ) : rentals.length === 0 ? (
                            <tr><td colSpan={6} className="p-4 text-center">Nenhuma locação registrada.</td></tr>
                        ) : (
                            rentals.map((rental) => {
                                const isLate = rental.status === 'active' && new Date(rental.expected_return_date) < new Date();
                                return (
                                    <tr key={rental.id} className="border-b border-border/50">
                                        <td className="py-3 px-4 font-medium text-white">{rental.customer?.full_name || 'N/A'}</td>
                                        <td className="py-3 px-4">{rental.asset?.code || 'N/A'} - {rental.asset?.model}</td>
                                        <td className="py-3 px-4 text-muted-foreground">
                                            {new Date(rental.rented_at).toLocaleDateString()}
                                        </td>
                                        <td className={`py-3 px-4 ${isLate ? 'text-red-400 font-bold' : ''}`}>
                                            {new Date(rental.expected_return_date).toLocaleDateString()}
                                            {isLate && ' (ATRASADO)'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${rental.status === 'active'
                                                    ? 'bg-accent/20 text-accent'
                                                    : 'bg-muted text-muted-foreground'
                                                }`}>
                                                {rental.status === 'active' ? 'Ativo' : 'Devolvido'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            {rental.status === 'active' && (
                                                <button
                                                    onClick={() => handleReturn(rental.id, rental.asset_id)}
                                                    className="btn btn-secondary text-sm flex items-center gap-1"
                                                >
                                                    <RotateCcw size={14} />
                                                    Devolver
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-card border border-border p-6 rounded-lg w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Nova Locação</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Cliente</label>
                                <select
                                    className="input w-full bg-background"
                                    required
                                    value={newRental.customer_id}
                                    onChange={e => setNewRental({ ...newRental, customer_id: e.target.value })}
                                >
                                    <option value="">Selecione um cliente...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Equipamento</label>
                                <select
                                    className="input w-full bg-background"
                                    required
                                    value={newRental.asset_id}
                                    onChange={e => setNewRental({ ...newRental, asset_id: e.target.value })}
                                >
                                    <option value="">Selecione um equipamento...</option>
                                    {availableAssets.map(a => (
                                        <option key={a.id} value={a.id}>{a.code} - {a.model}</option>
                                    ))}
                                </select>
                                {availableAssets.length === 0 && (
                                    <p className="text-xs text-red-400 mt-1">Nenhum equipamento disponível</p>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Data de Devolução</label>
                                <input
                                    type="date"
                                    className="input w-full bg-background"
                                    required
                                    value={newRental.expected_return_date}
                                    onChange={e => setNewRental({ ...newRental, expected_return_date: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary w-full py-3 mt-4"
                                disabled={availableAssets.length === 0}
                            >
                                Criar Locação
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
