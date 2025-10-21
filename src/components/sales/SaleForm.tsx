import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

const saleSchema = z.object({
  customer_id: z.string().min(1, "Cliente é obrigatório"),
  sale_number: z.string().min(1, "Número da venda é obrigatório"),
  payment_method: z.string().optional(),
  payment_status: z.string().default("pending"),
  payment_type: z.enum(["total", "partial"]).default("total"),
  paid_amount: z.number().optional(),
  notes: z.string().optional(),
});

type SaleFormValues = z.infer<typeof saleSchema>;

interface SaleItem {
  product_id: string;
  variant_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface SaleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function SaleForm({ onSuccess, onCancel }: SaleFormProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customer_id: "",
      sale_number: `VND-${Date.now()}`,
      payment_method: undefined,
      payment_status: "pending",
      payment_type: "total",
      paid_amount: undefined,
      notes: undefined,
    },
  });

  useEffect(() => {
    setFilteredCustomers(customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase())
    ));
  }, [customerSearch, customers]);

  useEffect(() => {
    setFilteredProducts(products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase())
    ));
  }, [productSearch, products]);

  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, []);

  const loadCustomers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id);

    if (data) {
      setCustomers(data);
      setFilteredCustomers(data);
    }
  };

  const loadProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("products")
      .select("*, product_variants(*)")
      .eq("user_id", user.id);

    if (data) {
      setProducts(data);
      setFilteredProducts(data);
    }
  };

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    setSelectedVariant("");
    const product = products.find(p => p.id === productId);
    if (product) {
      setUnitPrice(parseFloat(product.base_price));
    }
  };

  const handleVariantChange = (variantId: string) => {
    setSelectedVariant(variantId);
    const product = products.find(p => p.id === selectedProduct);
    if (product) {
      const variant = product.product_variants.find((v: any) => v.id === variantId);
      if (variant) {
        setUnitPrice(parseFloat(product.base_price) + parseFloat(variant.price_modifier));
      }
    }
  };

  const addItem = () => {
    if (!selectedProduct) {
      toast.error("Selecione um produto");
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    let description = product.name;
    if (selectedVariant) {
      const variant = product.product_variants.find((v: any) => v.id === selectedVariant);
      if (variant) description += ` - ${variant.name}`;
    }

    const newItem: SaleItem = {
      product_id: selectedProduct,
      variant_id: selectedVariant || undefined,
      description,
      quantity,
      unit_price: unitPrice,
      total_price: quantity * unitPrice,
    };

    setItems([...items, newItem]);
    setSelectedProduct("");
    setSelectedVariant("");
    setQuantity(1);
    setUnitPrice(0);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const onSubmit = async (values: SaleFormValues) => {
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item à venda");
      return;
    }

    const total = calculateTotal();
    const paidAmount = values.payment_type === "partial" ? (values.paid_amount || 0) : total;
    
    if (values.payment_type === "partial" && paidAmount >= total) {
      toast.error("Pagamento parcial deve ser menor que o total");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert([{
          user_id: user.id,
          customer_id: values.customer_id,
          sale_number: values.sale_number,
          total_amount: total,
          payment_method: values.payment_method,
          payment_status: paidAmount >= total ? "paid" : "pending",
          notes: values.notes,
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = items.map(item => ({
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

      // Se pagamento parcial, criar conta a receber
      if (values.payment_type === "partial" && paidAmount < total) {
        const remainingAmount = total - paidAmount;
        const { error: receivableError } = await supabase.from("accounts_receivable").insert([{
          user_id: user.id,
          customer_id: values.customer_id,
          sale_id: sale.id,
          amount: remainingAmount,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "pending",
          notes: `Saldo restante da venda ${values.sale_number}`,
        }]);

        if (receivableError) throw receivableError;
      }

      toast.success("Venda registrada com sucesso!");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registrar venda");
    }
  };

  const currentProduct = products.find(p => p.id === selectedProduct);

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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Buscar cliente..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="mb-2"
                      />
                    </div>
                    {filteredCustomers.map((customer) => (
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
            name="sale_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número da Venda</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="payment_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Forma de Pagamento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payment_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Pagamento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="total">Pagamento Total</SelectItem>
                    <SelectItem value="partial">Pagamento Parcial</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("payment_type") === "partial" && (
            <FormField
              control={form.control}
              name="paid_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Pago</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold">Itens da Venda</h3>
          
          <div className="grid grid-cols-5 gap-2">
            <Select value={selectedProduct} onValueChange={handleProductChange}>
              <SelectTrigger>
                <SelectValue placeholder="Produto" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Buscar produto..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="mb-2"
                  />
                </div>
                {filteredProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {currentProduct?.product_variants?.length > 0 && (
              <div className="relative">
                <Select value={selectedVariant} onValueChange={handleVariantChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Variação" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentProduct.product_variants.map((variant: any) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.name} (+R$ {parseFloat(variant.price_modifier).toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVariant && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => {
                      setSelectedVariant("");
                      const product = products.find(p => p.id === selectedProduct);
                      if (product) setUnitPrice(parseFloat(product.base_price));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            <Input
              type="number"
              placeholder="Qtd"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min="1"
            />

            <Input
              type="number"
              step="0.01"
              placeholder="Preço"
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
            />

            <Button type="button" onClick={addItem}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="flex-1">{item.description}</span>
                  <span className="text-sm">Qtd: {item.quantity}</span>
                  <span className="text-sm">R$ {item.unit_price.toFixed(2)}</span>
                  <span className="font-medium">R$ {item.total_price.toFixed(2)}</span>
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
              <div className="flex justify-end pt-2 border-t">
                <span className="text-lg font-bold">
                  Total: R$ {calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          )}
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
            Confirmar Venda
          </Button>
        </div>
      </form>
    </Form>
  );
}
