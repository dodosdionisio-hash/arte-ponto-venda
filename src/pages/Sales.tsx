import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Sales = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
            <p className="text-muted-foreground">Gerencie suas vendas</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Venda Rápida
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Sales;