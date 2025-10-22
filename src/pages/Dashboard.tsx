import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, ShoppingCart, Users, TrendingUp, TrendingDown } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProducts: 0,
    pendingQuotes: 0,
    totalSales: 0,
    revenue: 0,
    expenses: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [customers, products, quotes, sales, accountsPayable, accountsReceivable] = await Promise.all([
      supabase.from("customers").select("id", { count: "exact" }).eq("user_id", user.id),
      supabase.from("products").select("id", { count: "exact" }).eq("user_id", user.id),
      supabase.from("quotes").select("id", { count: "exact" }).eq("user_id", user.id).eq("status", "pending"),
      supabase.from("sales").select("total_amount, payment_status").eq("user_id", user.id),
      supabase.from("accounts_payable").select("amount, status").eq("user_id", user.id),
      supabase.from("accounts_receivable").select("amount, status").eq("user_id", user.id),
    ]);

    // Receitas: vendas pagas no ato + contas a receber quitadas
    const receivedAmount = accountsReceivable.data
      ?.filter((r) => r.status === "paid")
      .reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const paidSalesAmount = sales.data
      ?.filter((s: any) => s.payment_status === "paid")
      .reduce((sum: number, s: any) => sum + Number(s.total_amount), 0) || 0;
    const revenue = receivedAmount + paidSalesAmount;

    // Despesas: contas pagas
    const expenses = accountsPayable.data
      ?.filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    setStats({
      totalCustomers: customers.count || 0,
      totalProducts: products.count || 0,
      pendingQuotes: quotes.count || 0,
      totalSales: sales.data?.length || 0,
      revenue,
      expenses,
    });
  };

  const statCards = [
    {
      title: "Total de Clientes",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Produtos Cadastrados",
      value: stats.totalProducts,
      icon: ShoppingCart,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Orçamentos Pendentes",
      value: stats.pendingQuotes,
      icon: FileText,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Total de Vendas",
      value: stats.totalSales,
      icon: ShoppingCart,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <Card key={index} className="shadow-soft hover:shadow-medium transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} ${stat.color} p-2 rounded-lg`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Receitas</CardTitle>
              <div className="bg-success/10 text-success p-2 rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                R$ {stats.revenue.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total de entradas
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Despesas</CardTitle>
              <div className="bg-destructive/10 text-destructive p-2 rounded-lg">
                <TrendingDown className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                R$ {stats.expenses.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total de saídas
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Saldo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${stats.revenue - stats.expenses >= 0 ? 'text-success' : 'text-destructive'}`}>
              R$ {(stats.revenue - stats.expenses).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Receitas - Despesas
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;