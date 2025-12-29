import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { adminService } from '../../services/admin';
import { DollarSign, Package, Truck, Beer, Eye, X, Check, Clock, MapPin, Phone, Calendar, Edit2, Save, Trash2 } from 'lucide-react';

interface Stats {
    products: number;
    orders: number;
    activeRentals: number;
    pendingDeliveries: number;
    revenue: number;
}

interface OrderItem {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    is_consigned?: boolean;
    product?: { name: string; liters: number };
}

interface Order {
    id: string;
    created_at: string;
    total_amount: number;
    total_liters: number;
    status: string;
    delivery_address: string;
    is_consignment: boolean;
    notes: string;
    event_date?: string;
    return_date?: string;
    customer?: { full_name: string; phone?: string };
    order_items?: OrderItem[];
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats>({ products: 0, orders: 0, activeRentals: 0, pendingDeliveries: 0, revenue: 0 });
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState({ status: '', notes: '', delivery_address: '' });

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        try {
            const [statsData, ordersData] = await Promise.all([
                adminService.getDashboardStats(),
                supabase.from('orders').select(`
                    id, created_at, total_amount, total_liters, status, delivery_address, is_consignment, notes, event_date, return_date,
                    customer:customers(full_name, phone),
                    order_items(id, product_id, quantity, unit_price, is_consigned, product:products(name, liters))
                `).order('created_at', { ascending: false }).limit(20)
            ]);
            setStats(statsData);
            setRecentOrders((ordersData.data || []) as unknown as Order[]);
        } finally {
            setLoading(false);
        }
    }

    async function openOrderModal(order: Order) {
        setSelectedOrder(order);
        setEditData({ status: order.status, notes: order.notes || '', delivery_address: order.delivery_address || '' });
        setEditing(false);
        setShowModal(true);
    }

    async function saveOrderChanges() {
        if (!selectedOrder) return;
        try {
            await supabase.from('orders').update({
                status: editData.status,
                notes: editData.notes,
                delivery_address: editData.delivery_address
            }).eq('id', selectedOrder.id);

            setSelectedOrder({ ...selectedOrder, ...editData });
            setEditing(false);
            loadDashboard();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar alterações');
        }
    }

    async function confirmConsignmentSold() {
        if (!selectedOrder) return;
        try {
            // Add consigned items value to total (they weren't charged upfront)
            const consignedItemsValue = selectedOrder.order_items
                ?.filter(item => item.is_consigned)
                .reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0;
            const newTotal = selectedOrder.total_amount + consignedItemsValue;

            await supabase.from('orders').update({
                status: 'delivered',
                is_consignment: false,
                total_amount: newTotal,
                notes: `${selectedOrder.notes || ''} | ✅ Consignado VENDIDO em ${new Date().toLocaleDateString('pt-BR')} (+${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(consignedItemsValue)})`
            }).eq('id', selectedOrder.id);

            setShowModal(false);
            loadDashboard();
            alert(`✅ Consignado vendido! +${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(consignedItemsValue)} adicionado ao total.`);
        } catch (error) {
            console.error(error);
            alert('Erro ao confirmar venda');
        }
    }

    async function confirmConsignmentReturned() {
        if (!selectedOrder) return;
        try {
            // Returned = no value change (wasn't charged upfront anyway)
            await supabase.from('orders').update({
                status: 'delivered',
                is_consignment: false,
                notes: `${selectedOrder.notes || ''} | 📦 Consignado DEVOLVIDO lacrado em ${new Date().toLocaleDateString('pt-BR')}`
            }).eq('id', selectedOrder.id);

            setShowModal(false);
            loadDashboard();
            alert('📦 Consignado devolvido! Sem alteração no valor.');
        } catch (error) {
            console.error(error);
            alert('Erro ao confirmar devolução');
        }
    }

    async function cancelOrder() {
        if (!selectedOrder) return;
        if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;
        try {
            await supabase.from('orders').update({ status: 'cancelled' }).eq('id', selectedOrder.id);
            setShowModal(false);
            loadDashboard();
        } catch (error) {
            console.error(error);
            alert('Erro ao cancelar pedido');
        }
    }

    async function deleteOrder(orderId: string, e?: React.MouseEvent) {
        e?.stopPropagation();
        if (!confirm('Tem certeza que deseja APAGAR permanentemente este pedido? Esta ação não pode ser desfeita!')) return;
        try {
            // Primeiro apaga os itens do pedido
            await supabase.from('order_items').delete().eq('order_id', orderId);
            // Depois apaga o pedido
            await supabase.from('orders').delete().eq('id', orderId);
            setShowModal(false);
            loadDashboard();
            alert('✅ Pedido apagado com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao apagar pedido');
        }
    }

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const formatDateOnly = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    // Check if return date is within 24 hours
    const isReturnSoon = (returnDate?: string) => {
        if (!returnDate) return false;
        const now = new Date();
        const returnTime = new Date(returnDate);
        const diff = returnTime.getTime() - now.getTime();
        return diff > 0 && diff < 24 * 60 * 60 * 1000; // Within 24 hours
    };

    const isOverdue = (returnDate?: string) => {
        if (!returnDate) return false;
        return new Date(returnDate) < new Date();
    };

    const statusColors: Record<string, string> = {
        'pending': 'bg-yellow-500/20 text-yellow-400',
        'delivered': 'bg-green-500/20 text-green-400',
        'cancelled': 'bg-red-500/20 text-red-400',
        'consignment': 'bg-orange-500/20 text-orange-400'
    };

    const statusLabels: Record<string, string> = {
        'pending': 'Pendente',
        'delivered': 'Entregue',
        'cancelled': 'Cancelado',
        'consignment': 'Consignado'
    };

    if (loading) {
        return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Visão Geral</h1>
                <p className="text-muted-foreground mt-1">Bem-vindo ao painel administrativo</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card" style={{ backgroundColor: '#1f2937' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Receita Total</p>
                            <p className="text-2xl font-bold text-white">{formatCurrency(stats.revenue)}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}>
                            <DollarSign size={24} style={{ color: '#10b981' }} />
                        </div>
                    </div>
                </div>

                <div className="card" style={{ backgroundColor: '#1f2937' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Produtos</p>
                            <p className="text-2xl font-bold text-white">{stats.products}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}>
                            <Package size={24} style={{ color: '#f59e0b' }} />
                        </div>
                    </div>
                </div>

                <div className="card" style={{ backgroundColor: '#1f2937' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Locações Ativas</p>
                            <p className="text-2xl font-bold text-white">{stats.activeRentals}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}>
                            <Beer size={24} style={{ color: '#3b82f6' }} />
                        </div>
                    </div>
                </div>

                <div className="card" style={{ backgroundColor: '#1f2937' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Entregas Pendentes</p>
                            <p className="text-2xl font-bold text-white">{stats.pendingDeliveries}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}>
                            <Truck size={24} style={{ color: '#8b5cf6' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Consignados Pendentes */}
            {recentOrders.filter(o => o.status === 'consignment').length > 0 && (
                <div className="card" style={{ backgroundColor: '#1f2937', borderLeft: '4px solid #f59e0b' }}>
                    <h2 className="text-lg font-bold text-white mb-4">📦 Consignados Aguardando Confirmação</h2>
                    <div className="space-y-2">
                        {recentOrders.filter(o => o.status === 'consignment').map(order => (
                            <div key={order.id} className="flex items-center justify-between p-3 rounded-md" style={{ backgroundColor: '#374151' }}>
                                <div>
                                    <p className="font-medium text-white">{order.customer?.full_name || 'Cliente'}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(order.created_at)} • {order.total_liters}L</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold" style={{ color: '#f59e0b' }}>{formatCurrency(order.total_amount)}</span>
                                    <button onClick={() => openOrderModal(order)} className="btn btn-primary text-sm py-1 px-3">
                                        <Eye size={14} className="mr-1" /> Ver
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabela de Pedidos Recentes - Estilo igual à página de Locações */}
            <div className="card overflow-hidden">
                <h2 className="text-lg font-bold text-white mb-4 px-4 pt-4">Pedidos Recentes</h2>
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50">
                        <tr className="border-b border-border">
                            <th className="py-3 px-4">Cliente</th>
                            <th className="py-3 px-4">Data Pedido</th>
                            <th className="py-3 px-4">Evento/Retorno</th>
                            <th className="py-3 px-4">Litros</th>
                            <th className="py-3 px-4">Valor</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="p-4 text-center">Carregando...</td></tr>
                        ) : recentOrders.length === 0 ? (
                            <tr><td colSpan={7} className="p-4 text-center">Nenhum pedido recente.</td></tr>
                        ) : (
                            recentOrders.map((order) => {
                                const isLate = isOverdue(order.return_date) && order.status !== 'delivered' && order.status !== 'cancelled';
                                const isSoon = isReturnSoon(order.return_date) && order.status !== 'delivered' && order.status !== 'cancelled';
                                return (
                                    <tr key={order.id} className="border-b border-border/50">
                                        <td className="py-3 px-4 font-medium text-white">
                                            {order.customer?.full_name || 'N/A'}
                                        </td>
                                        <td className="py-3 px-4 text-muted-foreground">
                                            {formatDateOnly(order.created_at)}
                                        </td>
                                        <td className={`py-3 px-4 ${isLate ? 'text-red-400 font-bold' : isSoon ? 'text-yellow-400 font-bold' : ''}`}>
                                            {order.event_date && <span>{formatDateOnly(order.event_date)}</span>}
                                            {order.event_date && order.return_date && ' / '}
                                            {order.return_date && <span>{formatDateOnly(order.return_date)}</span>}
                                            {isLate && ' (ATRASADO)'}
                                            {isSoon && ' (HOJE)'}
                                        </td>
                                        <td className="py-3 px-4 text-muted-foreground">
                                            {order.total_liters}L
                                        </td>
                                        <td className="py-3 px-4 font-bold text-primary">
                                            {formatCurrency(order.total_amount)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColors[order.status] || ''}`}>
                                                {statusLabels[order.status] || order.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openOrderModal(order)}
                                                    className="btn btn-secondary text-sm flex items-center gap-1"
                                                >
                                                    <Eye size={14} />
                                                    Ver
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedOrder(order); setEditData({ status: order.status, notes: order.notes || '', delivery_address: order.delivery_address || '' }); setEditing(true); setShowModal(true); }}
                                                    className="btn btn-secondary text-sm flex items-center gap-1"
                                                >
                                                    <Edit2 size={14} />
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={(e) => deleteOrder(order.id, e)}
                                                    className="btn btn-secondary text-sm flex items-center gap-1 text-red-400"
                                                >
                                                    <Trash2 size={14} />
                                                    Apagar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Order Details Modal */}
            {showModal && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="w-full max-w-2xl rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#1f2937' }}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">Detalhes do Pedido</h2>
                                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center gap-3 mb-6">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedOrder.status]}`}>
                                    {statusLabels[selectedOrder.status] || selectedOrder.status}
                                </span>
                                {selectedOrder.status === 'consignment' && (
                                    <span className="text-xs text-muted-foreground">📦 Aguardando confirmação de venda</span>
                                )}
                            </div>

                            {/* Customer Info */}
                            <div className="p-4 rounded-md mb-4" style={{ backgroundColor: '#374151' }}>
                                <h3 className="font-bold text-white mb-3">Cliente</h3>
                                <div className="space-y-2">
                                    <p className="text-white font-medium">{selectedOrder.customer?.full_name || 'Não identificado'}</p>
                                    {selectedOrder.customer?.phone && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <Phone size={14} /> {selectedOrder.customer.phone}
                                        </p>
                                    )}
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Calendar size={14} /> {formatDate(selectedOrder.created_at)}
                                    </p>
                                </div>
                            </div>

                            {/* Edit Mode or Display Mode */}
                            {editing ? (
                                <div className="p-4 rounded-md mb-4 space-y-4" style={{ backgroundColor: '#374151' }}>
                                    <h3 className="font-bold text-white">Editar Pedido</h3>
                                    <div>
                                        <label className="text-sm text-muted-foreground block mb-1">Status</label>
                                        <select
                                            value={editData.status}
                                            onChange={e => setEditData({ ...editData, status: e.target.value })}
                                            className="input w-full"
                                        >
                                            <option value="pending">Pendente</option>
                                            <option value="delivered">Entregue</option>
                                            <option value="consignment">Consignado</option>
                                            <option value="cancelled">Cancelado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground block mb-1">Endereço de Entrega</label>
                                        <input
                                            type="text"
                                            value={editData.delivery_address}
                                            onChange={e => setEditData({ ...editData, delivery_address: e.target.value })}
                                            className="input w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground block mb-1">Observações</label>
                                        <textarea
                                            value={editData.notes}
                                            onChange={e => setEditData({ ...editData, notes: e.target.value })}
                                            className="input w-full resize-none"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={saveOrderChanges} className="btn btn-primary flex items-center gap-2">
                                            <Save size={16} /> Salvar
                                        </button>
                                        <button onClick={() => setEditing(false)} className="btn btn-secondary">Cancelar</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-md mb-4" style={{ backgroundColor: '#374151' }}>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-white">Informações</h3>
                                        <button onClick={() => setEditing(true)} className="text-sm text-blue-400 flex items-center gap-1">
                                            <Edit2 size={14} /> Editar
                                        </button>
                                    </div>
                                    {selectedOrder.delivery_address && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                                            <MapPin size={14} /> {selectedOrder.delivery_address}
                                        </p>
                                    )}
                                    {selectedOrder.notes && (
                                        <p className="text-sm text-muted-foreground">📝 {selectedOrder.notes}</p>
                                    )}
                                </div>
                            )}

                            {/* Order Items */}
                            {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                                <div className="p-4 rounded-md mb-4" style={{ backgroundColor: '#374151' }}>
                                    <h3 className="font-bold text-white mb-3">Itens do Pedido</h3>
                                    <div className="space-y-2">
                                        {selectedOrder.order_items.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: '#1f2937' }}>
                                                <div>
                                                    <p className="text-white font-medium">{item.product?.name || 'Produto'}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.quantity}x • {formatCurrency(item.unit_price)}
                                                        {item.product?.liters && <span className="ml-2">🍺 {item.product.liters * item.quantity}L</span>}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-white">{formatCurrency(item.unit_price * item.quantity)}</p>
                                                    {item.is_consigned && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
                                                            📦 Consignado
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Totals */}
                            <div className="p-4 rounded-md mb-6" style={{ backgroundColor: '#374151' }}>
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-white">TOTAL</span>
                                    <span className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{formatCurrency(selectedOrder.total_amount)}</span>
                                </div>
                                {selectedOrder.total_liters > 0 && (
                                    <p className="text-sm text-muted-foreground mt-1">Total: {selectedOrder.total_liters}L</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-3">
                                {selectedOrder.status === 'consignment' && (
                                    <>
                                        <button
                                            onClick={confirmConsignmentSold}
                                            className="btn flex items-center gap-2 text-white"
                                            style={{ backgroundColor: '#10b981' }}
                                        >
                                            <Check size={18} /> Vendeu Consignado
                                        </button>
                                        <button
                                            onClick={confirmConsignmentReturned}
                                            className="btn flex items-center gap-2 text-white"
                                            style={{ backgroundColor: '#3b82f6' }}
                                        >
                                            <Package size={18} /> Devolveu Lacrado
                                        </button>
                                    </>
                                )}
                                {selectedOrder.status === 'pending' && (
                                    <button
                                        onClick={async () => {
                                            await supabase.from('orders').update({ status: 'delivered' }).eq('id', selectedOrder.id);
                                            setShowModal(false);
                                            loadDashboard();
                                        }}
                                        className="btn flex items-center gap-2 text-white"
                                        style={{ backgroundColor: '#10b981' }}
                                    >
                                        <Check size={18} /> Marcar como Entregue
                                    </button>
                                )}
                                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                                    <button onClick={cancelOrder} className="btn btn-secondary flex items-center gap-2 text-red-400">
                                        <X size={18} /> Cancelar Pedido
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteOrder(selectedOrder.id)}
                                    className="btn flex items-center gap-2 text-white"
                                    style={{ backgroundColor: '#dc2626' }}
                                >
                                    <Trash2 size={18} /> Apagar Pedido
                                </button>
                                <button onClick={() => setShowModal(false)} className="btn btn-secondary flex items-center gap-2">
                                    <Clock size={18} /> Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
