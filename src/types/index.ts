export interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    cost_price: number;
    liters: number;
    stock_quantity: number;
    category: string | null;
    image_url: string | null;
    is_active: boolean;
}

export interface Order {
    id: string;
    total_amount: number;
    status: 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';
    delivery_address: string;
    created_at: string;
}
