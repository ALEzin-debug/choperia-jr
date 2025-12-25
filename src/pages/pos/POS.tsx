import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { productService } from '../../services/products';
import { adminService } from '../../services/admin';
import { ArrowLeft, User, Plus, X, Beer, Calendar, MapPin, CreditCard, FileText, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types';

interface CartItem extends Product {
    cartId: string; // Unique ID for each cart line
    quantity: number;
    isConsigned: boolean;
}

interface Customer {
    id: string;
    full_name: string;
    phone?: string;
    address?: string;
}

interface Asset {
    id: string;
    code: string;
    model: string;
    status: string;
}

export default function POS() {
    // Data
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    // Order State
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [eventDate, setEventDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [notes, setNotes] = useState('');
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
    const [discountValue, setDiscountValue] = useState(0);
    const [deliveryCost, setDeliveryCost] = useState(0); // Custo fixo de entrega (interno)
    const [submitting, setSubmitting] = useState(false);

    // UI State
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [newCustomerMode, setNewCustomerMode] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ full_name: '', phone: '', address: '' });
    const [step, setStep] = useState(1); // 1=Cliente, 2=Equipamento, 3=Produtos, 4=Detalhes
    const [customerOrders, setCustomerOrders] = useState<{ id: string; created_at: string; total_amount: number; total_liters: number; status: string; delivery_address?: string }[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const [productsData, customersData, assetsData] = await Promise.all([
            productService.getActiveProducts(),
            adminService.getCustomers(),
            adminService.getAssets()
        ]);
        setProducts(productsData || []);
        setCustomers(customersData || []);
        setAssets(assetsData || []);
        setLoading(false);
    }

    // Load customer's recent orders when customer is selected
    useEffect(() => {
        async function loadCustomerOrders() {
            if (selectedCustomer) {
                const { data } = await supabase
                    .from('orders')
                    .select('id, created_at, total_amount, total_liters, status, delivery_address')
                    .eq('customer_id', selectedCustomer.id)
                    .order('created_at', { ascending: false })
                    .limit(10);
                setCustomerOrders(data || []);
            } else {
                setCustomerOrders([]);
            }
        }
        loadCustomerOrders();
    }, [selectedCustomer]);

    const availableAssets = assets.filter(a => a.status === 'available');
    const searchLower = customerSearch.toLowerCase();
    const filteredCustomers = customers.filter(c =>
        c.full_name.toLowerCase().includes(searchLower) ||
        (c.phone && c.phone.includes(customerSearch)) ||
        (c.address && c.address.toLowerCase().includes(searchLower))
    );

    // Each click adds a new line (not grouped by product)
    function addToCart(product: Product) {
        const cartId = `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setCart(current => [...current, { ...product, cartId, quantity: 1, isConsigned: false }]);
    }

    function toggleConsignment(cartId: string) {
        setCart(current => current.map(item =>
            item.cartId === cartId ? { ...item, isConsigned: !item.isConsigned } : item
        ));
    }

    function removeFromCart(cartId: string) {
        setCart(current => current.filter(item => item.cartId !== cartId));
    }

    // Consigned items are NOT charged upfront - they're pending
    const regularSubtotal = cart.filter(item => !item.isConsigned).reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const consignedValue = cart.filter(item => item.isConsigned).reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const subtotal = regularSubtotal; // Only non-consigned items count
    const totalLiters = cart.reduce((acc, item) => acc + ((item.liters || 0) * item.quantity), 0);
    const consignedLiters = cart.filter(item => item.isConsigned).reduce((acc, item) => acc + ((item.liters || 0) * item.quantity), 0);
    // deliveryCost is a fixed value (internal cost), not per-liter
    const discountAmount = discountType === 'percent'
        ? (subtotal * discountValue / 100)
        : discountValue;
    const total = Math.max(0, subtotal - discountAmount); // Só itens vendidos (não consignados)

    async function handleCreateNewCustomer() {
        if (!newCustomer.full_name) return;
        try {
            const created = await adminService.createCustomer(newCustomer);
            setSelectedCustomer(created);
            setDeliveryAddress(created.address || '');
            setNewCustomerMode(false);
            setNewCustomer({ full_name: '', phone: '', address: '' });
            loadData();
            setStep(2);
        } catch (error) {
            console.error(error);
            alert('Erro ao criar cliente.');
        }
    }

    function selectCustomer(customer: Customer) {
        setSelectedCustomer(customer);
        setDeliveryAddress(customer.address || '');
        setShowCustomerDropdown(false);
        setCustomerSearch('');
        setStep(2);
    }

    function canProceed() {
        if (!selectedCustomer) return false;
        if (cart.length === 0 && !selectedAsset) return false;
        if (!eventDate) return false;
        if (selectedAsset && !returnDate) return false;
        if (!paymentMethod) return false;
        return true;
    }

    async function handleCheckout() {
        if (!canProceed()) return;
        setSubmitting(true);

        try {
            // Check if any items are consigned
            const hasConsignedItems = cart.some(item => item.isConsigned);
            const consignedLiters = cart.filter(item => item.isConsigned).reduce((sum, item) => sum + (item.liters * item.quantity), 0);

            // Build notes with consignment info
            let orderNotes = notes || '';
            if (hasConsignedItems) {
                orderNotes = `📦 Consignado: ${consignedLiters}L | ${orderNotes}`;
            }

            // 1. Create Order with all fields
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    customer_id: selectedCustomer!.id,
                    total_amount: total,
                    status: hasConsignedItems ? 'consignment' : 'pending',
                    delivery_address: deliveryAddress,
                    is_consignment: hasConsignedItems,
                    total_liters: totalLiters,
                    delivery_cost: deliveryCost,
                    event_date: eventDate || null,
                    return_date: returnDate || null,
                    notes: orderNotes.trim()
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Create Order Items with is_consigned flag per item
            if (cart.length > 0) {
                const orderItems = cart.map(item => ({
                    order_id: order.id,
                    product_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.price,
                    is_consigned: item.isConsigned
                }));

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(orderItems);

                if (itemsError) throw itemsError;

                // Update stock quantities
                for (const item of cart) {
                    const newQty = Math.max(0, item.stock_quantity - item.quantity);
                    await supabase
                        .from('products')
                        .update({ stock_quantity: newQty })
                        .eq('id', item.id);
                }
            }

            // 3. Create Rental if asset selected
            if (selectedAsset) {
                await adminService.createRental({
                    asset_id: selectedAsset.id,
                    customer_id: selectedCustomer!.id,
                    expected_return_date: returnDate
                });
            }

            // Reset
            setSelectedCustomer(null);
            setSelectedAsset(null);
            setCart([]);
            setEventDate('');
            setReturnDate('');
            setDeliveryAddress('');
            setPaymentMethod('');
            setNotes('');
            setDiscountType('percent');
            setDiscountValue(0);
            setDeliveryCost(0);
            setStep(1);
            loadData();
            alert(hasConsignedItems ? '📦 Consignado registrado!' : '✅ Locação registrada com sucesso!');

        } catch (error: unknown) {
            console.error('Checkout error:', error);
            const errorMessage = error instanceof Error ? error.message :
                (error as { message?: string })?.message || JSON.stringify(error);
            alert(`Erro ao finalizar: ${errorMessage}`);
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <div className="h-screen flex items-center justify-center bg-background text-white">Carregando...</div>;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card">
                <div className="flex items-center gap-4">
                    <Link to="/admin" className="btn btn-secondary p-2">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white">Nova Locação</h1>
                        <p className="text-xs text-muted-foreground">Choperia JR</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {selectedCustomer && (
                        <div className="text-right">
                            <p className="text-sm font-medium text-white">{selectedCustomer.full_name}</p>
                            <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                        </div>
                    )}
                </div>
            </header>

            <main className="p-6 max-w-5xl mx-auto">
                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {[
                        { num: 1, label: 'Cliente', icon: User },
                        { num: 2, label: 'Equipamento', icon: Beer },
                        { num: 3, label: 'Produtos', icon: Plus },
                        { num: 4, label: 'Detalhes', icon: FileText }
                    ].map((s, i) => (
                        <div key={s.num} className="flex items-center">
                            <button
                                onClick={() => s.num <= step && setStep(s.num)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${step === s.num
                                    ? 'bg-primary text-primary-foreground'
                                    : step > s.num
                                        ? 'bg-accent/20 text-accent'
                                        : 'bg-secondary text-muted-foreground'
                                    }`}
                            >
                                <s.icon size={16} />
                                {s.label}
                            </button>
                            {i < 3 && <div className="w-8 h-0.5 bg-border mx-2" />}
                        </div>
                    ))}
                </div>

                {/* Step 1: Customer */}
                {step === 1 && (
                    <div className="card p-6 max-w-md mx-auto">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <User size={24} className="text-primary" />
                            Selecione o Cliente
                        </h2>

                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar por nome, telefone ou endereço..."
                                    className="input w-full"
                                    value={customerSearch}
                                    onChange={e => setCustomerSearch(e.target.value)}
                                    onFocus={() => setShowCustomerDropdown(true)}
                                />

                                {showCustomerDropdown && customerSearch && (
                                    <div
                                        className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto"
                                        style={{ backgroundColor: '#1f2937', border: '2px solid #f59e0b' }}
                                    >
                                        {filteredCustomers.length === 0 ? (
                                            <p className="p-4 text-sm text-muted-foreground text-center">Nenhum cliente encontrado</p>
                                        ) : (
                                            filteredCustomers.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => selectCustomer(c)}
                                                    className="w-full text-left p-4 border-b border-gray-700 last:border-b-0 transition-colors"
                                                    style={{ backgroundColor: '#1f2937' }}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#374151'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1f2937'}
                                                >
                                                    <p className="font-bold text-base" style={{ color: '#ffffff' }}>{c.full_name}</p>
                                                    <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
                                                        📞 {c.phone || 'Sem telefone'} &nbsp;|&nbsp; 📍 {c.address || 'Sem endereço'}
                                                    </p>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="text-center text-muted-foreground text-sm">ou</div>

                            {!newCustomerMode ? (
                                <button
                                    onClick={() => setNewCustomerMode(true)}
                                    className="btn btn-secondary w-full flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} />
                                    Cadastrar Novo Cliente
                                </button>
                            ) : (
                                <div className="bg-background p-4 rounded-md border border-border space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-white">Novo Cliente</span>
                                        <button onClick={() => setNewCustomerMode(false)} className="text-muted-foreground">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Nome completo *"
                                        className="input"
                                        value={newCustomer.full_name}
                                        onChange={e => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                                    />
                                    <input
                                        type="tel"
                                        placeholder="Telefone"
                                        className="input"
                                        value={newCustomer.phone}
                                        onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Endereço"
                                        className="input"
                                        value={newCustomer.address}
                                        onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                    />
                                    <button onClick={handleCreateNewCustomer} className="btn btn-primary w-full">
                                        Cadastrar e Continuar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Equipment */}
                {step === 2 && (
                    <div className="card p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Beer size={24} className="text-primary" />
                            Selecione a Chopeira (Opcional)
                        </h2>

                        {availableAssets.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Beer size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Nenhuma chopeira disponível no momento</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                                {availableAssets.map(asset => (
                                    <button
                                        key={asset.id}
                                        onClick={() => setSelectedAsset(selectedAsset?.id === asset.id ? null : asset)}
                                        className={`card p-4 text-left transition-all ${selectedAsset?.id === asset.id
                                            ? 'border-primary bg-primary/10'
                                            : 'hover:border-primary/50'
                                            }`}
                                    >
                                        <div className="h-12 bg-gradient-to-br from-primary/20 to-transparent rounded-lg flex items-center justify-center mb-3">
                                            <Beer size={24} className="text-primary" />
                                        </div>
                                        <p className="font-bold text-white">{asset.code}</p>
                                        <p className="text-xs text-muted-foreground">{asset.model}</p>
                                        {selectedAsset?.id === asset.id && (
                                            <span className="inline-block mt-2 text-xs text-accent font-bold">✓ Selecionada</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => setStep(1)} className="btn btn-secondary flex-1">
                                Voltar
                            </button>
                            <button onClick={() => setStep(3)} className="btn btn-primary flex-1">
                                {selectedAsset ? 'Continuar' : 'Pular (Só Produtos)'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Products */}
                {step === 3 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 card p-6">
                            <h2 className="text-xl font-bold text-white mb-4">Adicionar Produtos</h2>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {products.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="card p-4 text-left hover:border-primary transition-all active:scale-95 relative"
                                    >
                                        {product.liters > 0 && (
                                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
                                                🍺 {product.liters}L
                                            </span>
                                        )}
                                        <p className="font-bold text-white text-sm">{product.name}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                                        <p className="text-primary font-bold mt-2">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="card p-6">
                            <h3 className="font-bold text-white mb-4">Resumo</h3>

                            {selectedAsset && (
                                <div className="bg-primary/10 border border-primary/30 p-3 rounded-md mb-4">
                                    <p className="text-xs text-muted-foreground">Chopeira</p>
                                    <p className="font-bold text-white">{selectedAsset.code} - {selectedAsset.model}</p>
                                </div>
                            )}

                            {cart.length === 0 ? (
                                <p className="text-muted-foreground text-sm">Nenhum produto adicionado</p>
                            ) : (
                                <div className="space-y-3 mb-4">
                                    {cart.map(item => (
                                        <div key={item.cartId} className={`flex flex-col bg-background p-2 rounded-md ${item.isConsigned ? 'border-2' : ''}`} style={item.isConsigned ? { borderColor: '#f59e0b' } : {}}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-white">
                                                        {item.name}
                                                        {item.isConsigned && <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>📦 CONSIGNADO</span>}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                                                        {item.liters > 0 && <span className="ml-2" style={{ color: '#f59e0b' }}>🍺 {item.liters}L</span>}
                                                    </p>
                                                </div>
                                                <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 p-1 hover:bg-red-900/20 rounded">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            {item.liters > 0 && (
                                                <button
                                                    onClick={() => toggleConsignment(item.cartId)}
                                                    className={`mt-2 text-xs py-1 px-2 rounded font-medium transition-all ${item.isConsigned ? 'text-white' : 'text-muted-foreground'}`}
                                                    style={{ backgroundColor: item.isConsigned ? '#f59e0b' : '#374151' }}
                                                >
                                                    {item.isConsigned ? '✓ Consignado' : '📦 Marcar como Consignado'}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="border-t border-border pt-4 mb-4">
                                <div className="flex justify-between text-lg font-bold">
                                    <span className="text-white">Total a Cobrar</span>
                                    <span className="text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
                                </div>
                                {consignedValue > 0 && (
                                    <div className="flex justify-between text-sm mt-2 p-2 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                        <span style={{ color: '#f59e0b' }}>📦 Consignado (pendente): {consignedLiters}L</span>
                                        <span style={{ color: '#f59e0b' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(consignedValue)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setStep(2)} className="btn btn-secondary flex-1">Voltar</button>
                                <button
                                    onClick={() => setStep(4)}
                                    className="btn btn-primary flex-1"
                                    disabled={cart.length === 0 && !selectedAsset}
                                >
                                    Continuar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Details */}
                {step === 4 && (
                    <div className="card p-6 max-w-2xl mx-auto">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <FileText size={24} className="text-primary" />
                            Detalhes da Locação
                        </h2>

                        <div className="space-y-4">
                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                                        <Calendar size={14} />
                                        Data do Evento *
                                    </label>
                                    <input
                                        type="date"
                                        className="input"
                                        style={{
                                            backgroundColor: '#0f1014',
                                            color: '#ffffff',
                                            colorScheme: 'dark'
                                        }}
                                        value={eventDate}
                                        onChange={e => setEventDate(e.target.value)}
                                    />
                                </div>
                                {selectedAsset && (
                                    <div>
                                        <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                                            <Calendar size={14} />
                                            Devolução Prevista *
                                        </label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={returnDate}
                                            onChange={e => setReturnDate(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Address */}
                            <div>
                                <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                                    <MapPin size={14} />
                                    Endereço de Entrega
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Usar endereço cadastrado ou digitar outro"
                                    value={deliveryAddress}
                                    onChange={e => setDeliveryAddress(e.target.value)}
                                />
                            </div>

                            {/* Payment */}
                            <div>
                                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                                    <CreditCard size={14} />
                                    Forma de Pagamento *
                                </label>
                                <div className="flex gap-2">
                                    {['Dinheiro', 'Cartão', 'PIX', 'A Combinar'].map(method => (
                                        <button
                                            key={method}
                                            onClick={() => setPaymentMethod(method)}
                                            className={`flex-1 py-2 rounded-md text-sm font-medium ${paymentMethod === method
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-secondary text-muted-foreground hover:bg-muted'
                                                }`}
                                        >
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Customer Order History */}
                            {customerOrders.length > 0 && (
                                <div className="p-4 rounded-md" style={{ backgroundColor: '#374151' }}>
                                    <p className="font-medium text-white mb-2">📋 Últimos Pedidos do Cliente</p>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {customerOrders.map(order => (
                                            <div key={order.id} className="text-sm p-2 rounded" style={{ backgroundColor: '#1f2937' }}>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                                                        {order.total_liters > 0 && <span className="ml-1">• {order.total_liters}L</span>}
                                                    </span>
                                                    <span className="font-medium" style={{ color: '#f59e0b' }}>
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                                                    </span>
                                                </div>
                                                {order.delivery_address && (
                                                    <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>📍 {order.delivery_address}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Discount */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">Desconto</label>
                                <div className="flex gap-2">
                                    <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid #374151' }}>
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType('percent')}
                                            className={`px-3 py-2 text-sm font-medium ${discountType === 'percent' ? 'text-white' : 'text-muted-foreground'}`}
                                            style={{ backgroundColor: discountType === 'percent' ? '#f59e0b' : '#374151' }}
                                        >
                                            %
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType('fixed')}
                                            className={`px-3 py-2 text-sm font-medium ${discountType === 'fixed' ? 'text-white' : 'text-muted-foreground'}`}
                                            style={{ backgroundColor: discountType === 'fixed' ? '#f59e0b' : '#374151' }}
                                        >
                                            R$
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="input flex-1"
                                        placeholder={discountType === 'percent' ? 'Ex: 10' : 'Ex: 50.00'}
                                        value={discountValue || ''}
                                        onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                {discountAmount > 0 && (
                                    <p className="text-sm mt-1" style={{ color: '#10b981' }}>
                                        Desconto: -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountAmount)}
                                    </p>
                                )}
                            </div>

                            {/* Delivery Cost (Internal) */}
                            {totalLiters > 0 && (
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Custo de Entrega 🚚 <span className="text-muted-foreground font-normal">(interno - não afeta cliente)</span>
                                    </label>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-muted-foreground">R$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="input flex-1"
                                            placeholder="Ex: 20.00"
                                            value={deliveryCost || ''}
                                            onChange={e => setDeliveryCost(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    {deliveryCost > 0 && (
                                        <p className="text-sm mt-1" style={{ color: '#3b82f6' }}>
                                            💸 Custo de entrega: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deliveryCost)} (interno)
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Consignment Summary */}
                            {cart.some(item => item.isConsigned) && (
                                <div className="p-4 rounded-md" style={{ backgroundColor: '#374151', border: '2px solid #f59e0b' }}>
                                    <p className="font-medium text-white mb-2">📦 Itens Consignados:</p>
                                    <div className="space-y-1">
                                        {cart.filter(item => item.isConsigned).map(item => (
                                            <p key={item.id} className="text-sm" style={{ color: '#f59e0b' }}>
                                                • {item.name} ({item.quantity}x) - {item.liters * item.quantity}L
                                            </p>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">Cliente só paga se abrir. Fica pendente até confirmação.</p>
                                </div>
                            )}

                            {/* Notes */}
                            <div>
                                <label className="text-sm font-medium mb-1 block">Observações</label>
                                <textarea
                                    className="input resize-none"
                                    rows={2}
                                    placeholder="Ex: Entregar às 14h, cobrar frete separado..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>

                            {/* Summary */}
                            <div className="p-4 rounded-md" style={{ backgroundColor: '#374151' }}>
                                <h4 className="font-bold text-white mb-3">Resumo Final</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Cliente</span>
                                        <span className="text-white">{selectedCustomer?.full_name}</span>
                                    </div>
                                    {selectedAsset && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Chopeira</span>
                                            <span className="text-white">{selectedAsset.code}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Produtos</span>
                                        <span className="text-white">{cart.length} itens</span>
                                    </div>
                                    {totalLiters > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total Litros</span>
                                            <span className="text-white font-medium">🍺 {totalLiters}L</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span className="text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
                                    </div>
                                    {deliveryCost > 0 && (
                                        <div className="flex justify-between p-2 rounded" style={{ backgroundColor: '#374151' }}>
                                            <span className="text-muted-foreground">💸 Custo Entrega (interno)</span>
                                            <span style={{ color: '#3b82f6' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deliveryCost)}</span>
                                        </div>
                                    )}
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Desconto</span>
                                            <span style={{ color: '#10b981' }}>-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountAmount)}</span>
                                        </div>
                                    )}
                                    {cart.some(item => item.isConsigned) && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Consignados</span>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
                                                📦 {cart.filter(i => i.isConsigned).reduce((sum, i) => sum + (i.liters * i.quantity), 0)}L
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t pt-2 mt-2" style={{ borderColor: '#4b5563' }}>
                                        <span className="font-bold text-white text-lg">TOTAL</span>
                                        <span className="font-bold text-lg" style={{ color: '#f59e0b' }}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setStep(3)} className="btn btn-secondary flex-1">
                                    Voltar
                                </button>
                                <button
                                    onClick={handleCheckout}
                                    disabled={!canProceed() || submitting}
                                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} />
                                    {submitting ? 'Processando...' : 'Finalizar Locação'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
