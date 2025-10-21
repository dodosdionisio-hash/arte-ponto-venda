import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Trash2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QuoteForm } from "@/components/quotes/QuoteForm";
import { QuoteViewer } from "@/components/quotes/QuoteViewer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Quotes = () => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("quotes")
      .select("*, customers(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar orçamentos");
      return;
    }

    setQuotes(data || []);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este orçamento?")) return;

    const { error } = await supabase.from("quotes").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir orçamento");
      return;
    }

    toast.success("Orçamento excluído com sucesso!");
    loadQuotes();
  };

  const handleConvertToSale = async (quote: any) => {
    if (!confirm("Deseja converter este orçamento em venda?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: items } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quote.id);

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          user_id: user.id,
          customer_id: quote.customer_id,
          quote_id: quote.id,
          sale_number: `VND-${Date.now()}`,
          total_amount: quote.total_amount,
          payment_status: "pending",
        })
        .select()
        .single();

      if (saleError) throw saleError;

      if (items && items.length > 0) {
        const saleItems = items.map((item: any) => ({
          sale_id: sale.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }));

        const { error: itemsError } = await supabase.from("sale_items").insert(saleItems);
        if (itemsError) throw itemsError;
      }

      await supabase.from("quotes").update({ status: "converted" }).eq("id", quote.id);

      toast.success("Orçamento convertido em venda com sucesso!");
      loadQuotes();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao converter orçamento");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "warning",
      approved: "default",
      rejected: "destructive",
      converted: "secondary",
    };

    const labels: Record<string, string> = {
      pending: "Pendente",
      approved: "Aprovado",
      rejected: "Rejeitado",
      converted: "Convertido",
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
            <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
            <p className="text-muted-foreground">Gerencie seus orçamentos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Orçamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Orçamento</DialogTitle>
              </DialogHeader>
              <QuoteForm
                onSuccess={() => {
                  setDialogOpen(false);
                  loadQuotes();
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
                <TableHead>Validade</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum orçamento cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.quote_number}</TableCell>
                    <TableCell>{quote.customers?.name || "-"}</TableCell>
                    <TableCell>{new Date(quote.issue_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(quote.valid_until).toLocaleDateString()}</TableCell>
                    <TableCell>R$ {Number(quote.total_amount).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(quote.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedQuoteId(quote.id);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {quote.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConvertToSale(quote)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Converter
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(quote.id)}
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
              <DialogTitle>Visualizar Orçamento</DialogTitle>
            </DialogHeader>
            {selectedQuoteId && <QuoteViewer quoteId={selectedQuoteId} />}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Quotes;