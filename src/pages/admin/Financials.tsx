import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, Users, Fuel, Package, Truck, Wallet, Beer } from 'lucide-react';

interface Order {
    id: string;
    created_at: string;
    total_amount: number;
    total_liters: number;
    status: string;
    customer?: { full_name: string };
}

interface Expense {
    id: string;
    description: string;
    category: string;
    amount: number;
    date: string;
}

interface Employee {
    id: string;
    name: string;
    role: string;
    salary: number;
    is_active: boolean;
}

const expenseCategories = [
    { value: 'delivery', label: 'Entrega', icon: Truck, color: '#3b82f6' },
    { value: 'fuel', label: 'Combustível', icon: Fuel, color: '#f59e0b' },
    { value: 'supplies', label: 'Insumos', icon: Package, color: '#8b5cf6' },
    { value: 'salary', label: 'Salário', icon: Users, color: '#10b981' },
    { value: 'other', label: 'Outros', icon: DollarSign, color: '#6b7280' }
];

export default function Financials() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>('month');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [ordersRes, expensesRes, employeesRes] = await Promise.all([
                supabase.from('orders').select(`id, created_at, total_amount, total_liters, status, customer:customers(full_name)`).order('created_at', { ascending: false }),
                supabase.from('expenses').select('*').order('date', { ascending: false }),
                supabase.from('employees').select('*').eq('is_active', true)
            ]);
            setOrders((ordersRes.data || []) as unknown as Order[]);
            setExpenses(expensesRes.data || []);
            setEmployees(employeesRes.data || []);
        } finally {
            setLoading(false);
        }
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filterByPeriod = (date: string) => {
        if (period === 'all') return true;
        const d = new Date(date);
        if (period === 'day') return d >= today;
        if (period === 'week') return d >= weekAgo;
        if (period === 'month') return d >= monthAgo;
        return true;
    };

    // Revenue calculations
    const filteredOrders = orders.filter(o => filterByPeriod(o.created_at) && o.status !== 'cancelled');
    const totalRevenue = filteredOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
    const totalLitersSold = filteredOrders.reduce((acc, o) => acc + (o.total_liters || 0), 0);
    const averageTicket = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

    // Expense calculations
    const filteredExpenses = expenses.filter(e => filterByPeriod(e.date));
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const expensesByCategory = expenseCategories.reduce((acc, cat) => {
        acc[cat.value] = filteredExpenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0);
        return acc;
    }, {} as Record<string, number>);

    // Salary calculations
    const totalMonthlySalary = employees.reduce((sum, e) => sum + e.salary, 0);

    // Net Profit
    const netProfit = totalRevenue - totalExpenses - (period === 'month' || period === 'all' ? totalMonthlySalary : 0);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (loading) {
        return <div className="text-center py-12 text-muted-foreground">Carregando dados financeiros...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Financeiro</h1>
                    <p className="text-muted-foreground mt-1">Visão completa de receitas, despesas e lucro</p>
                </div>
                <div className="flex gap-2">
                    {(['day', 'week', 'month', 'all'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${period === p ? 'text-white' : 'text-muted-foreground hover:text-white'}`}
                            style={{ backgroundColor: period === p ? '#f59e0b' : '#374151' }}
                        >
                            {p === 'day' ? 'Hoje' : p === 'week' ? '7 dias' : p === 'month' ? '30 dias' : 'Todos'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card" style={{ backgroundColor: '#1f2937' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Receita</p>
                            <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{formatCurrency(totalRevenue)}</p>
                            <p className="text-xs text-muted-foreground mt-1">{filteredOrders.length} pedidos</p>
                        </div>
                        <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}>
                            <TrendingUp size={24} style={{ color: '#10b981' }} />
                        </div>
                    </div>
                </div>

                <div className="card" style={{ backgroundColor: '#1f2937' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Despesas</p>
                            <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
                            <p className="text-xs text-muted-foreground mt-1">{filteredExpenses.length} registros</p>
                        </div>
                        <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}>
                            <TrendingDown size={24} style={{ color: '#ef4444' }} />
                        </div>
                    </div>
                </div>

                <div className="card" style={{ backgroundColor: '#1f2937' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Folha Salarial</p>
                            <p className="text-2xl font-bold text-orange-400">{formatCurrency(totalMonthlySalary)}</p>
                            <p className="text-xs text-muted-foreground mt-1">{employees.length} funcionários</p>
                        </div>
                        <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(251, 146, 60, 0.2)' }}>
                            <Users size={24} style={{ color: '#fb923c' }} />
                        </div>
                    </div>
                </div>

                <div className="card" style={{ backgroundColor: '#1f2937', borderLeft: netProfit >= 0 ? '4px solid #10b981' : '4px solid #ef4444' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(netProfit)}</p>
                            <p className="text-xs text-muted-foreground mt-1">Receita - Despesas - Salários</p>
                        </div>
                        <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: netProfit >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
                            <Wallet size={24} style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card" style={{ backgroundColor: '#1f2937' }}>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}>
                            <ShoppingCart size={20} style={{ color: '#3b82f6' }} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Ticket Médio</p>
                            <p className="text-xl font-bold text-white">{formatCurrency(averageTicket)}</p>
                        </div>
                    </div>
                </div>
                <div className="card" style={{ backgroundColor: '#1f2937' }}>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}>
                            <Beer size={20} style={{ color: '#f59e0b' }} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Litros Vendidos</p>
                            <p className="text-xl font-bold text-white">{totalLitersSold.toFixed(1)}L</p>
                        </div>
                    </div>
                </div>
                <div className="card" style={{ backgroundColor: '#1f2937' }}>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}>
                            <DollarSign size={20} style={{ color: '#8b5cf6' }} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Preço Médio/Litro</p>
                            <p className="text-xl font-bold text-white">{totalLitersSold > 0 ? formatCurrency(totalRevenue / totalLitersSold) : 'R$ 0,00'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expenses by Category */}
            <div className="card" style={{ backgroundColor: '#1f2937' }}>
                <h2 className="text-lg font-bold text-white mb-4">Despesas por Categoria</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {expenseCategories.map(cat => {
                        const IconComp = cat.icon;
                        const amount = expensesByCategory[cat.value] || 0;
                        const percentage = totalExpenses > 0 ? (amount / totalExpenses * 100).toFixed(0) : 0;
                        return (
                            <div key={cat.value} className="p-4 rounded-md" style={{ backgroundColor: '#374151' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <IconComp size={18} style={{ color: cat.color }} />
                                    <span className="text-sm text-muted-foreground">{cat.label}</span>
                                </div>
                                <p className="text-lg font-bold text-white">{formatCurrency(amount)}</p>
                                <div className="mt-2 h-1 bg-gray-600 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: cat.color }} />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{percentage}% do total</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Employees Salary List */}
            <div className="card" style={{ backgroundColor: '#1f2937' }}>
                <h2 className="text-lg font-bold text-white mb-4">Folha de Pagamento</h2>
                {employees.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Nenhum funcionário ativo</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b" style={{ borderColor: '#374151' }}>
                                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Funcionário</th>
                                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Cargo</th>
                                    <th className="text-right py-3 px-2 text-muted-foreground font-medium">Salário</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(emp => (
                                    <tr key={emp.id} className="border-b" style={{ borderColor: '#374151' }}>
                                        <td className="py-3 px-2 text-white font-medium">{emp.name}</td>
                                        <td className="py-3 px-2 text-muted-foreground">{emp.role === 'deliverer' ? 'Entregador' : emp.role === 'admin' ? 'Administrativo' : 'Outro'}</td>
                                        <td className="py-3 px-2 text-right font-bold" style={{ color: '#f59e0b' }}>{formatCurrency(emp.salary)}</td>
                                    </tr>
                                ))}
                                <tr style={{ backgroundColor: '#374151' }}>
                                    <td colSpan={2} className="py-3 px-2 font-bold text-white">TOTAL MENSAL</td>
                                    <td className="py-3 px-2 text-right font-bold text-red-400">{formatCurrency(totalMonthlySalary)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recent Expenses */}
            <div className="card" style={{ backgroundColor: '#1f2937' }}>
                <h2 className="text-lg font-bold text-white mb-4">Últimas Despesas</h2>
                {filteredExpenses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Nenhuma despesa no período</p>
                ) : (
                    <div className="space-y-2">
                        {filteredExpenses.slice(0, 10).map(expense => {
                            const catInfo = expenseCategories.find(c => c.value === expense.category) || expenseCategories[4];
                            const IconComp = catInfo.icon;
                            return (
                                <div key={expense.id} className="flex items-center justify-between p-3 rounded-md" style={{ backgroundColor: '#374151' }}>
                                    <div className="flex items-center gap-3">
                                        <IconComp size={18} style={{ color: catInfo.color }} />
                                        <div>
                                            <p className="text-white font-medium">{expense.description}</p>
                                            <p className="text-xs text-muted-foreground">{formatDate(expense.date)} • {catInfo.label}</p>
                                        </div>
                                    </div>
                                    <p className="font-bold text-red-400">{formatCurrency(expense.amount)}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Recent Orders */}
            <div className="card" style={{ backgroundColor: '#1f2937' }}>
                <h2 className="text-lg font-bold text-white mb-4">Últimos Pedidos</h2>
                {filteredOrders.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Nenhum pedido no período</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b" style={{ borderColor: '#374151' }}>
                                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Data</th>
                                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Cliente</th>
                                    <th className="text-right py-3 px-2 text-muted-foreground font-medium">Litros</th>
                                    <th className="text-right py-3 px-2 text-muted-foreground font-medium">Valor</th>
                                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.slice(0, 10).map(order => (
                                    <tr key={order.id} className="border-b" style={{ borderColor: '#374151' }}>
                                        <td className="py-3 px-2 text-muted-foreground">{formatDate(order.created_at)}</td>
                                        <td className="py-3 px-2 text-white font-medium">{order.customer?.full_name || 'Venda Balcão'}</td>
                                        <td className="py-3 px-2 text-right text-white">{order.total_liters ? `${order.total_liters}L` : '-'}</td>
                                        <td className="py-3 px-2 text-right font-bold" style={{ color: '#10b981' }}>{formatCurrency(order.total_amount)}</td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'consignment' ? 'bg-yellow-500/20 text-yellow-400' :
                                                order.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
                                                    order.status === 'delivered' ? 'bg-green-500/20 text-green-400' : ''
                                                }`}>
                                                {order.status === 'consignment' ? 'Consignado' : order.status === 'pending' ? 'Pendente' : order.status === 'delivered' ? 'Entregue' : order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
