import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Eye, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SaleForm } from "@/components/sales/SaleForm";
import { SaleViewer } from "@/components/sales/SaleViewer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Sales = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("sales")
      .select("*, customers(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar vendas");
      return;
    }

    setSales(data || []);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta venda?")) return;

    const { error } = await supabase.from("sales").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir venda");
      return;
    }

    toast.success("Venda excluída com sucesso!");
    loadSales();
  };

  const handleQuickSale = async () => {
    setDialogOpen(true);
  };

  const handleCompleteSale = async (saleId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Atualizar status da venda para pago
    const { error: saleError } = await supabase
      .from("sales")
      .update({ payment_status: "paid" })
      .eq("id", saleId);

    if (saleError) {
      toast.error("Erro ao concluir pagamento");
      return;
    }

    // Remover da conta a receber
    const { error: receivableError } = await supabase
      .from("accounts_receivable")
      .delete()
      .eq("sale_id", saleId);

    if (receivableError) {
      toast.error("Erro ao atualizar contas a receber");
      return;
    }

    toast.success("Pagamento concluído com sucesso!");
    loadSales();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "warning",
      paid: "default",
      cancelled: "destructive",
    };

    const labels: Record<string, string> = {
      pending: "Pendente",
      paid: "Pago",
      cancelled: "Cancelado",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
            <p className="text-muted-foreground">Gerencie suas vendas</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleQuickSale}>
                <Plus className="mr-2 h-4 w-4" />
                Venda Rápida
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Venda Rápida</DialogTitle>
              </DialogHeader>
              <SaleForm
                onSuccess={() => {
                  setDialogOpen(false);
                  loadSales();
                }}
                onCancel={() => setDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhuma venda registrada
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.sale_number}</TableCell>
                    <TableCell>{sale.customers?.name || "-"}</TableCell>
                    <TableCell>{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                    <TableCell>R$ {Number(sale.total_amount).toFixed(2)}</TableCell>
                    <TableCell>{sale.payment_method || "-"}</TableCell>
                    <TableCell>{getStatusBadge(sale.payment_status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSaleId(sale.id);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {sale.payment_status === "pending" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleCompleteSale(sale.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sale.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Visualizar Venda</DialogTitle>
            </DialogHeader>
            {selectedSaleId && <SaleViewer saleId={selectedSaleId} />}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Sales;