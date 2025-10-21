import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().min(1, "Valor é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  category: z.string().optional(),
  transaction_date: z.string().min(1, "Data é obrigatória"),
});

const receivableSchema = z.object({
  customer_id: z.string().optional(),
  amount: z.string().min(1, "Valor é obrigatório"),
  due_date: z.string().min(1, "Data de vencimento é obrigatória"),
  notes: z.string().optional(),
});

const payableSchema = z.object({
  supplier_name: z.string().min(1, "Fornecedor é obrigatório"),
  amount: z.string().min(1, "Valor é obrigatório"),
  due_date: z.string().min(1, "Data de vencimento é obrigatória"),
  category: z.string().optional(),
  notes: z.string().optional(),
});

const Financial = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [dialogType, setDialogType] = useState<"transaction" | "receivable" | "payable" | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [transData, recData, payData, custData] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: false }),
      supabase.from("accounts_receivable").select("*, customers(name)").eq("user_id", user.id).order("due_date", { ascending: false }),
      supabase.from("accounts_payable").select("*").eq("user_id", user.id).order("due_date", { ascending: false }),
      supabase.from("customers").select("*").eq("user_id", user.id),
    ]);

    setTransactions(transData.data || []);
    setReceivables(recData.data || []);
    setPayables(payData.data || []);
    setCustomers(custData.data || []);
  };

  const TransactionForm = ({ onSuccess }: { onSuccess: () => void }) => {
    const form = useForm({
      resolver: zodResolver(transactionSchema),
      defaultValues: { type: "income", amount: "", description: "", category: "", transaction_date: new Date().toISOString().split("T")[0] },
    });

    const onSubmit = async (values: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("transactions").insert({
        ...values,
        amount: parseFloat(values.amount),
        user_id: user.id,
      });

      if (error) {
        toast.error("Erro ao criar transação");
        return;
      }

      toast.success("Transação criada com sucesso!");
      onSuccess();
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="income">Entrada</SelectItem>
                  <SelectItem value="expense">Saída</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="transaction_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setDialogType(null)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1">Salvar</Button>
          </div>
        </form>
      </Form>
    );
  };

  const ReceivableForm = ({ onSuccess }: { onSuccess: () => void }) => {
    const form = useForm({
      resolver: zodResolver(receivableSchema),
      defaultValues: { customer_id: "", amount: "", due_date: "", notes: "" },
    });

    const onSubmit = async (values: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("accounts_receivable").insert({
        ...values,
        amount: parseFloat(values.amount),
        user_id: user.id,
      });

      if (error) {
        toast.error("Erro ao criar conta a receber");
        return;
      }

      toast.success("Conta a receber criada!");
      onSuccess();
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="customer_id" render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="due_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Vencimento</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl><Textarea {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setDialogType(null)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1">Salvar</Button>
          </div>
        </form>
      </Form>
    );
  };

  const PayableForm = ({ onSuccess }: { onSuccess: () => void }) => {
    const form = useForm({
      resolver: zodResolver(payableSchema),
      defaultValues: { supplier_name: "", amount: "", due_date: "", category: "", notes: "" },
    });

    const onSubmit = async (values: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("accounts_payable").insert({
        ...values,
        amount: parseFloat(values.amount),
        user_id: user.id,
      });

      if (error) {
        toast.error("Erro ao criar conta a pagar");
        return;
      }

      toast.success("Conta a pagar criada!");
      onSuccess();
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="supplier_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Fornecedor</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="due_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Vencimento</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl><Textarea {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setDialogType(null)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1">Salvar</Button>
          </div>
        </form>
      </Form>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Controle de entradas, saídas e contas</p>
        </div>

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="receivable">Contas a Receber</TabsTrigger>
            <TabsTrigger value="payable">Contas a Pagar</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={dialogType === "transaction"} onOpenChange={(open) => setDialogType(open ? "transaction" : null)}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Nova Transação</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Transação</DialogTitle>
                  </DialogHeader>
                  <TransactionForm onSuccess={() => { setDialogType(null); loadData(); }} />
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhuma transação registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{new Date(t.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell>{t.description}</TableCell>
                        <TableCell>{t.category || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={t.type === "income" ? "default" : "destructive"}>
                            {t.type === "income" ? "Entrada" : "Saída"}
                          </Badge>
                        </TableCell>
                        <TableCell className={t.type === "income" ? "text-success" : "text-destructive"}>
                          R$ {Number(t.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={async () => {
                            await supabase.from("transactions").delete().eq("id", t.id);
                            loadData();
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="receivable" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={dialogType === "receivable"} onOpenChange={(open) => setDialogType(open ? "receivable" : null)}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Nova Conta a Receber</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Conta a Receber</DialogTitle>
                  </DialogHeader>
                  <ReceivableForm onSuccess={() => { setDialogType(null); loadData(); }} />
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhuma conta a receber
                      </TableCell>
                    </TableRow>
                  ) : (
                    receivables.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.customers?.name || "-"}</TableCell>
                        <TableCell>{new Date(r.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>R$ {Number(r.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "paid" ? "default" : "secondary"}>
                        {r.status === "paid" ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={async () => {
                            await supabase.from("accounts_receivable").delete().eq("id", r.id);
                            loadData();
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="payable" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={dialogType === "payable"} onOpenChange={(open) => setDialogType(open ? "payable" : null)}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Nova Conta a Pagar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Conta a Pagar</DialogTitle>
                  </DialogHeader>
                  <PayableForm onSuccess={() => { setDialogType(null); loadData(); }} />
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhuma conta a pagar
                      </TableCell>
                    </TableRow>
                  ) : (
                    payables.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.supplier_name}</TableCell>
                        <TableCell>{new Date(p.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>{p.category || "-"}</TableCell>
                        <TableCell>R$ {Number(p.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "paid" ? "default" : "secondary"}>
                            {p.status === "paid" ? "Pago" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={async () => {
                            await supabase.from("accounts_payable").delete().eq("id", p.id);
                            loadData();
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Financial;