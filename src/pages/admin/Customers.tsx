import { useEffect, useState } from 'react';
import { adminService } from '../../services/admin';
import { X, Plus, Edit2, Trash2, Users } from 'lucide-react';

interface Customer {
    id: string;
    full_name: string;
    phone: string;
    address: string;
}

export default function Customers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        loadCustomers();
    }, []);

    async function loadCustomers() {
        try {
            const data = await adminService.getCustomers();
            setCustomers(data);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setEditingCustomer(null);
        setFormData({ full_name: '', phone: '', address: '' });
        setIsModalOpen(true);
    }

    function openEditModal(customer: Customer) {
        setEditingCustomer(customer);
        setFormData({
            full_name: customer.full_name,
            phone: customer.phone || '',
            address: customer.address || ''
        });
        setIsModalOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingCustomer) {
                await adminService.updateCustomer(editingCustomer.id, formData);
                alert('Cliente atualizado!');
            } else {
                await adminService.createCustomer(formData);
                alert('Cliente cadastrado!');
            }
            setIsModalOpen(false);
            loadCustomers();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar.');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Excluir este cliente?')) return;
        try {
            await adminService.deleteCustomer(id);
            loadCustomers();
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir.');
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Clientes</h1>
                    <p className="text-muted-foreground mt-1">Gerencie sua base de clientes</p>
                </div>
                <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
                    <Plus size={18} />
                    Novo Cliente
                </button>
            </div>

            {/* Stats */}
            <div className="card bg-gradient-to-br from-primary/20 to-transparent border-primary/30 inline-block">
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-3xl font-bold text-primary">{customers.length}</p>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : customers.length === 0 ? (
                <div className="card text-center py-16 border-dashed">
                    <Users size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum cliente cadastrado.</p>
                    <button onClick={openCreateModal} className="btn btn-primary mt-4">Cadastrar Primeiro Cliente</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customers.map((customer) => (
                        <div key={customer.id} className="card hover:border-primary/50 transition-all">
                            <h3 className="font-bold text-lg text-white">{customer.full_name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{customer.phone || 'Sem telefone'}</p>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{customer.address || 'Sem endereço'}</p>

                            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                                <button
                                    onClick={() => openEditModal(customer)}
                                    className="flex-1 btn btn-secondary flex items-center justify-center gap-2 text-sm"
                                >
                                    <Edit2 size={14} />
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(customer.id)}
                                    className="btn btn-secondary text-red-400 hover:bg-red-500/20 px-3"
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
                                {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Nome Completo</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    required
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Telefone</label>
                                <input
                                    type="tel"
                                    className="input w-full"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Endereço</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <button type="submit" className="btn btn-primary w-full py-3 mt-4">
                                {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
