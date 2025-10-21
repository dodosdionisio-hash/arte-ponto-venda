import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface SaleViewerProps {
  saleId: string;
}

export function SaleViewer({ saleId }: SaleViewerProps) {
  const [sale, setSale] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    loadSaleData();
  }, [saleId]);

  const loadSaleData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: saleData } = await supabase
      .from("sales")
      .select("*, customers(name, email, phone, cpf_cnpj, address)")
      .eq("id", saleId)
      .single();

    const { data: itemsData } = await supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", saleId);

    const { data: settingsData } = await supabase
      .from("store_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setSale(saleData);
    setItems(itemsData || []);
    setSettings(settingsData);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!sale) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end no-print">
        <Button onClick={handlePrint} className="shadow-lg">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <div className="bg-gradient-to-br from-white to-gray-50 text-black p-10 rounded-xl shadow-xl print:p-0 print:shadow-none print:bg-white">
        {settings?.logo_url && (
          <div className="flex justify-center mb-8">
            <img src={settings.logo_url} alt="Logo" className="h-24 object-contain" />
          </div>
        )}

        <div className="text-center mb-8 pb-6 border-b-2 border-primary/20">
          <h1 className="text-3xl font-bold text-primary mb-2">{settings?.company_name || "Minha Empresa"}</h1>
          <div className="space-y-1 text-sm text-gray-600">
            {settings?.cnpj && <p className="font-medium">CNPJ: {settings.cnpj}</p>}
            {settings?.address && <p>{settings.address}</p>}
            {settings?.phone && <p>Telefone: {settings.phone}</p>}
            {settings?.email && <p>E-mail: {settings.email}</p>}
          </div>
        </div>

        <div className="bg-primary/5 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-primary mb-4">COMPROVANTE DE VENDA #{sale.sale_number}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700 mb-2">Dados do Cliente</h3>
              <p className="text-sm"><span className="font-medium">Nome:</span> {sale.customers?.name}</p>
              {sale.customers?.cpf_cnpj && <p className="text-sm"><span className="font-medium">CPF/CNPJ:</span> {sale.customers.cpf_cnpj}</p>}
              {sale.customers?.phone && <p className="text-sm"><span className="font-medium">Telefone:</span> {sale.customers.phone}</p>}
              {sale.customers?.email && <p className="text-sm"><span className="font-medium">E-mail:</span> {sale.customers.email}</p>}
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700 mb-2">Informações da Venda</h3>
              <p className="text-sm"><span className="font-medium">Data:</span> {new Date(sale.sale_date).toLocaleDateString('pt-BR')}</p>
              <p className="text-sm"><span className="font-medium">Forma de Pagamento:</span> {sale.payment_method || "Não informado"}</p>
              <p className="text-sm">
                <span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${sale.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                  {sale.payment_status === "paid" ? "Pago" : "Pendente"}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 overflow-hidden rounded-lg border-2 border-gray-200">
          <table className="w-full">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="text-left py-3 px-4 font-semibold">Descrição</th>
                <th className="text-center py-3 px-4 font-semibold">Qtd</th>
                <th className="text-right py-3 px-4 font-semibold">Valor Unit.</th>
                <th className="text-right py-3 px-4 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="py-3 px-4 border-b">{item.description}</td>
                  <td className="text-center py-3 px-4 border-b">{item.quantity}</td>
                  <td className="text-right py-3 px-4 border-b">R$ {Number(item.unit_price).toFixed(2)}</td>
                  <td className="text-right py-3 px-4 border-b font-semibold">R$ {Number(item.total_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-6">
          <div className="bg-primary text-primary-foreground rounded-lg p-6 shadow-lg">
            <p className="text-sm uppercase tracking-wide mb-1">Valor Total</p>
            <p className="text-3xl font-bold">R$ {Number(sale.total_amount).toFixed(2)}</p>
          </div>
        </div>

        {sale.notes && (
          <div className="border-t-2 border-gray-200 pt-6 mt-6">
            <h3 className="font-semibold text-gray-700 mb-2">Observações:</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{sale.notes}</p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .bg-white, .bg-white * {
            visibility: visible;
          }
          .bg-white {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
