import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const quoteSchema = z.object({
  customer_id: z.string().min(1, "Cliente é obrigatório"),
  quote_number: z.string().min(1, "Número do orçamento é obrigatório"),
  valid_until: z.string().min(1, "Data de validade é obrigatória"),
  notes: z.string().optional(),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface QuoteFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function QuoteForm({ onSuccess, onCancel }: QuoteFormProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([{ product_id: "", quantity: 1, unit_price: 0 }]);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customer_id: "",
      quote_number: `ORC-${Date.now()}`,
      valid_until: "",
      notes: "",
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [customersData, productsData] = await Promise.all([
      supabase.from("customers").select("*").eq("user_id", user.id),
      supabase.from("products").select("*").eq("user_id", user.id).eq("active", true),
    ]);

    setCustomers(customersData.data || []);
    setProducts(productsData.data || []);
  };

  const addItem = () => {
    setItems([...items, { product_id: "", quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].unit_price = Number(product.base_price);
        newItems[index].description = product.name;
      }
    }

    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  const onSubmit = async (values: QuoteFormValues) => {
    if (items.length === 0 || items.some(i => !i.product_id)) {
      toast.error("Adicione pelo menos um item ao orçamento");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const total = calculateTotal();

      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert([{
          customer_id: values.customer_id,
          quote_number: values.quote_number,
          valid_until: values.valid_until,
          notes: values.notes,
          user_id: user.id,
          total_amount: total,
          issue_date: new Date().toISOString().split("T")[0],
        }])
        .select()
        .single();

      if (quoteError) throw quoteError;

      const quoteItems = items.map((item) => ({
        quote_id: quote.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase.from("quote_items").insert(quoteItems);

      if (itemsError) throw itemsError;

      toast.success("Orçamento criado com sucesso!");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar orçamento");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quote_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="valid_until"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Válido até</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel>Itens</FormLabel>
            <Button type="button" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                <Select
                  value={item.product_id}
                  onValueChange={(value) => updateItem(index, "product_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="number"
                placeholder="Qtd"
                className="w-20"
                value={item.quantity}
                onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value))}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Preço"
                className="w-28"
                value={item.unit_price}
                onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value))}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="text-right text-lg font-bold">
          Total: R$ {calculateTotal().toFixed(2)}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" className="flex-1">
            Criar Orçamento
          </Button>
        </div>
      </form>
    </Form>
  );
}
