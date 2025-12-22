import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { productService } from '../../services/products';
import type { Product } from '../../types';
import { X, Package, Edit2, Trash2, Plus, TrendingUp, ArrowDownCircle, ArrowUpCircle, History } from 'lucide-react';

interface StockMovement {
    id: string;
    product_id: string;
    type: 'entry' | 'exit';
    quantity: number;
    unit_cost: number;
    notes: string;
    created_at: string;
}

export default function Stock() {
    const [products, setProducts] = useState<Product[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [selectedProductForMovement, setSelectedProductForMovement] = useState<Product | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [newItem, setNewItem] = useState({
        name: '',
        category: 'chopp',
        price: 0,
        cost_price: 0,
        liters: 0,
        stock_quantity: 0,
        is_active: true,
        description: '',
        image_url: ''
    });
    const [newMovement, setNewMovement] = useState({
        type: 'entry' as 'entry' | 'exit',
        quantity: 0,
        unit_cost: 0,
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [productsData, movementsData] = await Promise.all([
                productService.getAllProducts(),
                supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(50)
            ]);
            setProducts(productsData);
            setMovements(movementsData.data || []);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingProduct) {
                await productService.updateProduct(editingProduct.id, newItem);
                alert('Produto atualizado!');
            } else {
                await productService.createProduct(newItem as any);
                alert('Produto criado!');
            }
            setIsModalOpen(false);
            setEditingProduct(null);
            setNewItem({ name: '', category: 'chopp', price: 0, cost_price: 0, liters: 0, stock_quantity: 0, is_active: true, description: '', image_url: '' });
            loadData();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar.');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        try {
            await productService.deleteProduct(id);
            loadData();
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir.');
        }
    }

    async function handleMovementSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedProductForMovement) return;

        try {
            await supabase.from('stock_movements').insert({
                product_id: selectedProductForMovement.id,
                type: newMovement.type,
                quantity: newMovement.quantity,
                unit_cost: newMovement.unit_cost,
                notes: newMovement.notes
            });

            const newQty = newMovement.type === 'entry'
                ? selectedProductForMovement.stock_quantity + newMovement.quantity
                : Math.max(0, selectedProductForMovement.stock_quantity - newMovement.quantity);

            await supabase.from('products').update({
                stock_quantity: newQty,
                cost_price: newMovement.type === 'entry' ? newMovement.unit_cost : selectedProductForMovement.cost_price
            }).eq('id', selectedProductForMovement.id);

            setIsMovementModalOpen(false);
            setSelectedProductForMovement(null);
            setNewMovement({ type: 'entry', quantity: 0, unit_cost: 0, notes: '' });
            loadData();
            alert('Movimentação registrada!');
        } catch (error) {
            console.error(error);
            alert('Erro ao registrar movimentação.');
        }
    }

    function openEditModal(product: Product) {
        setEditingProduct(product);
        setNewItem({
            name: product.name,
            category: product.category || 'chopp',
            price: product.price,
            cost_price: product.cost_price || 0,
            liters: product.liters || 0,
            stock_quantity: product.stock_quantity,
            is_active: product.is_active,
            description: product.description || '',
            image_url: product.image_url || ''
        });
        setIsModalOpen(true);
    }

    function openCreateModal() {
        setEditingProduct(null);
        setNewItem({ name: '', category: 'chopp', price: 0, cost_price: 0, liters: 0, stock_quantity: 0, is_active: true, description: '', image_url: '' });
        setIsModalOpen(true);
    }

    function openMovementModal(product: Product) {
        setSelectedProductForMovement(product);
        setNewMovement({ type: 'entry', quantity: 0, unit_cost: product.cost_price || 0, notes: '' });
        setIsMovementModalOpen(true);
    }

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const calculateMargin = (price: number, cost: number) => {
        if (cost === 0) return 0;
        return ((price - cost) / cost) * 100;
    };

    const totalStockValue = products.reduce((acc, p) => acc + (p.cost_price || 0) * p.stock_quantity, 0);
    const totalSaleValue = products.reduce((acc, p) => acc + p.price * p.stock_quantity, 0);
    const potentialProfit = totalSaleValue - totalStockValue;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Estoque</h1>
                    <p className="text-muted-foreground mt-1">Gerencie seus produtos e custos</p>
                </div>
                <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
                    <Plus size={18} />
                    Novo Produto
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card" style={{ backgroundColor: '#1f2937' }}>
                    <p className="text-sm text-muted-foreground">Total de Produtos</p>
                    <p className="text-2xl font-bold text-white">{products.length}</p>
                </div>
                <div className="card" style={{ backgroundColor: '#1f2937', borderLeft: '4px solid #ef4444' }}>
                    <p className="text-sm text-muted-foreground">Valor em Estoque (Custo)</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(totalStockValue)}</p>
                </div>
                <div className="card" style={{ backgroundColor: '#1f2937', borderLeft: '4px solid #f59e0b' }}>
                    <p className="text-sm text-muted-foreground">Valor Potencial (Venda)</p>
                    <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{formatCurrency(totalSaleValue)}</p>
                </div>
                <div className="card" style={{ backgroundColor: '#1f2937', borderLeft: '4px solid #10b981' }}>
                    <p className="text-sm text-muted-foreground">Lucro Potencial</p>
                    <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{formatCurrency(potentialProfit)}</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Carregando produtos...</div>
            ) : products.length === 0 ? (
                <div className="card text-center py-16 border-dashed" style={{ backgroundColor: '#1f2937' }}>
                    <Package size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum produto cadastrado ainda.</p>
                    <button onClick={openCreateModal} className="btn btn-primary mt-4">Adicionar Primeiro Produto</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {products.map((product) => {
                        const margin = calculateMargin(product.price, product.cost_price || 0);
                        return (
                            <div key={product.id} className={`card group hover:border-primary/50 transition-all duration-200 relative overflow-hidden ${!product.is_active ? 'opacity-60' : ''}`} style={{ backgroundColor: '#1f2937' }}>
                                <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${product.is_active ? 'text-white' : 'text-gray-400'}`} style={{ backgroundColor: product.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.3)' }}>
                                    {product.is_active ? 'Ativo' : 'Inativo'}
                                </div>
                                <div className="h-20 rounded-lg flex items-center justify-center mb-4" style={{ background: 'linear-gradient(to bottom right, rgba(245, 158, 11, 0.1), transparent)' }}>
                                    <Package size={28} style={{ color: 'rgba(245, 158, 11, 0.6)' }} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-lg text-white truncate pr-16">{product.name}</h3>
                                    <p className="text-xs text-muted-foreground capitalize px-2 py-1 rounded inline-block" style={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}>{product.category}</p>
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Custo</p>
                                            <p className="font-bold text-red-400">{formatCurrency(product.cost_price || 0)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Venda</p>
                                            <p className="font-bold" style={{ color: '#f59e0b' }}>{formatCurrency(product.price)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex items-center gap-1">
                                            <TrendingUp size={14} style={{ color: margin > 0 ? '#10b981' : '#ef4444' }} />
                                            <span className={`text-sm font-bold ${margin > 0 ? '' : 'text-red-400'}`} style={{ color: margin > 0 ? '#10b981' : undefined }}>{margin.toFixed(1)}%</span>
                                        </div>
                                        <p className={`text-sm font-medium ${product.stock_quantity < 5 ? 'text-red-400' : 'text-muted-foreground'}`}>{product.stock_quantity} un.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: '#374151' }}>
                                    <button onClick={() => openMovementModal(product)} className="flex-1 btn btn-secondary flex items-center justify-center gap-1 text-sm py-2" title="Entrada/Saída"><History size={14} />Mov.</button>
                                    <button onClick={() => openEditModal(product)} className="btn btn-secondary flex items-center justify-center gap-1 text-sm py-2 px-3"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDelete(product.id)} className="btn btn-secondary text-red-400 px-3" style={{ backgroundColor: '#374151' }}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {movements.length > 0 && (
                <div className="card" style={{ backgroundColor: '#1f2937' }}>
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><History size={20} />Últimas Movimentações</h3>
                    <div className="space-y-2">
                        {movements.slice(0, 10).map(mov => {
                            const product = products.find(p => p.id === mov.product_id);
                            return (
                                <div key={mov.id} className="flex items-center justify-between p-3 rounded-md" style={{ backgroundColor: '#374151' }}>
                                    <div className="flex items-center gap-3">
                                        {mov.type === 'entry' ? <ArrowDownCircle size={20} style={{ color: '#10b981' }} /> : <ArrowUpCircle size={20} style={{ color: '#ef4444' }} />}
                                        <div>
                                            <p className="text-white font-medium">{product?.name || 'Produto'}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(mov.created_at).toLocaleDateString('pt-BR')} - {mov.notes || 'Sem observação'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${mov.type === 'entry' ? '' : 'text-red-400'}`} style={{ color: mov.type === 'entry' ? '#10b981' : undefined }}>{mov.type === 'entry' ? '+' : '-'}{mov.quantity} un.</p>
                                        <p className="text-xs text-muted-foreground">{formatCurrency(mov.unit_cost)}/un</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
                    <div className="p-6 rounded-lg w-full max-w-md shadow-2xl" style={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block text-white">Nome</label>
                                <input type="text" className="input w-full" required value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-white">Preço de Custo</label>
                                    <input type="number" step="0.01" className="input w-full" value={newItem.cost_price} onChange={e => setNewItem({ ...newItem, cost_price: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-white">Preço de Venda</label>
                                    <input type="number" step="0.01" className="input w-full" required value={newItem.price} onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            {newItem.cost_price > 0 && newItem.price > 0 && (
                                <div className="p-3 rounded-md" style={{ backgroundColor: '#374151' }}>
                                    <p className="text-sm text-muted-foreground">Margem de Lucro</p>
                                    <p className="text-xl font-bold" style={{ color: '#10b981' }}>{calculateMargin(newItem.price, newItem.cost_price).toFixed(1)}%</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-white">Litros 🍺</label>
                                    <input type="number" step="0.1" className="input w-full" placeholder="Ex: 30" value={newItem.liters || ''} onChange={e => setNewItem({ ...newItem, liters: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-white">Estoque Inicial</label>
                                    <input type="number" className="input w-full" value={newItem.stock_quantity} onChange={e => setNewItem({ ...newItem, stock_quantity: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block text-white">Categoria</label>
                                <select className="input w-full" style={{ backgroundColor: '#0f1014' }} value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                                    <option value="chopp">Barril de Chopp</option>
                                    <option value="acessorio">Acessório</option>
                                    <option value="consumivel">Consumível</option>
                                    <option value="outro">Outro</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="is_active" checked={newItem.is_active} onChange={e => setNewItem({ ...newItem, is_active: e.target.checked })} className="rounded" />
                                <label htmlFor="is_active" className="text-sm text-white">Produto ativo</label>
                            </div>
                            <button type="submit" className="btn btn-primary w-full py-3 mt-4">{editingProduct ? 'Salvar Alterações' : 'Criar Produto'}</button>
                        </form>
                    </div>
                </div>
            )}

            {isMovementModalOpen && selectedProductForMovement && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
                    <div className="p-6 rounded-lg w-full max-w-md shadow-2xl" style={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Movimentação de Estoque</h2>
                            <button onClick={() => setIsMovementModalOpen(false)} className="text-muted-foreground hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-3 rounded-md mb-4" style={{ backgroundColor: '#374151' }}>
                            <p className="text-sm text-muted-foreground">Produto</p>
                            <p className="font-bold text-white">{selectedProductForMovement.name}</p>
                            <p className="text-sm text-muted-foreground">Estoque atual: {selectedProductForMovement.stock_quantity} un.</p>
                        </div>
                        <form onSubmit={handleMovementSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block text-white">Tipo</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setNewMovement({ ...newMovement, type: 'entry' })} className={`flex-1 py-3 rounded-md font-medium flex items-center justify-center gap-2 ${newMovement.type === 'entry' ? 'text-white' : 'text-muted-foreground'}`} style={{ backgroundColor: newMovement.type === 'entry' ? '#10b981' : '#374151' }}><ArrowDownCircle size={18} />Entrada</button>
                                    <button type="button" onClick={() => setNewMovement({ ...newMovement, type: 'exit' })} className={`flex-1 py-3 rounded-md font-medium flex items-center justify-center gap-2 ${newMovement.type === 'exit' ? 'text-white' : 'text-muted-foreground'}`} style={{ backgroundColor: newMovement.type === 'exit' ? '#ef4444' : '#374151' }}><ArrowUpCircle size={18} />Saída</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-white">Quantidade</label>
                                    <input type="number" className="input w-full" required min="1" value={newMovement.quantity} onChange={e => setNewMovement({ ...newMovement, quantity: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-white">Custo Unitário</label>
                                    <input type="number" step="0.01" className="input w-full" value={newMovement.unit_cost} onChange={e => setNewMovement({ ...newMovement, unit_cost: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block text-white">Observação</label>
                                <input type="text" className="input w-full" placeholder="Ex: Compra fornecedor, Ajuste inventário..." value={newMovement.notes} onChange={e => setNewMovement({ ...newMovement, notes: e.target.value })} />
                            </div>
                            <button type="submit" className="btn btn-primary w-full py-3 mt-4">Registrar Movimentação</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
