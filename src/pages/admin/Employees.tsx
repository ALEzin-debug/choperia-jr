import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { X, Plus, Edit2, Trash2, Users, Phone, DollarSign } from 'lucide-react';

interface Employee {
    id: string;
    name: string;
    role: string;
    salary: number;
    phone: string;
    is_active: boolean;
    created_at: string;
}

const roles = [
    { value: 'deliverer', label: 'Entregador' },
    { value: 'admin', label: 'Administrativo' },
    { value: 'other', label: 'Outro' }
];

export default function Employees() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [newEmployee, setNewEmployee] = useState({
        name: '',
        role: 'deliverer',
        salary: 0,
        phone: '',
        is_active: true
    });

    useEffect(() => {
        loadEmployees();
    }, []);

    async function loadEmployees() {
        try {
            const { data } = await supabase
                .from('employees')
                .select('*')
                .order('name');
            setEmployees(data || []);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingEmployee) {
                await supabase.from('employees').update(newEmployee).eq('id', editingEmployee.id);
                alert('Funcionário atualizado!');
            } else {
                await supabase.from('employees').insert(newEmployee);
                alert('Funcionário cadastrado!');
            }
            setIsModalOpen(false);
            setEditingEmployee(null);
            setNewEmployee({ name: '', role: 'deliverer', salary: 0, phone: '', is_active: true });
            loadEmployees();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar.');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Excluir este funcionário?')) return;
        try {
            await supabase.from('employees').delete().eq('id', id);
            loadEmployees();
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir.');
        }
    }

    async function toggleActive(employee: Employee) {
        await supabase.from('employees').update({ is_active: !employee.is_active }).eq('id', employee.id);
        loadEmployees();
    }

    function openEditModal(employee: Employee) {
        setEditingEmployee(employee);
        setNewEmployee({
            name: employee.name,
            role: employee.role,
            salary: employee.salary,
            phone: employee.phone || '',
            is_active: employee.is_active
        });
        setIsModalOpen(true);
    }

    function openCreateModal() {
        setEditingEmployee(null);
        setNewEmployee({ name: '', role: 'deliverer', salary: 0, phone: '', is_active: true });
        setIsModalOpen(true);
    }

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const getRoleLabel = (role: string) => roles.find(r => r.value === role)?.label || role;

    const activeEmployees = employees.filter(e => e.is_active);
    const totalMonthlySalary = activeEmployees.reduce((sum, e) => sum + e.salary, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Funcionários</h1>
                    <p className="text-muted-foreground mt-1">Gestão de equipe e folha de pagamento</p>
                </div>
                <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
                    <Plus size={18} />
                    Novo Funcionário
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card" style={{ backgroundColor: '#1f2937' }}>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}>
                            <Users size={24} style={{ color: '#3b82f6' }} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total de Funcionários</p>
                            <p className="text-2xl font-bold text-white">{employees.length}</p>
                        </div>
                    </div>
                </div>
                <div className="card" style={{ backgroundColor: '#1f2937' }}>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}>
                            <Users size={24} style={{ color: '#10b981' }} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Ativos</p>
                            <p className="text-2xl font-bold text-white">{activeEmployees.length}</p>
                        </div>
                    </div>
                </div>
                <div className="card" style={{ backgroundColor: '#1f2937', borderLeft: '4px solid #ef4444' }}>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}>
                            <DollarSign size={24} style={{ color: '#ef4444' }} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Folha Mensal</p>
                            <p className="text-2xl font-bold text-red-400">{formatCurrency(totalMonthlySalary)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Employees List */}
            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : employees.length === 0 ? (
                <div className="card text-center py-12" style={{ backgroundColor: '#1f2937' }}>
                    <Users size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum funcionário cadastrado</p>
                    <button onClick={openCreateModal} className="btn btn-primary mt-4">Cadastrar Primeiro Funcionário</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees.map(employee => (
                        <div key={employee.id} className={`card ${!employee.is_active ? 'opacity-60' : ''}`} style={{ backgroundColor: '#1f2937' }}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: '#3b82f6' }}>
                                    {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${employee.is_active ? 'text-white' : 'text-gray-400'}`} style={{ backgroundColor: employee.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.3)' }}>
                                    {employee.is_active ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                            <h3 className="font-bold text-lg text-white">{employee.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{getRoleLabel(employee.role)}</p>
                            {employee.phone && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                                    <Phone size={12} /> {employee.phone}
                                </p>
                            )}
                            <div className="pt-2 border-t" style={{ borderColor: '#374151' }}>
                                <p className="text-xs text-muted-foreground">Salário Mensal</p>
                                <p className="text-xl font-bold" style={{ color: '#f59e0b' }}>{formatCurrency(employee.salary)}</p>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => toggleActive(employee)} className={`flex-1 btn btn-secondary text-sm ${employee.is_active ? 'text-red-400' : ''}`} style={{ backgroundColor: '#374151', color: employee.is_active ? undefined : '#10b981' }}>
                                    {employee.is_active ? 'Desativar' : 'Ativar'}
                                </button>
                                <button onClick={() => openEditModal(employee)} className="btn btn-secondary p-2"><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(employee.id)} className="btn btn-secondary p-2 text-red-400"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
                    <div className="p-6 rounded-lg w-full max-w-md shadow-2xl" style={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">{editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block text-white">Nome Completo</label>
                                <input type="text" className="input w-full" required value={newEmployee.name} onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-white">Cargo</label>
                                    <select className="input w-full" style={{ backgroundColor: '#0f1014' }} value={newEmployee.role} onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })}>
                                        {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-white">Salário (R$)</label>
                                    <input type="number" step="0.01" className="input w-full" value={newEmployee.salary || ''} onChange={e => setNewEmployee({ ...newEmployee, salary: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block text-white">Telefone</label>
                                <input type="tel" className="input w-full" placeholder="(00) 00000-0000" value={newEmployee.phone} onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })} />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="emp_active" checked={newEmployee.is_active} onChange={e => setNewEmployee({ ...newEmployee, is_active: e.target.checked })} className="rounded" />
                                <label htmlFor="emp_active" className="text-sm text-white">Funcionário ativo</label>
                            </div>
                            <button type="submit" className="btn btn-primary w-full py-3 mt-4">{editingEmployee ? 'Salvar' : 'Cadastrar Funcionário'}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
