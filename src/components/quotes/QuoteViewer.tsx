import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface QuoteViewerProps {
  quoteId: string;
}

export function QuoteViewer({ quoteId }: QuoteViewerProps) {
  const [quote, setQuote] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    loadQuoteData();
  }, [quoteId]);

  const loadQuoteData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: quoteData } = await supabase
      .from("quotes")
      .select("*, customers(name, email, phone, cpf_cnpj, address)")
      .eq("id", quoteId)
      .single();

    const { data: itemsData } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId);

    const { data: settingsData } = await supabase
      .from("store_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setQuote(quoteData);
    setItems(itemsData || []);
    setSettings(settingsData);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!quote) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end no-print">
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <div className="bg-white text-black p-8 print:p-0">
        {settings?.logo_url && (
          <div className="flex justify-center mb-6">
            <img src={settings.logo_url} alt="Logo" className="h-20 object-contain" />
          </div>
        )}

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">{settings?.company_name || "Minha Empresa"}</h1>
          {settings?.cnpj && <p>CNPJ: {settings.cnpj}</p>}
          {settings?.address && <p>{settings.address}</p>}
          {settings?.phone && <p>Tel: {settings.phone}</p>}
          {settings?.email && <p>Email: {settings.email}</p>}
        </div>

        <div className="border-t border-b py-4 mb-6">
          <h2 className="text-xl font-bold mb-4">ORÇAMENTO #{quote.quote_number}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Cliente:</strong> {quote.customers?.name}</p>
              {quote.customers?.cpf_cnpj && <p><strong>CPF/CNPJ:</strong> {quote.customers.cpf_cnpj}</p>}
              {quote.customers?.phone && <p><strong>Tel:</strong> {quote.customers.phone}</p>}
              {quote.customers?.email && <p><strong>Email:</strong> {quote.customers.email}</p>}
            </div>
            <div>
              <p><strong>Data:</strong> {new Date(quote.issue_date).toLocaleDateString()}</p>
              <p><strong>Validade:</strong> {new Date(quote.valid_until).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <table className="w-full mb-6">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Descrição</th>
              <th className="text-center py-2">Qtd</th>
              <th className="text-right py-2">Valor Unit.</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="py-2">{item.description}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right">R$ {Number(item.unit_price).toFixed(2)}</td>
                <td className="text-right">R$ {Number(item.total_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="text-right">
            <p className="text-2xl font-bold">Total: R$ {Number(quote.total_amount).toFixed(2)}</p>
          </div>
        </div>

        {quote.notes && (
          <div className="border-t pt-4">
            <p><strong>Observações:</strong></p>
            <p>{quote.notes}</p>
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
