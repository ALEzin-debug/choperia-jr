
import { Beer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { productService } from '../../services/products';
import type { Product } from '../../types';

export default function LandingPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        try {
            const data = await productService.getActiveProducts();
            setProducts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col min-h-screen">
            <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Beer className="h-6 w-6 text-primary" />
                        <span className="text-lg font-bold">Choperia JR</span>
                    </div>
                    <nav className="flex gap-6 text-sm font-medium">
                        <a href="#produtos" className="hover:text-primary transition-colors">Produtos</a>
                        <a href="#sobre" className="hover:text-primary transition-colors">Sobre</a>
                        <Link to="/admin" className="text-muted-foreground hover:text-foreground">Login</Link>
                    </nav>
                </div>
            </header>

            <main className="flex-1">
                <section className="py-24 space-y-8 text-center bg-gradient-to-b from-background to-secondary/20">
                    <div className="container px-4 md:px-6">
                        <div className="flex flex-col items-center gap-4">
                            <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl text-primary drop-shadow-sm">
                                O Melhor Chopp da Região
                            </h1>
                            <p className="max-w-[700px] text-muted-foreground md:text-xl">
                                Aluguel de chopeiras, barris e acessórios para o seu evento. Qualidade e entrega rápida.
                            </p>
                            <div className="flex gap-4 mt-4">
                                <a href="#produtos" className="btn btn-primary text-base px-8 py-3">
                                    Ver Produtos
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="produtos" className="py-16 container">
                    <h2 className="text-3xl font-bold mb-8 text-center">Nossos Produtos</h2>

                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Carregando produtos...</div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-12 card bg-secondary/30 border-dashed">
                            <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {products.map((product) => (
                                <div key={product.id} className="card hover:border-primary transition-colors group flex flex-col">
                                    <div className="aspect-square bg-muted rounded-md mb-4 flex items-center justify-center overflow-hidden">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                                        ) : (
                                            <Beer className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                                    <p className="text-muted-foreground mb-4 flex-1 line-clamp-2">{product.description}</p>
                                    <div className="flex items-center justify-between mt-auto">
                                        <span className="text-lg font-bold text-primary">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                        </span>
                                        <button className="btn btn-secondary text-xs">Adicionar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground bg-secondary/50">
                <div className="container">
                    &copy; 2025 Choperia JR. Todos os direitos reservados.
                </div>
            </footer>
        </div>
    );
}

