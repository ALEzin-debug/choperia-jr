import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { X, Plus, Edit2, Trash2, DollarSign, Fuel, Truck, Package, Users } from 'lucide-react';

interface Expense {
    id: string;
    description: string;
    category: string;
    amount: number;
    date: string;
    notes: string;
    created_at: string;
}

const categories = [
    { value: 'delivery', label: 'Entrega', icon: Truck, color: '#3b82f6' },
    { value: 'fuel', label: 'Combustível', icon: Fuel, color: '#f59e0b' },
    { value: 'supplies', label: 'Insumos', icon: Package, color: '#8b5cf6' },
    { value: 'salary', label: 'Salário', icon: Users, color: '#10b981' },
    { value: 'other', label: 'Outros', icon: DollarSign, color: '#6b7280' }
];

export default function Expenses() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [filterCategory, setFilterCategory] = useState('all');
    const [newExpense, setNewExpense] = useState({
        description: '',
        category: 'delivery',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        loadExpenses();
    }, []);

    async function loadExpenses() {
        try {
            const { data } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false });
            setExpenses(data || []);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingExpense) {
                await supabase.from('expenses').update(newExpense).eq('id', editingExpense.id);
                alert('Despesa atualizada!');
            } else {
                await supabase.from('expenses').insert(newExpense);
                alert('Despesa registrada!');
            }
            setIsModalOpen(false);
            setEditingExpense(null);
            setNewExpense({ description: '', category: 'delivery', amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });
            loadExpenses();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar.');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Excluir esta despesa?')) return;
        try {
            await supabase.from('expenses').delete().eq('id', id);
            loadExpenses();
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir.');
        }
    }

    function openEditModal(expense: Expense) {
        setEditingExpense(expense);
        setNewExpense({
            description: expense.description,
            category: expense.category,
            amount: expense.amount,
            date: expense.date,
            notes: expense.notes || ''
        });
        setIsModalOpen(true);
    }

    function openCreateModal() {
        setEditingExpense(null);
        setNewExpense({ description: '', category: 'delivery', amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });
        setIsModalOpen(true);
    }

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const filteredExpenses = filterCategory === 'all'
        ? expenses
        : expenses.filter(e => e.category === filterCategory);

    const totalByCategory = categories.reduce((acc, cat) => {
        acc[cat.value] = expenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0);
        return acc;
    }, {} as Record<string, number>);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const getCategoryInfo = (cat: string) => categories.find(c => c.value === cat) || categories[4];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Despesas</h1>
                    <p className="text-muted-foreground mt-1">Controle de gastos e custos operacionais</p>
                </div>
                <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
                    <Plus size={18} />
                    Nova Despesa
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="card col-span-2 md:col-span-1" style={{ backgroundColor: '#1f2937', borderLeft: '4px solid #ef4444' }}>
                    <p className="text-sm text-muted-foreground">Total Geral</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
                </div>
                {categories.map(cat => {
                    const IconComp = cat.icon;
                    return (
                        <div key={cat.value} className="card" style={{ backgroundColor: '#1f2937' }}>
                            <div className="flex items-center gap-2 mb-1">
                                <IconComp size={16} style={{ color: cat.color }} />
                                <p className="text-xs text-muted-foreground">{cat.label}</p>
                            </div>
                            <p className="text-lg font-bold text-white">{formatCurrency(totalByCategory[cat.value])}</p>
                        </div>
                    );
                })}
            </div>

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setFilterCategory('all')}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${filterCategory === 'all' ? 'text-white' : 'text-muted-foreground'}`}
                    style={{ backgroundColor: filterCategory === 'all' ? '#f59e0b' : '#374151' }}
                >
                    Todas
                </button>
                {categories.map(cat => (
                    <button
                        key={cat.value}
                        onClick={() => setFilterCategory(cat.value)}
                        className={`px-3 py-1 rounded-md text-sm font-medium ${filterCategory === cat.value ? 'text-white' : 'text-muted-foreground'}`}
                        style={{ backgroundColor: filterCategory === cat.value ? cat.color : '#374151' }}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Expenses List */}
            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredExpenses.length === 0 ? (
                <div className="card text-center py-12" style={{ backgroundColor: '#1f2937' }}>
                    <DollarSign size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma despesa encontrada</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredExpenses.map(expense => {
                        const catInfo = getCategoryInfo(expense.category);
                        const IconComp = catInfo.icon;
                        return (
                            <div key={expense.id} className="card flex items-center justify-between" style={{ backgroundColor: '#1f2937' }}>
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${catInfo.color}20` }}>
                                        <IconComp size={20} style={{ color: catInfo.color }} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{expense.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(expense.date).toLocaleDateString('pt-BR')} • {catInfo.label}
                                            {expense.notes && ` • ${expense.notes}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="font-bold text-red-400 text-lg">{formatCurrency(expense.amount)}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditModal(expense)} className="btn btn-secondary p-2"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDelete(expense.id)} className="btn btn-secondary p-2 text-red-400"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
                    <div className="p-6 rounded-lg w-full max-w-md shadow-2xl" style={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block text-white">Descrição</label>
                                <input type="text" className="input w-full" required placeholder="Ex: Gasolina para entregas" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-white">Categoria</label>
                                    <select className="input w-full" style={{ backgroundColor: '#0f1014' }} value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}>
                                        {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-white">Valor (R$)</label>
                                    <input type="number" step="0.01" className="input w-full" required value={newExpense.amount || ''} onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block text-white">Data</label>
                                <input type="date" className="input w-full" style={{ colorScheme: 'dark' }} value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block text-white">Observações</label>
                                <input type="text" className="input w-full" placeholder="Opcional" value={newExpense.notes} onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })} />
                            </div>
                            <button type="submit" className="btn btn-primary w-full py-3 mt-4">{editingExpense ? 'Salvar' : 'Registrar Despesa'}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
