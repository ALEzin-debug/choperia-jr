import { supabase } from './supabase';
import type { Product } from '../types';

export const productService = {
    async getActiveProducts(): Promise<Product[]> {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('name');
        if (error) throw error;
        return data || [];
    },

    async getAllProducts(): Promise<Product[]> {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name');
        if (error) throw error;
        return data || [];
    },

    async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
        const { data, error } = await supabase
            .from('products')
            .insert(product)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteProduct(id: string): Promise<void> {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};
