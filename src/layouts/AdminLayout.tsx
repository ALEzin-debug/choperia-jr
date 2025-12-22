import { Link, Outlet } from 'react-router-dom';
import { Beer, LayoutDashboard, ShoppingCart, Package, DollarSign, Users, Server, Wallet, UserCog } from 'lucide-react';

export default function AdminLayout() {
    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card p-4 flex flex-col gap-4">
                <div className="flex items-center gap-2 px-2 py-4">
                    <Beer className="text-primary h-8 w-8" />
                    <h1 className="text-xl font-bold tracking-tight">Choperia JR</h1>
                </div>

                <nav className="flex flex-col gap-2 flex-1">
                    <NavLink to="/admin" icon={<LayoutDashboard size={20} />} label="Visão Geral" />
                    <NavLink to="/admin/estoque" icon={<Package size={20} />} label="Estoque" />
                    <NavLink to="/admin/locacoes" icon={<Beer size={20} />} label="Locações" />
                    <NavLink to="/admin/clientes" icon={<Users size={20} />} label="Clientes" />
                    <NavLink to="/admin/equipamentos" icon={<Server size={20} />} label="Equipamentos" />
                    <NavLink to="/admin/despesas" icon={<Wallet size={20} />} label="Despesas" />
                    <NavLink to="/admin/funcionarios" icon={<UserCog size={20} />} label="Funcionários" />
                    <NavLink to="/admin/financeiro" icon={<DollarSign size={20} />} label="Financeiro" />

                    <div className="my-4 border-t border-border"></div>
                    <NavLink to="/pos" icon={<ShoppingCart size={20} />} label="Ir para PDV" />
                </nav>

                <div className="px-2 py-4 text-xs text-muted-foreground">
                    v1.0.0
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
    return (
        <Link
            to={to}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors"
        >
            {icon}
            <span>{label}</span>
        </Link>
    );
}
