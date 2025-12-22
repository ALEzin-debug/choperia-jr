import { supabase } from './supabase';

export const adminService = {
    async getDashboardStats() {
        const { count: products } = await supabase.from('products').select('*', { count: 'exact', head: true });
        const { count: orders } = await supabase.from('orders').select('*', { count: 'exact', head: true });
        const { count: pendingDeliveries } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        const { count: activeRentals } = await supabase
            .from('rentals')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        const { data: revenueData } = await supabase
            .from('orders')
            .select('total_amount')
            .neq('status', 'cancelled');
        const totalRevenue = revenueData?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;

        return {
            products: products || 0,
            orders: orders || 0,
            activeRentals: activeRentals || 0,
            pendingDeliveries: pendingDeliveries || 0,
            revenue: totalRevenue
        };
    },

    async getRentals() {
        const { data } = await supabase
            .from('rentals')
            .select(`*, customer:customers(full_name), asset:assets(code, model)`)
            .order('expected_return_date');
        return data || [];
    },

    async getRecentOrders() {
        const { data } = await supabase
            .from('orders')
            .select(`id, created_at, total_amount, status, delivery_address, customer:customers(full_name)`)
            .order('created_at', { ascending: false })
            .limit(5);
        return data || [];
    },

    async getAssets() {
        const { data } = await supabase.from('assets').select('*').order('code');
        return data || [];
    },

    async getCustomers() {
        const { data } = await supabase.from('customers').select('*').order('full_name');
        return data || [];
    },

    async createRental(rental: { asset_id: string; customer_id: string; expected_return_date: string }) {
        await supabase.from('assets').update({ status: 'rented' }).eq('id', rental.asset_id);
        const { data, error } = await supabase
            .from('rentals')
            .insert({ asset_id: rental.asset_id, customer_id: rental.customer_id, expected_return_date: rental.expected_return_date, status: 'active' })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async returnRental(rentalId: string, assetId: string) {
        await supabase.from('rentals').update({ status: 'returned', returned_at: new Date().toISOString() }).eq('id', rentalId);
        await supabase.from('assets').update({ status: 'available' }).eq('id', assetId);
    },

    async createCustomer(customer: { full_name: string; phone?: string; address?: string }) {
        const { data, error } = await supabase.from('customers').insert(customer).select().single();
        if (error) throw error;
        return data;
    },

    async updateCustomer(id: string, updates: { full_name?: string; phone?: string; address?: string }) {
        const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    async deleteCustomer(id: string) {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
    },

    async createAsset(asset: { code: string; model?: string; status?: string }) {
        const { data, error } = await supabase.from('assets').insert(asset).select().single();
        if (error) throw error;
        return data;
    },

    async updateAsset(id: string, updates: { code?: string; model?: string; status?: string }) {
        const { data, error } = await supabase.from('assets').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    async deleteAsset(id: string) {
        const { error } = await supabase.from('assets').delete().eq('id', id);
        if (error) throw error;
    }
};
