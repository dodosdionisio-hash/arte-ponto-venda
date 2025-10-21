import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  base_price: z.string().min(1, "Preço é obrigatório"),
  is_service: z.boolean().default(false),
  active: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface Variant {
  id?: string;
  name: string;
  price_modifier: string;
  sku?: string;
}

interface ProductFormProps {
  product?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [newVariant, setNewVariant] = useState<Variant>({ name: "", price_modifier: "0" });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      base_price: product?.base_price?.toString() || "",
      is_service: product?.is_service || false,
      active: product?.active ?? true,
    },
  });

  useEffect(() => {
    if (product?.id) {
      loadVariants();
    }
  }, [product]);

  const loadVariants = async () => {
    if (!product?.id) return;
    
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", product.id);

    if (!error && data) {
      setVariants(data.map(v => ({
        id: v.id,
        name: v.name,
        price_modifier: v.price_modifier?.toString() || "0",
        sku: v.sku || ""
      })));
    }
  };

  const addVariant = () => {
    if (!newVariant.name) {
      toast.error("Nome da variação é obrigatório");
      return;
    }
    setVariants([...variants, { ...newVariant }]);
    setNewVariant({ name: "", price_modifier: "0" });
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: ProductFormValues) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const productData = {
        name: values.name,
        description: values.description,
        base_price: parseFloat(values.base_price),
        is_service: values.is_service,
        active: values.active,
        user_id: user.id,
      };

      let productId = product?.id;

      if (product?.id) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert([productData])
          .select()
          .single();
        if (error) throw error;
        productId = data.id;
      }

      // Save variants
      if (productId && variants.length > 0) {
        // Delete existing variants
        await supabase.from("product_variants").delete().eq("product_id", productId);
        
        // Insert new variants
        const variantsData = variants.map(v => ({
          product_id: productId,
          name: v.name,
          price_modifier: parseFloat(v.price_modifier),
          sku: v.sku || null,
        }));
        
        const { error: varError } = await supabase
          .from("product_variants")
          .insert(variantsData);
        if (varError) throw varError;
      }

      toast.success(product?.id ? "Produto atualizado com sucesso!" : "Produto cadastrado com sucesso!");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(product?.id ? "Erro ao atualizar produto" : "Erro ao cadastrar produto");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome do produto/serviço" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea placeholder="Descrição opcional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="base_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preço Base (R$)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_service"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">É um Serviço?</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Ativo</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {!form.watch("is_service") && (
          <div className="space-y-4 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <FormLabel className="text-base">Variações do Produto</FormLabel>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Nome da variação"
                value={newVariant.name}
                onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Acréscimo (R$)"
                value={newVariant.price_modifier}
                onChange={(e) => setNewVariant({ ...newVariant, price_modifier: e.target.value })}
              />
              <Button type="button" onClick={addVariant} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {variants.length > 0 && (
              <div className="space-y-2">
                {variants.map((variant, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="flex-1">{variant.name}</span>
                    <span className="text-sm text-muted-foreground">
                      +R$ {parseFloat(variant.price_modifier).toFixed(2)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVariant(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" className="flex-1">
            {product?.id ? "Atualizar" : "Cadastrar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
